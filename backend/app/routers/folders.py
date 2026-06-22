"""Folder router — directory CRUD, browse, and file move operations."""
import io
import logging
import uuid

from fastapi import APIRouter, Form, HTTPException

from app.config import settings
from app.services.minio_client import get_minio_client
from app.services.log_collector import log_event, EventType
from app.routers.auth import get_current_role
from minio.commonconfig import CopySource

logger = logging.getLogger(__name__)

router = APIRouter()
BUCKET = settings.MINIO_BUCKET

SYSTEM_PREFIXES = {"previews/", "conversions/", ".keep"}


def _sanitize_path(path: str) -> str:
    stripped = "/".join(part for part in path.strip().strip("/").split("/") if part)
    if ".." in stripped.split("/"):
        raise HTTPException(status_code=400, detail="Path traversal detected")
    return stripped


def _normalize_folder_path(path: str) -> str:
    p = _sanitize_path(path)
    return p + "/" if p else ""


def _is_system_prefix(object_name: str) -> bool:
    return (
        any(object_name.startswith(p) for p in SYSTEM_PREFIXES)
        or object_name == ".keep"
        or object_name.endswith("/.keep")
    )


def _is_folder(obj) -> bool:
    return (obj.object_name.endswith("/") and obj.size == 0) or obj.object_name.endswith("/.keep")


def _display_name(object_name: str) -> str:
    base = object_name.rstrip("/").rsplit("/", 1)[-1]
    return base.split("_", 1)[-1] if "_" in base else base


@router.post("")
async def create_folder(path: str = Form(...)):
    p = _sanitize_path(path)
    if not p:
        raise HTTPException(status_code=400, detail="Folder path must be non-empty")
    marker = p + "/.keep"

    client = get_minio_client()
    try:
        existing = list(client.list_objects(BUCKET, prefix=p + "/", recursive=True))
        if existing:
            raise HTTPException(status_code=409, detail="Folder already exists")
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        client.put_object(BUCKET, marker, io.BytesIO(b""), 0)
        await log_event(
            EventType.FOLDER_CREATED,
            f"创建文件夹: {p}",
            file_name=p,
            user_id=get_current_role(),
        )
        return {"status": "success", "folder": p.rsplit("/", 1)[-1], "path": p, "marker": marker}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create folder {p}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create folder")


@router.get("")
async def browse_root():
    client = get_minio_client()
    try:
        folders = {}
        files = []

        for obj in client.list_objects(BUCKET, recursive=False):
            if _is_system_prefix(obj.object_name):
                continue
            if _is_folder(obj):
                name = obj.object_name.rstrip("/")
                folders[name] = {
                    "path": name,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                }
            elif not obj.object_name.endswith("/"):
                files.append({
                    "object_name": obj.object_name,
                    "filename": _display_name(obj.object_name),
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                })

        return {
            "status": "success",
            "bucket": BUCKET,
            "folders": list(folders.values()),
            "files": files,
        }
    except Exception as e:
        logger.error(f"Failed to browse root: {e}")
        raise HTTPException(status_code=500, detail="Failed to browse folders")


@router.get("/{path:path}")
async def browse_folder(path: str):
    prefix = _normalize_folder_path(path)
    if not prefix:
        raise HTTPException(status_code=400, detail="Invalid folder path")

    client = get_minio_client()
    try:
        client.stat_object(BUCKET, prefix)
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")

    try:
        subfolders = {}
        files = []

        for obj in client.list_objects(BUCKET, prefix=prefix, recursive=False):
            if _is_system_prefix(obj.object_name):
                continue
            if _is_folder(obj) and obj.object_name != prefix:
                name = obj.object_name.rstrip("/")
                subfolders[name] = {
                    "path": name,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                }
            elif not obj.object_name.endswith("/") and obj.object_name != prefix:
                files.append({
                    "object_name": obj.object_name,
                    "filename": _display_name(obj.object_name),
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                })

        return {
            "status": "success",
            "bucket": BUCKET,
            "path": path,
            "folders": list(subfolders.values()),
            "files": files,
        }
    except Exception as e:
        logger.error(f"Failed to browse folder {path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to browse folder")


