from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import auth, convert, files, folders, tasks, system, logs, preview
from app.services.minio_client import init_minio
from app.services.task_queue import init_redis, close_redis
from app.services.health_checker import start_health_checker, stop_health_checker

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_minio()
    await init_redis()
    await start_health_checker()
    yield
    await stop_health_checker()
    await close_redis()

app = FastAPI(title="CulCloud Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(convert.router, prefix="/api/v1/convert", tags=["convert"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(folders.router, prefix="/api/v1/folders", tags=["folders"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])
app.include_router(logs.router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(preview.router, prefix="/api/v1/preview", tags=["preview"])

# PRD contract: /api/v1/files/folders is also served by the folders router
app.include_router(folders.router, prefix="/api/v1/files/folders", tags=["files"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
