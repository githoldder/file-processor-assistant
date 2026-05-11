from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.minio_client import get_minio_client
import logging
import uuid
import io
from datetime import timedelta

logger = logging.getLogger(__name__)

router = APIRouter()
BUCKET = "culcloud-files"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a file to MinIO using streaming.
    """
    client = get_minio_client()
    file_id = str(uuid.uuid4())
    object_name = f"{file_id}_{file.filename}"
    
    try:
        # Use file.file directly as the stream
        client.put_object(
            BUCKET, 
            object_name, 
            file.file, 
            file.size if file.size else -1, # MinIO SDK handles unknown size with -1 but prefers actual size
            content_type=file.content_type,
            part_size=10*1024*1024 # 10MB parts for large files
        )
        return {
            "status": "success",
            "file_id": file_id, 
            "filename": file.filename, 
            "object_name": object_name,
            "size": file.size
        }
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("")
async def list_files():
    client = get_minio_client()
    try:
        objects = client.list_objects(BUCKET)
        files = []
        for obj in objects:
            files.append({
                "object_name": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified
            })
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{object_name:path}/download")
async def get_download_url(object_name: str):
    client = get_minio_client()
    try:
        url = client.presigned_get_object(BUCKET, object_name, expires=timedelta(hours=1))
        return {"download_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{object_name:path}")
async def delete_file(object_name: str):
    client = get_minio_client()
    try:
        client.remove_object(BUCKET, object_name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
