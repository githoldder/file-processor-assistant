from datetime import timedelta
from urllib.parse import quote
import logging
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from minio.commonconfig import CopySource

from app.config import settings
from app.services.minio_client import get_minio_client

logger = logging.getLogger(__name__)

router = APIRouter()
BUCKET = settings.MINIO_BUCKET


def _display_name(object_name: str) -> str:
    base_name = object_name.rsplit("/", 1)[-1]
    return base_name.split("_", 1)[-1] if "_" in base_name else base_name


def _public_presigned_url(url: str) -> str:
    internal = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
    return url.replace(f"http://{internal}", settings.MINIO_PUBLIC_ENDPOINT.rstrip("/"))


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a file to the PRD07 MinIO bucket using the S3-compatible API.
    """
    client = get_minio_client()
    file_id = str(uuid.uuid4())
    object_name = f"{file_id}_{file.filename}"

    try:
        client.put_object(
            BUCKET,
            object_name,
            file.file,
            file.size if file.size else -1,
            content_type=file.content_type,
            part_size=10 * 1024 * 1024,
        )
        return {
            "status": "success",
            "file_id": file_id,
            "bucket": BUCKET,
            "filename": file.filename,
            "object_name": object_name,
            "size": file.size,
        }
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("")
async def list_files():
    """
    Lists all objects in the cloud-drive bucket.
    """
    client = get_minio_client()
    try:
        files_list = []
        for obj in client.list_objects(BUCKET, recursive=True):
            if obj.object_name.endswith("/"):
                continue

            files_list.append(
                {
                    "bucket": BUCKET,
                    "object_name": obj.object_name,
                    "filename": _display_name(obj.object_name),
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                    "content_type": getattr(obj, "content_type", None) or "application/octet-stream",
                }
            )

        files_list.sort(key=lambda x: x["last_modified"] or "", reverse=True)
        return {"status": "success", "bucket": BUCKET, "files": files_list}
    except Exception as e:
        logger.error(f"Failed to list files: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch file list")


@router.get("/download/{object_name:path}")
async def get_download_url(object_name: str):
    """
    Generates download URLs. `api_download_url` is preferred by the frontend.
    """
    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
        url = client.presigned_get_object(
            BUCKET,
            object_name,
            expires=timedelta(hours=1),
            response_headers={
                "response-content-disposition": f'attachment; filename="{_display_name(object_name)}"'
            },
        )
        return {
            "status": "success",
            "download_url": _public_presigned_url(url),
            "api_download_url": f"/api/v1/files/content/{quote(object_name, safe='')}",
        }
    except Exception as e:
        logger.error(f"Failed to generate download URL for {object_name}: {e}")
        raise HTTPException(status_code=404, detail="File not found")


@router.get("/content/{object_name:path}")
async def download_file_content(object_name: str):
    """
    Streams the object through FastAPI so browser clients do not depend on MinIO's internal hostname.
    """
    client = get_minio_client()
    try:
        stat = client.stat_object(BUCKET, object_name)
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
                "Content-Disposition": f'attachment; filename="{_display_name(object_name)}"',
                "Content-Length": str(stat.size),
            },
        )
    except Exception as e:
        logger.error(f"Failed to stream {object_name}: {e}")
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
        return {
            "status": "success",
            "object_name": new_object_name,
            "filename": _display_name(new_object_name),
        }
    except Exception as e:
        logger.error(f"Failed to rename {object_name} to {new_object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename file")


@router.delete("/{object_name:path}")
async def delete_file(object_name: str):
    """
    Deletes a file from MinIO.
    """
    client = get_minio_client()
    try:
        client.stat_object(BUCKET, object_name)
        client.remove_object(BUCKET, object_name)
        logger.info(f"Successfully deleted object: {object_name}")
        return {"status": "success", "message": f"File {object_name} deleted"}
    except Exception as e:
        logger.error(f"Failed to delete {object_name}: {e}")
        raise HTTPException(status_code=404, detail="File not found")
