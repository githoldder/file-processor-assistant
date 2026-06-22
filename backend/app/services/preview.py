import logging
import os
import io
import hashlib
import html
import csv
from typing import Optional

import markdown
from minio import Minio
from minio.error import S3Error

from app.config import settings
from app.services.minio_client import get_minio_client
from app.services.converter import DocumentConverter

logger = logging.getLogger(__name__)

BUCKET = settings.MINIO_BUCKET
PREVIEW_PREFIX = "previews/"
MAX_TEXT_SIZE = 5 * 1024 * 1024

PREVIEWABLE_IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
PREVIEWABLE_AUDIO_EXTS = {".mp3", ".wav", ".ogg"}
PREVIEWABLE_VIDEO_EXTS = {".mp4", ".webm", ".mov"}
PREVIEWABLE_TEXT_EXTS = {".txt"}
PREVIEWABLE_CSV_EXTS = {".csv"}
PREVIEWABLE_MD_EXTS = {".md"}
PREVIEWABLE_PDF_EXTS = {".pdf"}
PREVIEWABLE_SVG_EXTS = {".svg"}
PREVIEWABLE_OFFICE_EXTS = {".doc", ".docx", ".xlsx", ".xls", ".pptx"}

ALL_PREVIEWABLE = (
    PREVIEWABLE_IMAGE_EXTS
    | PREVIEWABLE_AUDIO_EXTS
    | PREVIEWABLE_VIDEO_EXTS
    | PREVIEWABLE_TEXT_EXTS
    | PREVIEWABLE_CSV_EXTS
    | PREVIEWABLE_MD_EXTS
    | PREVIEWABLE_PDF_EXTS
    | PREVIEWABLE_SVG_EXTS
    | PREVIEWABLE_OFFICE_EXTS
)


def _get_ext(object_name: str) -> str:
    return os.path.splitext(object_name)[1].lower()


def _preview_object_name(object_name: str) -> str:
    hashed = hashlib.md5(object_name.encode()).hexdigest()
    ext = _get_ext(object_name)
    if ext in PREVIEWABLE_IMAGE_EXTS | PREVIEWABLE_SVG_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}{ext}"
    if ext in PREVIEWABLE_AUDIO_EXTS | PREVIEWABLE_VIDEO_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}{ext}"
    if ext in PREVIEWABLE_TEXT_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}.txt"
    if ext in PREVIEWABLE_CSV_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}.html"
    if ext in PREVIEWABLE_MD_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}.html"
    if ext in PREVIEWABLE_PDF_EXTS:
        return f"{PREVIEW_PREFIX}{hashed}.pdf"
    # Office -> pdf
    return f"{PREVIEW_PREFIX}{hashed}.pdf"


def _detect_preview_type(object_name: str) -> str:
    ext = _get_ext(object_name)
    if ext in PREVIEWABLE_IMAGE_EXTS:
        return "image"
    if ext in PREVIEWABLE_AUDIO_EXTS:
        return "audio"
    if ext in PREVIEWABLE_VIDEO_EXTS:
        return "video"
    if ext in PREVIEWABLE_SVG_EXTS:
        return "image"
    if ext in PREVIEWABLE_TEXT_EXTS:
        return "text"
    if ext in PREVIEWABLE_CSV_EXTS:
        return "html"
    if ext in PREVIEWABLE_MD_EXTS:
        return "html"
    if ext in PREVIEWABLE_PDF_EXTS:
        return "pdf"
    if ext in PREVIEWABLE_OFFICE_EXTS:
        return "pdf"
    return "unsupported"


def _content_type_for(object_name: str) -> str:
    ext = _get_ext(object_name)
    return {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".txt": "text/plain; charset=utf-8",
        ".html": "text/html; charset=utf-8",
    }.get(ext, "application/octet-stream")


def _iter_bytes(data: bytes):
    yield data


def _size_stat(size: int):
    return type("PreviewStat", (), {"size": size})()


def is_previewable(object_name: str) -> bool:
    return _get_ext(object_name) in ALL_PREVIEWABLE


async def get_preview_metadata(object_name: str) -> Optional[dict]:
    client = get_minio_client()
    ext = _get_ext(object_name)

    if ext not in ALL_PREVIEWABLE:
        return None

    try:
        stat = client.stat_object(BUCKET, object_name)
    except S3Error:
        return None

    preview_obj = _preview_object_name(object_name)
    preview_type = _detect_preview_type(object_name)
    cached = False

    try:
        client.stat_object(BUCKET, preview_obj)
        cached = True
    except S3Error:
        pass

    from urllib.parse import quote
    encoded = quote(object_name, safe="")

    return {
        "status": "success",
        "object_name": object_name,
        "filename": stat.metadata.get("filename", object_name.rsplit("/", 1)[-1]) or object_name.rsplit("/", 1)[-1],
        "size": stat.size,
        "preview_type": preview_type,
        "cached": cached,
        "content_url": f"/api/v1/preview/{encoded}/content",
    }


async def stream_preview_content(object_name: str):
    client = get_minio_client()
    ext = _get_ext(object_name)

    if ext not in ALL_PREVIEWABLE:
        return None

    if ext in PREVIEWABLE_IMAGE_EXTS | PREVIEWABLE_SVG_EXTS | PREVIEWABLE_AUDIO_EXTS | PREVIEWABLE_VIDEO_EXTS:
        return await _stream_raw(client, object_name)

    if ext in PREVIEWABLE_PDF_EXTS:
        return await _stream_raw(client, object_name)

    if ext in PREVIEWABLE_TEXT_EXTS:
        return await _stream_text(client, object_name)

    if ext in PREVIEWABLE_CSV_EXTS:
        return await _stream_csv_html(client, object_name)

    if ext in PREVIEWABLE_MD_EXTS:
        return await _stream_markdown_html(client, object_name)

    if ext in PREVIEWABLE_OFFICE_EXTS:
        return await _stream_office_preview(client, object_name)

    return None


