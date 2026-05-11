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
    """
    Lists all files in the MinIO bucket with metadata.
    """
    client = get_minio_client()
    try:
        # Standard recursive list
        objects = client.list_objects(BUCKET, recursive=True)
        files_list = []
        for obj in objects:
            # Skip directories (MinIO simulated dirs end with /)
            if obj.object_name.endswith('/'):
                continue
                
            files_list.append({
                "object_name": obj.object_name,
                "filename": obj.object_name.split('_', 1)[-1] if '_' in obj.object_name else obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "content_type": obj.content_type if hasattr(obj, 'content_type') else "application/octet-stream"
            })
        
        # Sort by last modified descending
        files_list.sort(key=lambda x: x['last_modified'] or "", reverse=True)
        return {"status": "success", "files": files_list}
    except Exception as e:
        logger.error(f"Failed to list files: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch file list")

@router.get("/{object_name:path}/download")
async def get_download_url(object_name: str):
    """
    Generates a presigned URL for downloading a file.
    """
    client = get_minio_client()
    try:
        # Check if object exists first
        try:
            client.stat_object(BUCKET, object_name)
        except:
            raise HTTPException(status_code=404, detail="File not found")

        url = client.presigned_get_object(
            BUCKET, 
            object_name, 
            expires=timedelta(hours=1),
            response_headers={
                'response-content-disposition': f'attachment; filename="{object_name.split("_", 1)[-1]}"'
            }
        )
        return {"status": "success", "download_url": url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate download URL for {object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")

@router.delete("/{object_name:path}")
async def delete_file(object_name: str):
    client = get_minio_client()
    try:
        client.remove_object(BUCKET, object_name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
