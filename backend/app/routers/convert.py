from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.services.converter import DocumentConverter
from app.services.conversion_capabilities import get_capabilities, get_group_display_name
from app.models.schemas import ConversionType, ConvertResponse, TaskStatus
from app.services.task_queue import set_task_status
from app.services.log_collector import log_event, EventType
from app.services.minio_client import get_minio_client
from app.config import settings
from minio.commonconfig import CopySource
import uuid
import io
import json
import hashlib
import zipfile
from typing import Any, Dict, Optional
from urllib.parse import quote

router = APIRouter()
converter = DocumentConverter()

# Server-side P0 whitelist — must match frontend P0_WHITELIST.
# Any target_format not in this set is rejected before conversion starts.
P0_WHITELIST: set[str] = {
    "word_to_pdf",
    "excel_to_pdf",
    "pptx_to_pdf",
    "markdown_to_pdf",
    "markdown_to_html",
    "svg_to_png",
    "svg_to_pdf",
    "png_to_pdf",
    "jpg_to_pdf",
    "jpeg_to_pdf",
    "png_to_ico",
    "pdf_to_images",
}


def _assert_p0_whitelist(target_format: ConversionType) -> None:
    """Reject non-P0 conversions at the API layer."""
    if target_format.value not in P0_WHITELIST:
        raise HTTPException(
            status_code=403,
            detail=f"Conversion '{target_format.value}' is not allowed by server whitelist",
        )


@router.get("/capabilities")
async def conversion_capabilities():
    """Return the full conversion capabilities matrix."""
    caps = get_capabilities()
    groups = {}
    for c in caps:
        g = c["group"]
        if g not in groups:
            groups[g] = {"group": g, "name": get_group_display_name(g), "items": []}
        groups[g]["items"].append(c)
    return {
        "status": "success",
        "capabilities": caps,
        "groups": list(groups.values()),
    }

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
    source_display_name: str = "",
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
        elif target_format == ConversionType.PDF_TO_IMAGES:
            images = converter.pdf_to_images(file_bytes, dpi=150, fmt="PNG")
            archive = io.BytesIO()
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                for idx, image_bytes in enumerate(images, start=1):
                    zf.writestr(f"page_{idx:03d}.png", image_bytes)
            result_bytes = archive.getvalue()
            output_ext = "zip"
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
        base = source_display_name.replace(" ", "_").replace("/", "_") if source_display_name else "file"
        object_name = f"conversions/{task_id}_{base}.{output_ext}"
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
    display_name: str = Form(""),
):
    _assert_p0_whitelist(target_format)
    file_bytes = await file.read()
    task_id = str(uuid.uuid4())
    parsed_options = _parse_conversion_options(conversion_options)
    source_name = display_name or file.filename or ""

    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(
        async_convert_task, task_id, file_bytes, target_format, parsed_options, source_name,
    )

    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")
@router.post("/existing", response_model=ConvertResponse)
async def convert_existing_file(
    background_tasks: BackgroundTasks,
    object_name: str = Form(...),
    target_format: ConversionType = Form(...),
    conversion_options: Optional[str] = Form(None),
    display_name: str = Form(""),
):
    _assert_p0_whitelist(target_format)
    parsed_options = _parse_conversion_options(conversion_options)
    client = get_minio_client()
    try:
        response = client.get_object(settings.MINIO_BUCKET, object_name)
        file_bytes = response.read()
        response.close()
        response.release_conn()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in cloud storage: {str(e)}")

    object_basename = object_name.rsplit("/", 1)[-1]
    source_name = display_name or (object_basename.split("_", 1)[-1] if "_" in object_basename else object_basename)
    task_id = str(uuid.uuid4())
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(async_convert_task, task_id, file_bytes, target_format, parsed_options, source_name)

    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")


# ---- PDF Studio Workspace Endpoints ----

from pydantic import BaseModel
from typing import List

class PDFAnnotationConfig(BaseModel):
    tool: str
    points: List[Dict[str, float]] = []
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    text: Optional[str] = None
    color: str = "#0b5cff"
    size: float = 3

class PDFPageConfig(BaseModel):
    source_object_name: str
    page_num: int
    rotation: int = 0
    canvas_width: Optional[float] = None
    canvas_height: Optional[float] = None
    annotations: List[PDFAnnotationConfig] = []

