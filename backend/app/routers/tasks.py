from fastapi import APIRouter, HTTPException, Query
from app.services.task_queue import get_task_status
from app.services.task_tracker import (
    get_task,
    list_tasks,
    get_queue_length,
    get_task_stats,
    get_cluster_overview,
    get_recent_failures,
    TaskKind,
    TaskStatus,
)
from app.models.schemas import TaskResponse, TaskStatus as SchemaStatus

router = APIRouter()

def _map_status(status_str: str) -> SchemaStatus:
    mapping = {
        "queued": SchemaStatus.PENDING,
        "processing": SchemaStatus.PROCESSING,
        "completed": SchemaStatus.SUCCESS,
        "failed": SchemaStatus.FAILED,
        "pending": SchemaStatus.PENDING,
        "success": SchemaStatus.SUCCESS,
    }
    return mapping.get(status_str, SchemaStatus.PENDING)

# ---- 队列长度 ----

@router.get("/queue-length")
async def queue_length():
    return {"queue_length": await get_queue_length()}


# ---- 任务统计 ----

@router.get("/stats")
async def task_stats():
    return await get_task_stats()


# ---- 集群总览 ----

@router.get("/cluster/overview")
async def cluster_overview():
    return await get_cluster_overview()


# ---- 最近失败 ----

@router.get("/recent-failures")
async def recent_failures(limit: int = Query(20, ge=1, le=100)):
    return {"failures": await get_recent_failures(limit)}


# ---- 单任务查询 ----

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_by_id(task_id: str):
    task = await get_task(task_id)
    if not task:
        task_q = await get_task_status(task_id)
        if not task_q:
            raise HTTPException(status_code=404, detail="Task not found")
        return task_q

    result_url = None
    if isinstance(task.get("result"), dict):
        result_url = task["result"].get("result_url")
    elif isinstance(task.get("result"), str):
        result_url = task["result"]

    return TaskResponse(
        task_id=task["task_id"],
        status=_map_status(task["status"]),
        result_url=result_url,
        error=task.get("error")
    )


# ---- 任务列表（分页+过滤） ----

@router.get("")
async def get_task_list(
    status: str | None = Query(None, description="Filter by status: queued/processing/completed/failed"),
    kind: str | None = Query(None, description="Filter by kind: conversion/pdf_merge/pdf_split/spark_analysis"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    status_filter = None
    kind_filter = None
    try:
        if status:
            status_filter = TaskStatus(status)
        if kind:
            kind_filter = TaskKind(kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    items, total = await list_tasks(status=status_filter, kind=kind_filter, offset=offset, limit=limit)
    return {"items": items, "total": total, "offset": offset, "limit": limit}
