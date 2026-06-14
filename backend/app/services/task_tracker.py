"""
CulCloud 统一异步任务追踪器

管理所有异步任务的完整生命周期：
queued → processing → completed / failed

特性：
- UUID 任务 ID，Redis hash 存储完整任务对象
- 分页查询、状态过滤、队列长度统计、集群总览
- 任务类型枚举：conversion / pdf_merge / pdf_split / spark_analysis
- 非法状态转换记录 warning 不抛异常
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional

from app.services.task_queue import get_redis

logger = logging.getLogger(__name__)


class TaskKind(str, Enum):
    CONVERSION = "conversion"
    PDF_MERGE = "pdf_merge"
    PDF_SPLIT = "pdf_split"
    PDF_REORDER = "pdf_reorder"
    SPARK_ANALYSIS = "spark_analysis"


class TaskStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# 合法状态转换
ALLOWED_TRANSITIONS = {
    TaskStatus.QUEUED: {TaskStatus.PROCESSING, TaskStatus.FAILED},
    TaskStatus.PROCESSING: {TaskStatus.COMPLETED, TaskStatus.FAILED},
    TaskStatus.COMPLETED: set(),   # 终态
    TaskStatus.FAILED: set(),      # 终态
}

TASK_TTL = 86400 * 7  # 7 天


async def create_task(kind: TaskKind, params: dict) -> str:
    """创建新任务，返回 task_id"""
    client = get_redis()
    if client is None:
        raise RuntimeError("Redis unavailable")

    task_id = uuid.uuid4().hex
    now = datetime.utcnow()
    task = {
        "task_id": task_id,
        "kind": kind.value,
        "status": TaskStatus.QUEUED.value,
        "params": params,
        "result": None,
        "error": None,
        "created_at": now.isoformat() + "Z",
        "updated_at": now.isoformat() + "Z",
        "started_at": None,
        "completed_at": None,
    }

    # 存储任务对象
    await client.hset("tasks:index", task_id, json.dumps(task))
    # 加入排队集合
    await client.zadd("tasks:queued", {task_id: time.time()})
    # 加入全量时间索引
    await client.zadd("tasks:timeline", {task_id: time.time()})

    logger.info("Task created: %s (%s)", task_id, kind.value)
    return task_id


async def update_status(task_id: str, new_status: TaskStatus, result: dict = None, error: str = None) -> dict:
    """更新任务状态（带非法转换检查）"""
    client = get_redis()
    if client is None:
        raise RuntimeError("Redis unavailable")

    task = await get_task(task_id)
    if task is None:
        raise ValueError(f"Task not found: {task_id}")

    current_status = TaskStatus(task["status"])

    # 检查状态转换合法性
    if new_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        logger.warning(
            "Illegal status transition: %s -> %s (task %s)",
            current_status.value, new_status.value, task_id,
        )
        # 不抛异常，但仍记录并继续（防止生产中的偶发重复调用）

    now = datetime.utcnow()
    task["status"] = new_status.value
    task["updated_at"] = now.isoformat() + "Z"

    if new_status == TaskStatus.PROCESSING:
        task["started_at"] = task.get("started_at") or (now.isoformat() + "Z")
        # 从排队集合移到处理中集合
        await client.zrem("tasks:queued", task_id)
        await client.zadd("tasks:processing", {task_id: time.time()})

    elif new_status == TaskStatus.COMPLETED:
        task["completed_at"] = now.isoformat() + "Z"
        task["result"] = result
        await client.zrem("tasks:processing", task_id)
        await client.zadd("tasks:completed", {task_id: time.time()})

    elif new_status == TaskStatus.FAILED:
        task["completed_at"] = now.isoformat() + "Z"
        task["error"] = error
        await client.zrem("tasks:queued", task_id)
        await client.zrem("tasks:processing", task_id)
        await client.zadd("tasks:failed", {task_id: time.time()})

        # 记录失败日志
        await client.lpush("tasks:recent_failures", json.dumps({
            "task_id": task_id,
            "kind": task["kind"],
            "error": error,
            "failed_at": now.isoformat() + "Z",
        }))
        await client.ltrim("tasks:recent_failures", 0, 99)

    # 保存更新
    await client.hset("tasks:index", task_id, json.dumps(task))
    logger.info("Task %s: %s -> %s", task_id, current_status.value, new_status.value)
    return task


async def get_task(task_id: str) -> dict | None:
    """获取单个任务"""
    client = get_redis()
    if client is None:
        return None
    raw = await client.hget("tasks:index", task_id)
    return json.loads(raw) if raw else None


async def list_tasks(
    status: TaskStatus | None = None,
    kind: TaskKind | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """分页查询任务列表，返回 (tasks, total)"""
    client = get_redis()
    if client is None:
        return [], 0

    # 按时间倒序获取所有任务 ID
    all_ids = await client.zrevrange("tasks:timeline", 0, -1)

    tasks = []
    for task_id in all_ids:
        task = await get_task(task_id)
        if task is None:
            continue
        if status and task["status"] != status.value:
            continue
        if kind and task["kind"] != kind.value:
            continue
        tasks.append(task)

    total = len(tasks)
    return tasks[offset : offset + limit], total


async def get_queue_length() -> int:
    """获取排队中的任务数量"""
    client = get_redis()
    if client is None:
        return 0
    return await client.zcard("tasks:queued")


async def get_task_stats() -> dict:
    """获取任务统计摘要"""
    client = get_redis()
    if client is None:
        return {"total": 0, "queued": 0, "processing": 0, "completed": 0, "failed": 0}

    queued = await client.zcard("tasks:queued")
    processing = await client.zcard("tasks:processing")
    completed = await client.zcard("tasks:completed")
    failed = await client.zcard("tasks:failed")

    return {
        "total": queued + processing + completed + failed,
        "queued": queued,
        "processing": processing,
        "completed": completed,
        "failed": failed,
    }


async def get_cluster_overview() -> dict:
    """集群总览：任务统计 + 最近 24h 转换量"""
    stats = await get_task_stats()

    # 过去 24 小时任务数
    client = get_redis()
    conversions_24h = 0
    if client:
        cutoff = time.time() - 86400
        conversions_24h = await client.zcount("tasks:timeline", cutoff, "+inf")

    return {
        "total_tasks": stats["total"],
        "active_tasks": stats["processing"],
        "queued_tasks": stats["queued"],
        "completed_tasks": stats["completed"],
        "failed_tasks": stats["failed"],
        "conversions_24h": conversions_24h,
    }


async def get_recent_failures(limit: int = 20) -> list[dict]:
    """获取最近失败的任务"""
    client = get_redis()
    if client is None:
        return []
    raw = await client.lrange("tasks:recent_failures", 0, limit - 1)
    return [json.loads(v) for v in raw]