@router.delete("/{path:path}")
async def delete_folder(path: str):
    prefix = _normalize_folder_path(path)
    if not prefix:
        raise HTTPException(status_code=400, detail="Invalid folder path")

    client = get_minio_client()
    try:
        objects = list(client.list_objects(BUCKET, prefix=prefix, recursive=True))
        if not objects:
            raise HTTPException(status_code=404, detail="Folder not found or already empty")
        for obj in objects:
            client.remove_object(BUCKET, obj.object_name)

        await log_event(
            EventType.FOLDER_DELETED,
            f"删除文件夹: {path} ({len(objects)} objects)",
            file_name=path,
            user_id=get_current_role(),
        )
        return {
            "status": "success",
            "message": f"Folder '{path}' deleted ({len(objects)} objects removed)",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete folder {path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete folder")


@router.put("/rename/{path:path}")
async def rename_folder(path: str, new_name: str = Form(...)):
    new_name = new_name.strip().replace("/", "_")
    if not new_name:
        raise HTTPException(status_code=400, detail="New folder name is required")
    if ".." in new_name:
        raise HTTPException(status_code=400, detail="Invalid folder name")

    old_prefix = _normalize_folder_path(path)
    new_prefix = _normalize_folder_path(new_name)

    if not old_prefix:
        raise HTTPException(status_code=400, detail="Invalid folder path")

    client = get_minio_client()
    try:
        client.stat_object(BUCKET, old_prefix)
    except Exception:
        raise HTTPException(status_code=404, detail="Folder not found")

    try:
        client.stat_object(BUCKET, new_prefix)
        raise HTTPException(status_code=409, detail="Target folder already exists")
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        objects = list(client.list_objects(BUCKET, prefix=old_prefix, recursive=True))
        moved = 0
        for obj in objects:
            new_key = obj.object_name.replace(old_prefix, new_prefix, 1)
            client.copy_object(BUCKET, new_key, CopySource(BUCKET, obj.object_name))
            client.remove_object(BUCKET, obj.object_name)
            moved += 1

        await log_event(
            EventType.FOLDER_RENAMED,
            f"重命名文件夹: {path} -> {new_name} ({moved} objects)",
            file_name=path,
            user_id=get_current_role(),
            metadata={"new_name": new_name, "objects_moved": moved},
        )
        return {
            "status": "success",
            "old_name": path,
            "new_name": new_name,
            "objects_moved": moved,
        }
    except Exception as e:
        logger.error(f"Failed to rename folder {path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename folder")


@router.put("/move")
async def move_to_folder(object_name: str = Form(...), target_folder: str = Form(...)):
    target_prefix = _normalize_folder_path(target_folder)
    if not target_prefix:
        raise HTTPException(status_code=400, detail="Invalid target folder")

    client = get_minio_client()
    try:
        client.stat_object(BUCKET, target_prefix)
    except Exception:
        raise HTTPException(status_code=404, detail="Target folder not found")

    try:
        client.stat_object(BUCKET, object_name)
    except Exception:
        raise HTTPException(status_code=404, detail="Source file not found")

    try:
        basename = object_name.rsplit("/", 1)[-1]
        new_object_name = f"{target_prefix}{basename}"

        client.copy_object(BUCKET, new_object_name, CopySource(BUCKET, object_name))
        client.remove_object(BUCKET, object_name)

        await log_event(
            EventType.FILE_MOVED,
            f"移动文件: {object_name} -> {new_object_name}",
            file_name=basename,
            user_id=get_current_role(),
            metadata={"source": object_name, "target": new_object_name},
        )
        return {
            "status": "success",
            "object_name": new_object_name,
            "filename": _display_name(new_object_name),
        }
    except Exception as e:
        logger.error(f"Failed to move {object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to move file")
