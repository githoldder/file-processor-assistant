"""
系统健康 + 集群总览路由
"""

from fastapi import APIRouter, Query
from app.services.health_checker import (
    get_current_snapshot,
    get_service_history,
)

router = APIRouter()


@router.get("/health")
async def system_health():
    """
    全服务健康状态。
    返回所有已注册服务的实时健康快照（从 Redis 缓存读取）。
    """
    return await get_current_snapshot()


@router.get("/health/history/{service_name}")
async def service_health_history(
    service_name: str,
    hours: int = Query(24, ge=1, le=168, description="查询过去 N 小时的历史"),
):
    """
    获取单个服务的健康历史快照。
    """
    history = await get_service_history(service_name, hours=hours)
    return {"service": service_name, "hours": hours, "snapshots": history}
