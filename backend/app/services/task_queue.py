import redis.asyncio as redis
import json
from app.config import settings
from app.models.schemas import TaskStatus, TaskResponse

redis_client = None

async def init_redis():
    global redis_client
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    await redis_client.ping()

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def get_redis() -> redis.Redis:
    return redis_client

async def set_task_status(task_id: str, status: TaskStatus, result_url: str = None, error: str = None):
    client = get_redis()
    data = {
        "task_id": task_id,
        "status": status.value,
        "result_url": result_url,
        "error": error
    }
    await client.set(f"task:{task_id}", json.dumps(data), ex=86400)

    # Sync with task_tracker to make tasks visible on admin big-screen & monitor
    from app.services.task_tracker import TaskKind, TaskStatus as TrackerStatus
    from datetime import datetime
    import time

    try:
        raw = await client.hget("tasks:index", task_id)
        now_iso = datetime.utcnow().isoformat() + "Z"
        tracker_status = TrackerStatus.QUEUED
        if status == TaskStatus.PROCESSING:
            tracker_status = TrackerStatus.PROCESSING
        elif status == TaskStatus.SUCCESS:
            tracker_status = TrackerStatus.COMPLETED
        elif status == TaskStatus.FAILED:
            tracker_status = TrackerStatus.FAILED

        if not raw:
            task_obj = {
                "task_id": task_id,
                "kind": TaskKind.CONVERSION.value,
                "status": tracker_status.value,
                "params": {"result_url": result_url} if result_url else {},
                "result": {"result_url": result_url} if result_url else None,
                "error": error,
                "created_at": now_iso,
                "updated_at": now_iso,
                "started_at": now_iso if status in (TaskStatus.PROCESSING, TaskStatus.SUCCESS) else None,
                "completed_at": now_iso if status in (TaskStatus.SUCCESS, TaskStatus.FAILED) else None,
            }
            await client.hset("tasks:index", task_id, json.dumps(task_obj))
            await client.zadd("tasks:timeline", {task_id: time.time()})
            await client.zadd(f"tasks:{tracker_status.value}", {task_id: time.time()})
            if tracker_status == TrackerStatus.FAILED:
                await client.lpush("tasks:recent_failures", json.dumps({
                    "task_id": task_id,
                    "kind": TaskKind.CONVERSION.value,
                    "error": error or "Unknown error",
                    "failed_at": now_iso
                }))
                await client.ltrim("tasks:recent_failures", 0, 99)
        else:
            task_obj = json.loads(raw)
            old_status = task_obj["status"]
            task_obj["status"] = tracker_status.value
            task_obj["updated_at"] = now_iso
            if tracker_status == TrackerStatus.PROCESSING:
                task_obj["started_at"] = task_obj.get("started_at") or now_iso
                await client.zrem(f"tasks:{old_status}", task_id)
                await client.zadd("tasks:processing", {task_id: time.time()})
            elif tracker_status == TrackerStatus.COMPLETED:
                task_obj["completed_at"] = now_iso
                task_obj["result"] = {"result_url": result_url} if result_url else None
                await client.zrem(f"tasks:{old_status}", task_id)
                await client.zadd("tasks:completed", {task_id: time.time()})
            elif tracker_status == TrackerStatus.FAILED:
                task_obj["completed_at"] = now_iso
                task_obj["error"] = error
                await client.zrem(f"tasks:{old_status}", task_id)
                await client.zadd("tasks:failed", {task_id: time.time()})
                await client.lpush("tasks:recent_failures", json.dumps({
                    "task_id": task_id,
                    "kind": task_obj["kind"],
                    "error": error or "Unknown error",
                    "failed_at": now_iso
                }))
                await client.ltrim("tasks:recent_failures", 0, 99)
            await client.hset("tasks:index", task_id, json.dumps(task_obj))
    except Exception as e:
        import logging
        logger = logging.getLogger("app.services.task_queue")
        logger.warning(f"Failed to sync task {task_id} to task_tracker: {e}")

async def get_task_status(task_id: str) -> TaskResponse:
    client = get_redis()
    data_str = await client.get(f"task:{task_id}")
    if not data_str:
        return None
    data = json.loads(data_str)
    return TaskResponse(
        task_id=data["task_id"],
        status=TaskStatus(data["status"]),
        result_url=data.get("result_url"),
        error=data.get("error")
    )