class PDFProcessRequest(BaseModel):
    pages: List[PDFPageConfig]
    output_filename: Optional[str] = "processed.pdf"


def _safe_pdf_output_name(output_filename: str) -> str:
    base = (output_filename or "processed.pdf").rsplit("/", 1)[-1].strip()
    if not base:
        base = "processed.pdf"
    if not base.lower().endswith(".pdf"):
        base = f"{base}.pdf"
    return base.replace(" ", "_").replace("\\", "_")


async def async_pdf_process_task(task_id: str, pages: List[PDFPageConfig], output_filename: str):
    try:
        safe_output_filename = _safe_pdf_output_name(output_filename)
        await set_task_status(task_id, TaskStatus.PROCESSING)
        await log_event(
            EventType.PDF_REORDER_STARTED,
            f"开始重组PDF: {safe_output_filename}",
            task_id=task_id,
        )
        
        client = get_minio_client()
        def fetch_pdf_bytes(object_name: str) -> bytes:
            response = client.get_object(settings.MINIO_BUCKET, object_name)
            try:
                return response.read()
              
            finally:
                response.close()
                response.release_conn()
                
        configs = [
            {
                "source_object_name": p.source_object_name,
                "page_num": p.page_num,
                "rotation": p.rotation,
                "canvas_width": p.canvas_width,
                "canvas_height": p.canvas_height,
                "annotations": [annotation.model_dump() for annotation in p.annotations],
            }
            for p in pages
        ]
        
        result_bytes = converter.process_pdf_pages(configs, fetch_pdf_bytes)
        
        object_name = f"conversions/{task_id}_{safe_output_filename}"
        client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            io.BytesIO(result_bytes),
            len(result_bytes),
            content_type="application/pdf"
        )
        
        await set_task_status(task_id, TaskStatus.SUCCESS, result_url=_api_download_url(object_name))
        await log_event(
            EventType.PDF_REORDER_COMPLETED,
            f"重组PDF完成: {safe_output_filename}",
            task_id=task_id,
        )
    except Exception as e:
        await set_task_status(task_id, TaskStatus.FAILED, error=str(e))
        await log_event(
            EventType.CONVERSION_FAILED,
            f"重组PDF失败: {str(e)}",
            task_id=task_id,
        )


@router.post("/pdf/extract-pages")
async def extract_pdf_pages(object_name: str = Form(...)):
    client = get_minio_client()
    try:
        response = client.get_object(settings.MINIO_BUCKET, object_name)
        pdf_bytes = response.read()
        response.close()
        response.release_conn()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in cloud storage: {str(e)}")
        
    try:
        import fitz
        images = converter.pdf_to_images(pdf_bytes, dpi=120, fmt="PNG")
        source_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        preview_id = str(uuid.uuid4())
        pages_list = []
        
        for idx, img_bytes in enumerate(images):
            page_rect = source_doc[idx].rect if idx < len(source_doc) else None
            preview_object_name = f"previews/{preview_id}/page_{idx+1}.png"
            client.put_object(
                settings.MINIO_BUCKET,
                preview_object_name,
                io.BytesIO(img_bytes),
                len(img_bytes),
                content_type="image/png"
            )
            pages_list.append({
                "page_num": idx + 1,
                "url": f"/api/v1/files/content/{quote(preview_object_name, safe='')}",
                "width": float(page_rect.width) if page_rect else 595.0,
                "height": float(page_rect.height) if page_rect else 842.0,
            })
        source_doc.close()
            
        return {
            "status": "success",
            "preview_id": preview_id,
            "source_object_name": object_name,
            "pages": pages_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract PDF pages: {str(e)}")


@router.post("/pdf/process", response_model=ConvertResponse)
async def process_pdf(
    request: PDFProcessRequest,
    background_tasks: BackgroundTasks,
):
    task_id = str(uuid.uuid4())
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(
        async_pdf_process_task,
        task_id,
        request.pages,
        request.output_filename or "processed.pdf"
    )
    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="PDF process task queued")


# ── Conversion Preview / Export ──

PREVIEW_PREFIX = "previews/conversion-preview/"


