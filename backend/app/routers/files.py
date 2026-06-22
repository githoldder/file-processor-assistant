from datetime import timedelta
from urllib.parse import quote
import logging
import uuid
import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from minio.commonconfig import CopySource

from app.config import settings
from app.services.minio_client import get_minio_client
from app.services.log_collector import log_event, EventType
from app.routers.auth import get_current_role

logger = logging.getLogger(__name__)

router = APIRouter()
BUCKET = settings.MINIO_BUCKET

SYSTEM_PREFIXES = {"previews/", "conversions/", ".keep"}


def _sanitize_path(path: str) -> str:
    stripped = "/".join(part for part in path.strip().strip("/").split("/") if part)
    if ".." in stripped.split("/"):
        raise HTTPException(status_code=400, detail="Path traversal detected")
    return stripped


def _is_system_prefix(object_name: str) -> bool:
    return (
        any(object_name.startswith(p) for p in SYSTEM_PREFIXES)
        or object_name == ".keep"
        or object_name.endswith("/.keep")
    )


def _is_folder(obj) -> bool:
    return (obj.object_name.endswith("/") and obj.size == 0) or obj.object_name.endswith("/.keep")


import re


def _display_name(object_name: str) -> str:
    base_name = object_name.rstrip("/").rsplit("/", 1)[-1]
    uuid_pattern = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]"
    return re.sub(uuid_pattern, "", base_name)


def _public_presigned_url(url: str) -> str:
    internal = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
    return url.replace(f"http://{internal}", settings.MINIO_PUBLIC_ENDPOINT.rstrip("/"))


def _build_file_entry(obj) -> dict:
    return {
        "bucket": BUCKET,
        "object_name": obj.object_name,
        "filename": _display_name(obj.object_name),
        "size": obj.size,
        "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
        "content_type": getattr(obj, "content_type", None) or "application/octet-stream",
    }


