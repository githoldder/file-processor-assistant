from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import convert, files, tasks
from app.services.minio_client import init_minio
from app.services.task_queue import init_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_minio()
    await init_redis()
    yield
    await close_redis()

app = FastAPI(title="CulCloud Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert.router, prefix="/api/v1/convert", tags=["convert"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