async def _run_conversion_sync(
    file_bytes: bytes,
    target_format: ConversionType,
    conversion_options: dict,
) -> tuple[bytes, str]:
    """Run a conversion inline and return (result_bytes, output_ext)."""
    _assert_p0_whitelist(target_format)
    output_ext = "bin"
    result_bytes = None

    if target_format == ConversionType.WORD_TO_PDF:
        result_bytes = converter.word_to_pdf(file_bytes)
        output_ext = "pdf"
    elif target_format == ConversionType.EXCEL_TO_PDF:
        result_bytes = converter.excel_to_pdf(file_bytes, layout_options=conversion_options.get("excel_layout", {}))
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
        result_bytes = result_str.encode("utf-8")
        output_ext = "html"
    elif target_format == ConversionType.PDF_TO_IMAGES:
        images = converter.pdf_to_images(file_bytes, dpi=150, fmt="PNG")
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for idx, image_bytes in enumerate(images, start=1):
                zf.writestr(f"page_{idx:03d}.png", image_bytes)
        result_bytes = archive.getvalue()
        output_ext = "zip"
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
    elif target_format == ConversionType.PNG_TO_ICO:
        result_bytes = converter.png_to_ico(file_bytes)
        output_ext = "ico"
    elif target_format == ConversionType.PNG_TO_SVG:
        result_bytes = converter.png_to_svg(file_bytes)
        output_ext = "svg"
    elif target_format in {ConversionType.PNG_TO_PDF, ConversionType.JPG_TO_PDF, ConversionType.JPEG_TO_PDF}:
        result_bytes = converter.png_to_pdf(file_bytes)
        output_ext = "pdf"
    else:
        raise HTTPException(status_code=400, detail=f"Preview not supported for {target_format.value}")

    return result_bytes, output_ext


@router.post("/preview")
async def conversion_preview(
    file: UploadFile = File(...),
    target_format: ConversionType = Form(...),
    conversion_options: Optional[str] = Form(None),
    display_name: str = Form(""),
):
    """Run conversion and cache result as a preview.
    Returns preview URL and suggested filename.  Frontend can let the user
    rename before calling POST /api/v1/convert/export to persist."""
    file_bytes = await file.read()
    parsed_options = _parse_conversion_options(conversion_options)

    try:
        result_bytes, output_ext = await _run_conversion_sync(file_bytes, target_format, parsed_options)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview conversion failed: {e}")

    # Cache under a content-hash key
    h = hashlib.sha256(result_bytes).hexdigest()[:16]
    preview_object = f"{PREVIEW_PREFIX}{h}.{output_ext}"

    client = get_minio_client()
    try:
        client.stat_object(settings.MINIO_BUCKET, preview_object)
    except Exception:
        client.put_object(
            settings.MINIO_BUCKET,
            preview_object,
            io.BytesIO(result_bytes),
            len(result_bytes),
            content_type=CONTENT_TYPES.get(output_ext, CONTENT_TYPES["bin"]),
        )

    source_base = display_name or file.filename or "file"
    base = source_base.rsplit(".", 1)[0] if "." in source_base else source_base
    suggested = f"{base}_converted.{output_ext}"

    return {
        "status": "success",
        "preview_object_name": preview_object,
        "preview_url": f"/api/v1/files/content/{quote(preview_object, safe='')}",
        "suggested_filename": suggested,
        "content_type": CONTENT_TYPES.get(output_ext, CONTENT_TYPES["bin"]),
    }


@router.post("/export")
async def export_preview(
    preview_object_name: str = Form(...),
    target_filename: str = Form(...),
):
    """Persist a preview result as a permanent file with the given filename."""
    target_filename = target_filename.strip().replace("/", "_")
    if not target_filename:
        raise HTTPException(status_code=400, detail="target_filename is required")

    client = get_minio_client()
    try:
        client.stat_object(settings.MINIO_BUCKET, preview_object_name)
    except Exception:
        raise HTTPException(status_code=404, detail="Preview not found")

    file_id = str(uuid.uuid4())
    object_name = f"{file_id}_{target_filename}"

    try:
        client.copy_object(
            settings.MINIO_BUCKET,
            object_name,
            CopySource(settings.MINIO_BUCKET, preview_object_name),
        )
        return {
            "status": "success",
            "object_name": object_name,
            "filename": target_filename,
            "download_url": f"/api/v1/files/content/{quote(object_name, safe='')}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")