def _build_folder_entry(obj) -> dict:
    name = obj.object_name.removesuffix("/.keep").rstrip("/")
    return {
        "name": name.rsplit("/", 1)[-1],
        "path": name,
        "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    prefix: str = Form(""),
    relative_path: str = Form(""),
):
    """
    Uploads a file within an optional prefix (folder).
    When relative_path is set (webkitdirectory), it preserves subdirectory structure.
    """
    p = _sanitize_path(prefix)
    rp = _sanitize_path(relative_path) if relative_path else ""

    parts = [p] if p else []
    if rp:
        dir_part = rp.rsplit("/", 1)[0] if "/" in rp else ""
        if dir_part:
            parts.append(dir_part)
    path_prefix = "/".join(parts) + "/" if parts else ""

    client = get_minio_client()
    file_id = str(uuid.uuid4())
    object_name = f"{path_prefix}{file_id}_{file.filename}"

    try:
        client.put_object(
            BUCKET,
            object_name,
            file.file,
            file.size if file.size else -1,
            content_type=file.content_type,
            part_size=10 * 1024 * 1024,
        )
        await log_event(
            EventType.FILE_UPLOADED,
            f"文件上传: {file.filename}",
            file_name=file.filename,
            file_size=file.size,
            user_id=get_current_role(),
        )
        return {
            "status": "success",
            "file_id": file_id,
            "bucket": BUCKET,
            "filename": file.filename,
            "object_name": object_name,
            "prefix": p or None,
            "relative_path": relative_path or None,
            "size": file.size,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("")
async def list_files(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    prefix: str = Query("", description="Browse a folder prefix"),
    recursive: bool = Query(False, description="Recursively list all files"),
):
    """
    Lists files and folders at the given prefix level.
    Returns folders[] for directory-level browsing and files[] for file entries.
    """
    client = get_minio_client()
    try:
        p = _sanitize_path(prefix)
        prefix_filter = p + "/" if p else ""
        folder_set = {}
        all_files = []

        for obj in client.list_objects(BUCKET, prefix=prefix_filter, recursive=recursive):
            if obj.object_name == prefix_filter:
                continue
            if _is_folder(obj):
                folder_set[obj.object_name.removesuffix("/.keep").rstrip("/") + "/"] = _build_folder_entry(obj)
                continue
            if _is_system_prefix(obj.object_name):
                continue
            rel_name = obj.object_name[len(prefix_filter):] if prefix_filter else obj.object_name
            if not recursive and "/" in rel_name:
                folder_name = prefix_filter + rel_name.split("/", 1)[0] + "/"
                folder_set.setdefault(folder_name, {
                    "name": folder_name.rstrip("/").rsplit("/", 1)[-1],
                    "path": folder_name.rstrip("/"),
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                })
            elif not obj.object_name.endswith("/"):
                all_files.append(_build_file_entry(obj))

        # Synthesize implicit folders from object key prefixes.
        # e.g. "docs/project/report.pdf" without a "docs/" or "docs/project/" marker
        # still produces {"path": "docs/project", ...} in folders[].
        seen_prefixes = set(folder_set.keys())
        for f in all_files:
            rel = f["object_name"]
            if prefix_filter:
                rel = rel[len(prefix_filter):]
            parts = rel.split("/")
            for i in range(1, len(parts)):
                virtual = prefix_filter + "/".join(parts[:i]) + "/"
                if virtual not in seen_prefixes:
                    seen_prefixes.add(virtual)
                    folder_set[virtual] = {
                        "path": virtual.rstrip("/"),
                        "last_modified": None,
                    }

        all_files.sort(key=lambda x: x["last_modified"] or "", reverse=True)
        total = len(all_files)
        page = all_files[offset:offset + limit]
        return {
            "status": "success",
            "bucket": BUCKET,
            "prefix": p or None,
            "folders": sorted(folder_set.values(), key=lambda x: x["path"] or ""),
            "files": page,
            "total": total,
            "offset": offset,
            "limit": limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list files: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch file list")


@router.get("/search")
async def search_files(q: str = Query("", min_length=1)):
    """
    Search files by name (case-insensitive substring match).
    """
    client = get_minio_client()
    try:
        q_lower = q.lower()
        results = []
        for obj in client.list_objects(BUCKET, recursive=True):
            if obj.object_name.endswith("/") or _is_system_prefix(obj.object_name):
                continue
            name = _display_name(obj.object_name).lower()
            if q_lower in name:
                results.append(_build_file_entry(obj))
        results.sort(key=lambda x: x["last_modified"] or "", reverse=True)
        return {"status": "success", "query": q, "files": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Search failed for '{q}': {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/download/{object_name:path}")
async def get_download_url(object_name: str):
    """
    Generates download URLs. `api_download_url` is preferred by the frontend.
    """
    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
        await log_event(
            EventType.FILE_DOWNLOADED,
            f"文件下载: {_display_name(object_name)}",
            file_name=_display_name(object_name),
            user_id=get_current_role(),
        )
        url = client.presigned_get_object(
            BUCKET,
            object_name,
            expires=timedelta(hours=1),
            response_headers={
                "response-content-disposition": f"attachment; filename=\"{quote(_display_name(object_name))}\"; filename*=UTF-8''{quote(_display_name(object_name))}"
            },
        )
        return {
            "status": "success",
            "download_url": _public_presigned_url(url),
            "api_download_url": f"/api/v1/files/content/{quote(object_name, safe='')}",
        }
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


@router.get("/content/{object_name:path}")
async def download_file_content(object_name: str):
    """
    Streams the object through FastAPI so browser clients do not depend on MinIO's internal hostname.
    """
    client = get_minio_client()
    try:
        stat = client.stat_object(BUCKET, object_name)
        await log_event(
            EventType.FILE_DOWNLOADED,
            f"文件下载: {_display_name(object_name)}",
            file_name=_display_name(object_name),
            file_size=stat.size,
            user_id=get_current_role(),
        )
        response = client.get_object(BUCKET, object_name)

        def iter_object():
            try:
                for chunk in response.stream(32 * 1024):
                    yield chunk
            finally:
                response.close()
                response.release_conn()

        return StreamingResponse(
            iter_object(),
            media_type=stat.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=\"{quote(_display_name(object_name))}\"; filename*=UTF-8''{quote(_display_name(object_name))}",
                "Content-Length": str(stat.size),
            },
        )
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


@router.get("/stat/{object_name:path}")
async def stat_file(object_name: str):
    """
    Returns S3 object metadata for preview/detail panels.
    """
    client = get_minio_client()
    try:
        stat = client.stat_object(BUCKET, object_name)
        return {
            "status": "success",
            "object": {
                "bucket": BUCKET,
                "object_name": object_name,
                "filename": _display_name(object_name),
                "size": stat.size,
                "content_type": stat.content_type,
                "etag": stat.etag,
                "last_modified": stat.last_modified.isoformat() if stat.last_modified else None,
            },
        }
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


@router.patch("/rename/{object_name:path}")
async def rename_file(object_name: str, new_filename: str = Form(...)):
    """
    Renames an object with S3 copy + delete semantics.
    """
    new_filename = new_filename.strip().replace("/", "_")
    if not new_filename:
        raise HTTPException(status_code=400, detail="New filename is required")
    if ".." in new_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    prefix = object_name.rsplit("/", 1)[0] + "/" if "/" in object_name else ""
    base_name = object_name.rsplit("/", 1)[-1]
    file_id = base_name.split("_", 1)[0] if "_" in base_name else str(uuid.uuid4())
    new_object_name = f"{prefix}{file_id}_{new_filename}"

    try:
        client.copy_object(BUCKET, new_object_name, CopySource(BUCKET, object_name))
        client.remove_object(BUCKET, object_name)
        await log_event(
            EventType.FILE_RENAMED,
            f"文件重命名: {_display_name(object_name)} -> {new_filename}",
            file_name=new_filename,
            user_id=get_current_role(),
            metadata={"source": object_name, "target": new_object_name},
        )
        return {
            "status": "success",
            "object_name": new_object_name,
            "filename": _display_name(new_object_name),
        }
    except Exception as e:
        logger.error(f"Failed to rename {object_name} to {new_object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename file")


@router.post("/share/{object_name:path}")
async def share_file(
    object_name: str,
    expires_hours: int = Form(24),
):
    """
    Generate a shareable download link with configurable expiration.
    """
    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
        url = client.presigned_get_object(
            BUCKET,
            object_name,
            expires=timedelta(hours=expires_hours),
        )
        internal = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
        public_url = url.replace(f"http://{internal}", settings.MINIO_PUBLIC_ENDPOINT.rstrip("/"))
        return {
            "status": "success",
            "share_url": public_url,
            "expires_in_hours": expires_hours,
            "object_name": object_name,
        }
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


@router.post("/batch-delete")
async def batch_delete_files(object_names: str = Form(...)):
    """
    Delete multiple files at once. Pass object_names as a JSON array string.
    """
    client = get_minio_client()
    try:
        names = json.loads(object_names)
        if not isinstance(names, list):
            raise ValueError("object_names must be a JSON array")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="object_names must be a valid JSON array")

    deleted = []
    errors = []
    for name in names:
        try:
            client.stat_object(BUCKET, name)
            client.remove_object(BUCKET, name)
            deleted.append(name)
        except Exception:
            errors.append(name)

    if deleted:
        await log_event(
            EventType.FILE_DELETED,
            f"批量删除: {len(deleted)} files",
            file_name=deleted[0],
            user_id=get_current_role(),
        )
    return {
        "status": "success",
        "deleted": deleted,
        "errors": errors,
        "deleted_count": len(deleted),
        "error_count": len(errors),
    }


@router.delete("/{object_name:path}")
async def delete_file(object_name: str):
    """
    Deletes a file from MinIO.
    """
    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
        client.remove_object(BUCKET, object_name)
        await log_event(
            EventType.FILE_DELETED,
            f"文件删除: {object_name}",
            file_name=_display_name(object_name),
            user_id=get_current_role(),
        )
        logger.info(f"Successfully deleted object: {object_name}")
        return {"status": "success", "message": f"File {object_name} deleted"}
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
