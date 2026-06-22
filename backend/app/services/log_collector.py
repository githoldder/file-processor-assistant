"""
CulCloud 操作日志采集器

从 3 个来源汇聚事件：
1. MinIO 操作事件（文件上传/删除）
2. 任务状态变更（task_tracker 回调）
3. API 请求日志（FastAPI middleware）

事件存储：
- logs:recent → Redis LIST (LPUSH + LTRIM 5000)
- logs:timeline → Redis ZSET（按时间索引）

集成方式：
- FastAPI middleware：拦截所有 API 请求
- task_tracker 回调：任务状态变更时自动记录
- 文件操作 hooks：文件上传/删除时手动调用
"""

import json
import logging
import time
from datetime import datetime
from enum import Enum
from typing import Optional

from app.services.task_queue import get_redis

logger = logging.getLogger(__name__)

MAX_EVENTS = 5000


class EventType(str, Enum):
    FILE_UPLOADED = "file_uploaded"
    FILE_DELETED = "file_deleted"
    FILE_DOWNLOADED = "file_downloaded"
    FILE_RENAMED = "file_renamed"
    FILE_MOVED = "file_moved"
    FOLDER_CREATED = "folder_created"
    FOLDER_DELETED = "folder_deleted"
    FOLDER_RENAMED = "folder_renamed"
    CONVERSION_STARTED = "conversion_started"
    CONVERSION_COMPLETED = "conversion_completed"
    CONVERSION_FAILED = "conversion_failed"
    PDF_MERGE_STARTED = "pdf_merge_started"
    PDF_MERGE_COMPLETED = "pdf_merge_completed"
    PDF_SPLIT_STARTED = "pdf_split_started"
    PDF_SPLIT_COMPLETED = "pdf_split_completed"
    PDF_REORDER_STARTED = "pdf_reorder_started"
    PDF_REORDER_COMPLETED = "pdf_reorder_completed"
    SPARK_ANALYSIS_STARTED = "spark_analysis_started"
    SPARK_ANALYSIS_COMPLETED = "spark_analysis_completed"
    SERVICE_RESTART = "service_restart"
    SERVICE_DOWN = "service_down"
    API_REQUEST = "api_request"


EVENT_DEFINITIONS = {
    EventType.FILE_UPLOADED: {
        "category": "file",
        "resource_type": "file",
        "action": "uploaded",
        "severity": "success",
        "title_zh": "文件上传成功",
        "title_en": "File uploaded",
    },
    EventType.FILE_DELETED: {
        "category": "file",
        "resource_type": "file",
        "action": "deleted",
        "severity": "info",
        "title_zh": "文件已删除",
        "title_en": "File deleted",
    },
    EventType.FILE_DOWNLOADED: {
        "category": "file",
        "resource_type": "file",
        "action": "downloaded",
        "severity": "info",
        "title_zh": "文件已下载",
        "title_en": "File downloaded",
    },
    EventType.FILE_RENAMED: {
        "category": "file",
        "resource_type": "file",
        "action": "renamed",
        "severity": "info",
        "title_zh": "文件已重命名",
        "title_en": "File renamed",
    },
    EventType.FILE_MOVED: {
        "category": "file",
        "resource_type": "file",
        "action": "moved",
        "severity": "info",
        "title_zh": "文件已移动",
        "title_en": "File moved",
    },
    EventType.FOLDER_CREATED: {
        "category": "folder",
        "resource_type": "folder",
        "action": "created",
        "severity": "success",
        "title_zh": "文件夹创建成功",
        "title_en": "Folder created",
    },
    EventType.FOLDER_DELETED: {
        "category": "folder",
        "resource_type": "folder",
        "action": "deleted",
        "severity": "info",
        "title_zh": "文件夹已删除",
        "title_en": "Folder deleted",
    },
    EventType.FOLDER_RENAMED: {
        "category": "folder",
        "resource_type": "folder",
        "action": "renamed",
        "severity": "info",
        "title_zh": "文件夹已重命名",
        "title_en": "Folder renamed",
    },
    EventType.CONVERSION_STARTED: {
        "category": "conversion",
        "resource_type": "task",
        "action": "started",
        "severity": "info",
        "title_zh": "转换任务已开始",
        "title_en": "Conversion started",
    },
    EventType.CONVERSION_COMPLETED: {
        "category": "conversion",
        "resource_type": "task",
        "action": "completed",
        "severity": "success",
        "title_zh": "文件转换成功",
        "title_en": "Conversion completed",
    },
    EventType.CONVERSION_FAILED: {
        "category": "conversion",
        "resource_type": "task",
        "action": "failed",
        "severity": "error",
        "title_zh": "文件转换失败",
        "title_en": "Conversion failed",
    },
    EventType.PDF_REORDER_COMPLETED: {
        "category": "pdf",
        "resource_type": "pdf",
        "action": "exported",
        "severity": "success",
        "title_zh": "PDF 导出成功",
        "title_en": "PDF exported",
    },
    EventType.PDF_MERGE_COMPLETED: {
        "category": "pdf",
        "resource_type": "pdf",
        "action": "merged",
        "severity": "success",
        "title_zh": "PDF 合并成功",
        "title_en": "PDF merged",
    },
    EventType.PDF_SPLIT_COMPLETED: {
        "category": "pdf",
        "resource_type": "pdf",
        "action": "split",
        "severity": "success",
        "title_zh": "PDF 拆分成功",
        "title_en": "PDF split",
    },
}