async def _stream_raw(client: Minio, object_name: str):
    try:
        stat = client.stat_object(BUCKET, object_name)
        response = client.get_object(BUCKET, object_name)

        def iter_content():
            try:
                for chunk in response.stream(32 * 1024):
                    yield chunk
            finally:
                response.close()
                response.release_conn()

        return stat, iter_content, _content_type_for(object_name)
    except S3Error:
        return None


async def _stream_text(client: Minio, object_name: str):
    try:
        stat = client.stat_object(BUCKET, object_name)
        if stat.size > MAX_TEXT_SIZE:
            return None

        response = client.get_object(BUCKET, object_name)
        raw = response.read()
        response.close()
        response.release_conn()

        text = raw.decode("utf-8", errors="replace").encode("utf-8")
        return stat, lambda: _iter_bytes(text), "text/plain; charset=utf-8"
    except S3Error:
        return None


async def _stream_markdown_html(client: Minio, object_name: str):
    try:
        stat = client.stat_object(BUCKET, object_name)
        response = client.get_object(BUCKET, object_name)
        raw = response.read()
        response.close()
        response.release_conn()

        md_text = raw.decode("utf-8", errors="replace")
        html_body = markdown.markdown(
            html.escape(md_text),
            extensions=["fenced_code", "codehilite", "tables", "nl2br"],
        )

        wrapped = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; line-height: 1.6; }}
pre {{ background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }}
code {{ background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }}
img {{ max-width: 100%; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
</style></head><body>{html_body}</body></html>"""

        rendered = wrapped.encode("utf-8")
        return _size_stat(len(rendered)), lambda: _iter_bytes(rendered), "text/html; charset=utf-8"
    except S3Error:
        return None


async def _stream_csv_html(client: Minio, object_name: str):
    try:
        stat = client.stat_object(BUCKET, object_name)
        if stat.size > MAX_TEXT_SIZE:
            return None

        response = client.get_object(BUCKET, object_name)
        raw = response.read()
        response.close()
        response.release_conn()

        text = raw.decode("utf-8-sig", errors="replace")
        rows = list(csv.reader(io.StringIO(text)))
        preview_rows = rows[:500]
        max_cols = max((len(row) for row in preview_rows), default=0)

        table_rows = []
        for idx, row in enumerate(preview_rows):
            cells = []
            for col_idx in range(max_cols):
                value = row[col_idx] if col_idx < len(row) else ""
                tag = "th" if idx == 0 else "td"
                cells.append(f"<{tag}>{html.escape(value)}</{tag}>")
            table_rows.append(f"<tr>{''.join(cells)}</tr>")

        clipped = len(rows) > len(preview_rows)
        notice = (
            f"<p class=\"notice\">Showing first {len(preview_rows)} of {len(rows)} rows.</p>"
            if clipped else ""
        )
        wrapped = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; color: #1f2937; }}
.notice {{ color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }}
.table-wrap {{ overflow: auto; border: 1px solid #e2e8f0; border-radius: 12px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
th, td {{ border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; white-space: nowrap; }}
th {{ position: sticky; top: 0; background: #f8fafc; font-weight: 800; }}
tr:nth-child(even) td {{ background: #f9fafb; }}
</style></head><body>{notice}<div class="table-wrap"><table>{''.join(table_rows)}</table></div></body></html>"""

        rendered = wrapped.encode("utf-8")
        return _size_stat(len(rendered)), lambda: _iter_bytes(rendered), "text/html; charset=utf-8"
    except S3Error:
        return None


async def _stream_office_preview(client: Minio, object_name: str):
    preview_obj = _preview_object_name(object_name)

    # Return cached preview if available
    try:
        cached_stat = client.stat_object(BUCKET, preview_obj)
        cached_resp = client.get_object(BUCKET, preview_obj)

        def iter_cached():
            try:
                for chunk in cached_resp.stream(32 * 1024):
                    yield chunk
            finally:
                cached_resp.close()
                cached_resp.release_conn()

        return cached_stat, iter_cached, "application/pdf"
    except S3Error:
        pass

    # Generate preview via Gotenberg
    try:
        ext = _get_ext(object_name)
        source_resp = client.get_object(BUCKET, object_name)
        source_bytes = source_resp.read()
        source_resp.close()
        source_resp.release_conn()

        converter = DocumentConverter()
        fmt = ext.lstrip(".")
        pdf_bytes = converter._gotenberg_convert(source_bytes, fmt, "pdf")

        # Cache to MinIO previews/
        preview_data = io.BytesIO(pdf_bytes)
        client.put_object(
            BUCKET,
            preview_obj,
            preview_data,
            len(pdf_bytes),
            content_type="application/pdf",
        )

        stat = client.stat_object(BUCKET, preview_obj)

        return stat, lambda: _iter_bytes(pdf_bytes), "application/pdf"
    except Exception as e:
        logger.error(f"Office preview failed for {object_name}: {e}")
        return None


async def delete_preview_cache(object_name: str) -> bool:
    client = get_minio_client()
    preview_obj = _preview_object_name(object_name)
    try:
        client.remove_object(BUCKET, preview_obj)
        return True
    except S3Error:
        return False
