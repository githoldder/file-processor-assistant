from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.services.converter import DocumentConverter
from app.models.schemas import ConversionType, ConvertResponse, TaskStatus
from app.services.task_queue import set_task_status
from app.services.log_collector import log_event, EventType
from app.services.minio_client import get_minio_client
from app.config import settings
import uuid
import io
import json
from typing import Any, Dict, Optional
from urllib.parse import quote

router = APIRouter()
converter = DocumentConverter()

CONTENT_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "html": "text/html; charset=utf-8",
    "csv": "text/csv; charset=utf-8",
    "png": "image/png",
    "ico": "image/x-icon",
    "svg": "image/svg+xml",
    "zip": "application/zip",
    "bin": "application/octet-stream",
}


def _parse_conversion_options(raw_options: Optional[str]) -> Dict[str, Any]:
    if not raw_options:
        return {}
    try:
        payload = json.loads(raw_options)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid conversion_options JSON: {exc}")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="conversion_options must be a JSON object")
    return payload


def _api_download_url(object_name: str) -> str:
    return f"/api/v1/files/content/{quote(object_name, safe='')}"


async def async_convert_task(
    task_id: str,
    file_bytes: bytes,
    target_format: ConversionType,
    conversion_options: Optional[Dict[str, Any]] = None,
):
    try:
        conversion_options = conversion_options or {}
        await set_task_status(task_id, TaskStatus.PROCESSING)
        await log_event(
            EventType.CONVERSION_STARTED,
            f"开始转换: {target_format.value}",
            task_id=task_id,
        )
        result_bytes = None
        output_ext = "bin"
        
        if target_format == ConversionType.PDF_TO_WORD:
            result_bytes = converter.pdf_to_word(file_bytes)
            output_ext = "docx"
        elif target_format == ConversionType.WORD_TO_PDF:
            result_bytes = converter.word_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.EXCEL_TO_PDF:
            result_bytes = converter.excel_to_pdf(
                file_bytes,
                layout_options=conversion_options.get("excel_layout", {}),
            )
            output_ext = "pdf"
        elif target_format == ConversionType.EXCEL_TO_CSV:
            result_str = converter.excel_to_csv(file_bytes)
            result_bytes = result_str.encode("utf-8")
            output_ext = "csv"
        elif target_format == ConversionType.PPTX_TO_PDF:
            result_bytes = converter.pptx_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.PDF_TO_HTML:
            result_str = converter.pdf_to_html(file_bytes)
            result_bytes = result_str.encode('utf-8')
            output_ext = "html"
        elif target_format == ConversionType.WORD_TO_MARKDOWN:
            result_str = converter.word_to_markdown(file_bytes)
            result_bytes = result_str.encode("utf-8")
            output_ext = "md"
        elif target_format == ConversionType.MARKDOWN_TO_HTML:
            result_str = converter.markdown_to_html(file_bytes)
            result_bytes = result_str.encode("utf-8")
            output_ext = "html"
        elif target_format == ConversionType.MARKDOWN_TO_PDF:
            result_bytes = converter.markdown_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.MARKDOWN_TO_WORD:
            result_bytes = converter.markdown_to_word(file_bytes)
            output_ext = "docx"
        elif target_format == ConversionType.SVG_TO_PNG:
            result_bytes = converter.svg_to_png(file_bytes)
            output_ext = "png"
        elif target_format == ConversionType.SVG_TO_PDF:
            result_bytes = converter.svg_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.PNG_TO_SVG:
            result_bytes = converter.png_to_svg(file_bytes)
            output_ext = "svg"
        elif target_format == ConversionType.PNG_TO_ICO:
            result_bytes = converter.png_to_ico(file_bytes)
            output_ext = "ico"
        elif target_format in {
            ConversionType.PNG_TO_PDF,
            ConversionType.JPG_TO_PDF,
            ConversionType.JPEG_TO_PDF,
        }:
            result_bytes = converter.png_to_pdf(file_bytes)
            output_ext = "pdf"
        else:
            raise Exception(f"Unsupported MVP conversion format: {target_format}")
            
        client = get_minio_client()
        object_name = f"conversions/{task_id}.{output_ext}"
        client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            io.BytesIO(result_bytes),
            len(result_bytes),
            content_type=CONTENT_TYPES.get(output_ext, CONTENT_TYPES["bin"]),
        )
        
        # Always return the API proxy URL. Exposing MinIO presigned URLs can
        # navigate browsers to :9000 and render Office zip XML internals inline.
        await set_task_status(task_id, TaskStatus.SUCCESS, result_url=_api_download_url(object_name))
        await log_event(
            EventType.CONVERSION_COMPLETED,
            f"转换完成: {target_format.value}",
            task_id=task_id,
        )
    except Exception as e:
        await set_task_status(task_id, TaskStatus.FAILED, error=str(e))
        await log_event(
            EventType.CONVERSION_FAILED,
            f"转换失败: {target_format.value} — {str(e)}",
            task_id=task_id,
        )

@router.post("", response_model=ConvertResponse)
async def convert_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_format: ConversionType = Form(...),
    conversion_options: Optional[str] = Form(None),
):
    file_bytes = await file.read()
    task_id = str(uuid.uuid4())
    parsed_options = _parse_conversion_options(conversion_options)
    
    # MVP: Make everything async for simplicity and uniform frontend handling
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(async_convert_task, task_id, file_bytes, target_format, parsed_options)
    
    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")
@router.post("/existing", response_model=ConvertResponse)
async def convert_existing_file(
    background_tasks: BackgroundTasks,
    object_name: str = Form(...),
    target_format: ConversionType = Form(...),
    conversion_options: Optional[str] = Form(None),
):
    parsed_options = _parse_conversion_options(conversion_options)
    client = get_minio_client()
    try:
        response = client.get_object(settings.MINIO_BUCKET, object_name)
        file_bytes = response.read()
        response.close()
        response.release_conn()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in cloud storage: {str(e)}")
    
    task_id = str(uuid.uuid4())
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(async_convert_task, task_id, file_bytes, target_format, parsed_options)
    
    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")
