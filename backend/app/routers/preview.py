"""Preview router — metadata, content streaming, and cache management.
Route ordering is intentional: more specific routes (/content, /cache)
must be registered before the catch-all /{object_name:path}."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.preview import (
    is_previewable,
    get_preview_metadata,
    stream_preview_content,
    delete_preview_cache,
)
from app.services.log_collector import log_event, EventType
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Specific routes first (before catch-all) ──

@router.get("/{object_name:path}/content")
async def preview_content(object_name: str):
    try:
        result = await stream_preview_content(object_name)
        if result is None:
            raise HTTPException(status_code=404, detail="Preview content not available")

        stat, iter_content, content_type = result
        return StreamingResponse(
            iter_content(),
            media_type=content_type,
            headers={
                "Content-Length": str(stat.size),
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=3600",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview content failed for {object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to stream preview content")


@router.delete("/{object_name:path}/cache")
async def clear_preview_cache_legacy(object_name: str):
    """Backward-compatible alias: DELETE /api/v1/preview/{object}/cache"""
    return await clear_preview_cache(object_name)


# ── Catch-all routes ──

@router.get("/{object_name:path}")
async def preview_metadata(object_name: str):
    try:
        meta = await get_preview_metadata(object_name)
        if meta is None:
            raise HTTPException(status_code=404, detail="File not found or not previewable")
        return meta
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview metadata failed for {object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get preview metadata")


@router.delete("/{object_name:path}")
async def clear_preview_cache(object_name: str):
    """PRD primary contract: DELETE /api/v1/preview/{object} clears preview cache."""
    try:
        ok = await delete_preview_cache(object_name)
        if not ok:
            raise HTTPException(status_code=404, detail="Preview cache not found")
        await log_event(
            EventType.FILE_DELETED,
            f"Preview cache cleared: {object_name}",
            object_name=object_name,
        )
        return {"status": "success", "message": "Preview cache cleared", "object_name": object_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear preview cache failed for {object_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear preview cache")
