"""
操作日志路由
"""

from fastapi import APIRouter, Query
from app.services.log_collector import (
    get_recent_events,
    get_events_timeline,
    get_event_stats,
)

router = APIRouter()


@router.get("/recent")
async def logs_recent(limit: int = Query(50, ge=1, le=200)):
    """获取最近的事件"""
    events = await get_recent_events(limit=limit)
    return {"events": events, "count": len(events)}


@router.get("/timeline")
async def logs_timeline(
    hours: int = Query(24, ge=1, le=168, description="查询过去 N 小时"),
    event_type: str | None = Query(None, description="按事件类型过滤"),
    limit: int = Query(50, ge=1, le=200),
):
    """按时间范围查询事件时间线"""
    import time

    end_ts = time.time()
    start_ts = end_ts - hours * 3600

    events = await get_events_timeline(
        start_ts=start_ts, end_ts=end_ts, event_type=event_type, limit=limit
    )
    return {"events": events, "hours": hours, "count": len(events)}


@router.get("/stats")
async def logs_stats(hours: int = Query(24, ge=1, le=168)):
    """事件统计摘要"""
    return await get_event_stats(hours=hours)
