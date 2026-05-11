from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.minio_client import get_minio_client
import uuid
import io
from datetime import timedelta

router = APIRouter()
BUCKET = "culcloud-files"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    client = get_minio_client()
    file_id = str(uuid.uuid4())
    object_name = f"{file_id}_{file.filename}"
    try:
        file_bytes = await file.read()
        client.put_object(BUCKET, object_name, io.BytesIO(file_bytes), len(file_bytes), content_type=file.content_type)
        return {"file_id": file_id, "filename": file.filename, "object_name": object_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
