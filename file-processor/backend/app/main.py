import os
import uuid
import aiofiles
import io
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from celery_config import celery_app
from app.models.schemas import (
    TaskCreateRequest,
    TaskResponse,
    BatchTaskRequest,
    BatchTaskResponse,
    PDFMergeRequest,
    PDFSplitRequest,
    PDFExtractRequest,
    TaskStatus,
    ConversionType,
)
from app.tasks.convert_tasks import convert_document, batch_convert
from app.tasks.pdf_tasks import (
    merge_pdfs,
    split_pdf,
    extract_pdf_images,
    extract_pdf_text,
    pdf_to_images,
    images_to_pdf,
)


app = FastAPI(
    title="文件处理全能助手 API",
    description="分布式文档处理系统 - 支持PDF、Word、Excel、PPTX、MD、SVG、PNG等格式转换",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/file_processor/uploads")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


@app.get("/")
async def root():
    return {"name": "文件处理全能助手 API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/v1/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")

    content = await file.read()

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "size": len(content),
        "content_type": file.content_type,
        "upload_time": datetime.now().isoformat(),
    }


@app.get("/api/v1/files/{file_id}")
async def get_file_info(file_id: str):
    for ext in ["", ".pdf", ".docx", ".xlsx", ".pptx", ".png", ".svg", ".md"]:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(file_path):
            stat = os.stat(file_path)
            return {
                "file_id": file_id,
                "size": stat.st_size,
                "path": file_path,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            }

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/v1/files/{file_id}/download")
async def download_file(file_id: str):
    for ext in ["", ".pdf", ".docx", ".xlsx", ".pptx", ".png", ".svg", ".md"]:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(file_path):
            return StreamingResponse(
                open(file_path, "rb"),
                media_type="application/octet-stream",
                headers={"Content-Disposition": f"attachment; filename={file_id}{ext}"},
            )

    raise HTTPException(status_code=404, detail="File not found")


@app.delete("/api/v1/files/{file_id}")
async def delete_file(file_id: str):
    deleted = False
    for ext in ["", ".pdf", ".docx", ".xlsx", ".pptx", ".png", ".svg", ".md"]:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(file_path):
            os.remove(file_path)
            deleted = True

    if deleted:
        return {"message": "File deleted successfully"}
    raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/v1/convert")
async def convert_single_file(
    file: UploadFile = File(...),
    conversion_type: str = Query(...),
    background_tasks: BackgroundTasks = None,
):
    content = await file.read()
    file_hex = content.hex()

    output_format = conversion_type.split("_")[-1]

    task = convert_document.apply_async(
        args=[file_hex, conversion_type, output_format], queue="conversions"
    )

    return {
        "task_id": task.id,
        "status": "pending",
        "message": "Task submitted successfully",
    }


@app.post("/api/v1/convert/batch")
async def batch_convert_files(
    files: List[UploadFile] = File(...), conversion_type: str = Query(...)
):
    file_list = []

    for file in files:
        content = await file.read()
        file_list.append(
            {
                "data": content.hex(),
                "filename": file.filename,
                "output_format": conversion_type.split("_")[-1],
            }
        )

    task = batch_convert.apply_async(args=[file_list, conversion_type], queue="batch")

    return {
        "task_id": task.id,
        "total_files": len(files),
        "message": "Batch conversion started",
    }


