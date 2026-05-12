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