async def log_event(
    event_type: EventType,
    message: str,
    *,
    user_id: Optional[str] = None,
    file_name: Optional[str] = None,
    file_size: Optional[int] = None,
    task_id: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    """记录一条事件到 Redis"""
    client = get_redis()
    if client is None:
        logger.warning("Redis unavailable, event dropped: %s", event_type.value)
        return

    now_ts = time.time()
    now_iso = datetime.utcnow().isoformat() + "Z"
    definition = EVENT_DEFINITIONS.get(event_type, {})

    event = {
        "type": event_type.value,
        "message": message,
        "timestamp": now_iso,
        "category": definition.get("category", "system"),
        "resource_type": definition.get("resource_type", "system"),
        "action": definition.get("action", event_type.value),
        "severity": definition.get("severity", "info"),
        "title_zh": definition.get("title_zh", event_type.value),
        "title_en": definition.get("title_en", event_type.value),
        "user_id": user_id,
        "file_name": file_name,
        "file_size": file_size,
        "task_id": task_id,
        "metadata": metadata or {},
    }

    event_json = json.dumps(event)

    # 推入最近事件列表
    await client.lpush("logs:recent", event_json)
    await client.ltrim("logs:recent", 0, MAX_EVENTS - 1)

    # 推入时间线（ZSET，按时间索引）
    await client.zadd("logs:timeline", {event_json: now_ts})


async def get_recent_events(limit: int = 20) -> list[dict]:
    """获取最近的事件"""
    client = get_redis()
    if client is None:
        return []
    raw = await client.lrange("logs:recent", 0, limit - 1)
    return [json.loads(v) for v in raw]


async def get_events_timeline(
    start_ts: Optional[float] = None,
    end_ts: Optional[float] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """按时间范围查询事件"""
    client = get_redis()
    if client is None:
        return []

    start = start_ts or 0
    end = end_ts or time.time()

    raw = await client.zrevrangebyscore("logs:timeline", end, start, start=0, num=limit)
    events = [json.loads(v) for v in raw]

    if event_type:
        events = [e for e in events if e["type"] == event_type]

    return events


async def get_event_stats(hours: int = 24) -> dict:
    """统计过去 N 小时的事件"""
    client = get_redis()
    if client is None:
        return {"total": 0, "by_type": {}}

    cutoff = time.time() - hours * 3600
    raw = await client.zrangebyscore("logs:timeline", cutoff, "+inf")

    by_type: dict[str, int] = {}
    for event_json in raw:
        event = json.loads(event_json)
        t = event.get("type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "total": sum(by_type.values()),
        "hours": hours,
        "by_type": by_type,
    }


async def cleanup_old_events(retention_days: int = 7):
    """清理超过保留天数的旧事件"""
    client = get_redis()
    if client is None:
        return

    cutoff = time.time() - retention_days * 86400
    removed = await client.zremrangebyscore("logs:timeline", 0, cutoff)
    if removed:
        logger.info("Cleaned up %d old events (older than %d days)", removed, retention_days)