@app.get("/api/v1/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = celery_app.AsyncResult(task_id)

    response = {"task_id": task_id, "status": task.state, "result": None, "error": None}

    if task.state == "SUCCESS":
        response["result"] = task.result
    elif task.state == "FAILURE":
        response["error"] = str(task.info)
    elif task.state == "PENDING":
        response["status"] = "pending"
    elif hasattr(task, "info") and task.info:
        if isinstance(task.info, dict):
            response["progress"] = task.info.get("progress", 0)

    return response


@app.get("/api/v1/tasks/{task_id}/download")
async def download_task_result(task_id: str):
    from fastapi.responses import Response

    # Use Celery's AsyncResult to get the result
    task = celery_app.AsyncResult(task_id)

    # Wait for the result with timeout
    try:
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as executor:
            result = executor.submit(task.get).result(timeout=10)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Result not found: {str(e)}")

    if not result:
        raise HTTPException(status_code=404, detail="Result is empty")

    # Check if result is a dict with status
    if isinstance(result, dict):
        if result.get("status") != "success":
            raise HTTPException(status_code=400, detail="Conversion failed")

        # Get the converted file data
        hex_data = result.get("data", "")
        if not hex_data:
            raise HTTPException(status_code=404, detail="No converted file data")

        file_data = bytes.fromhex(hex_data)

        # Determine filename and content type from result's content_type
        content_type = result.get("content_type", "application/pdf")

        # Map content type to extension
        content_type_to_ext = {
            "application/pdf": "pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
            "image/png": "png",
            "image/jpeg": "jpg",
            "application/zip": "zip",
        }
        output_format = content_type_to_ext.get(content_type, "pdf")
    else:
        # If result is directly the file data
        file_data = result
        output_format = "pdf"

    content_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "zip": "application/zip",
    }

    content_type = content_types.get(output_format, "application/octet-stream")
    filename = f"converted.{output_format}"

    return Response(
        content=file_data,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/v1/tasks")
async def list_tasks():
    return {"message": "Use /api/v1/tasks/{task_id} to check specific task"}


@app.post("/api/v1/pdf/merge")
async def merge_pdf_files(request: PDFMergeRequest):
    file_datas = []

    for file_id in request.file_ids:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}")
        if not os.path.exists(file_path):
            for ext in [".pdf", ".docx", ".xlsx", ".pptx", ".png", ".svg", ".md"]:
                if os.path.exists(f"{file_path}{ext}"):
                    file_path = f"{file_path}{ext}"
                    break

        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                file_datas.append(f.read().hex())

    task = merge_pdfs.apply_async(
        args=[file_datas, request.output_filename or "merged.pdf"],
        queue="pdf_operations",
    )

    return {"task_id": task.id, "message": "PDF merge task started"}


@app.post("/api/v1/pdf/split")
async def split_pdf_file(request: PDFSplitRequest):
    file_path = os.path.join(UPLOAD_DIR, f"{request.file_id}")

    if not os.path.exists(file_path):
        for ext in [".pdf"]:
            if os.path.exists(f"{file_path}{ext}"):
                file_path = f"{file_path}{ext}"
                break

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    with open(file_path, "rb") as f:
        file_data = f.read().hex()

    task = split_pdf.apply_async(
        args=[file_data, request.page_ranges, "split.pdf"], queue="pdf_operations"
    )

    return {"task_id": task.id, "message": "PDF split task started"}


@app.post("/api/v1/pdf/extract")
async def extract_pdf_content(request: PDFExtractRequest):
    file_path = os.path.join(UPLOAD_DIR, f"{request.file_id}")

    if not os.path.exists(file_path):
        for ext in [".pdf"]:
            if os.path.exists(f"{file_path}{ext}"):
                file_path = f"{file_path}{ext}"
                break

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    with open(file_path, "rb") as f:
        file_data = f.read().hex()

    if request.extract_text:
        task = extract_pdf_text.apply_async(args=[file_data], queue="pdf_operations")
        return {"task_id": task.id, "message": "PDF text extraction started"}

    if request.extract_images:
        task = extract_pdf_images.apply_async(args=[file_data], queue="pdf_operations")
        return {"task_id": task.id, "message": "PDF image extraction started"}

    raise HTTPException(status_code=400, detail="No extraction type specified")


@app.post("/api/v1/pdf/to-images")
async def pdf_to_images_api(file: UploadFile = File(...), dpi: int = Query(300)):
    content = await file.read()
    file_hex = content.hex()

    task = pdf_to_images.apply_async(args=[file_hex, dpi], queue="conversions")

    return {"task_id": task.id, "message": "PDF to images conversion started"}


@app.post("/api/v1/images/to-pdf")
async def images_to_pdf_api(
    files: List[UploadFile] = File(...), output_filename: str = Query("output.pdf")
):
    file_datas = []

    for file in files:
        content = await file.read()
        file_datas.append(content.hex())

    task = images_to_pdf.apply_async(
        args=[file_datas, output_filename], queue="conversions"
    )

    return {"task_id": task.id, "message": "Images to PDF conversion started"}


@app.get("/api/v1/formats")
async def get_supported_formats():
    return {
        "input_formats": [
            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "md",
            "markdown",
            "svg",
            "png",
            "jpg",
            "jpeg",
        ],
        "output_formats": [
            "pdf",
            "docx",
            "xlsx",
            "pptx",
            "html",
            "md",
            "csv",
            "png",
            "svg",
            "ico",
        ],
        "conversions": {
            "pdf_to_word": "PDF 转 Word",
            "pdf_to_images": "PDF 转 图片",
            "pdf_to_pptx": "PDF 转 PPTX",
            "word_to_pdf": "Word 转 PDF",
            "excel_to_pdf": "Excel 转 PDF",
            "pptx_to_pdf": "PPTX 转 PDF",
            "markdown_to_pdf": "Markdown 转 PDF",
            "svg_to_png": "SVG 转 PNG",
            "svg_to_pdf": "SVG 转 PDF",
            "png_to_pdf": "PNG 转 PDF",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
