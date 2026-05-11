from fastapi import APIRouter, HTTPException
from app.services.task_queue import get_task_status
from app.models.schemas import TaskResponse

router = APIRouter()

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    task = await get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
