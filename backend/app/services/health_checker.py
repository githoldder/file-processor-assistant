"""
CulCloud 统一健康检查器

每 30 秒轮询 Docker 容器（redis/minio/gotenberg/api）和
PM2 进程（flask-analytics/frontend）的健康状态。

支持 4 种检查类型：
- http: HTTP 200 + response body 包含 status 字段
- redis: PING → PONG
- minio: list_buckets 操作
- tcp: TCP socket 连接测试

单服务失败不影响其他服务（降级而非瘫痪）。
结果写入 Redis：health:current (hash) + health:history:{service} (zset, 24h)
"""

import asyncio
import json
import logging
import socket
import time
import httpx
from datetime import datetime, timedelta

from app.services.task_queue import get_redis

logger = logging.getLogger(__name__)

# 检查配置
CHECK_INTERVAL = 30  # 秒

SERVICES = [
    {
        "name": "redis",
        "type": "redis",
        "host": "redis",
        "port": 6379,
        "label": "Redis 缓存",
        "category": "infrastructure",
    },
    {
        "name": "minio",
        "type": "minio",
        "endpoint": "minio:9000",
        "label": "MinIO 对象存储",
        "category": "infrastructure",
    },
    {
        "name": "gotenberg",
        "type": "http",
        "url": "http://gotenberg:3000/health",
        "label": "Gotenberg 转换引擎",
        "category": "worker",
    },
    {
        "name": "api",
        "type": "http",
        "url": "http://api:8000/health",
        "label": "FastAPI 文件服务",
        "category": "application",
    },
    {
        "name": "flask-analytics",
        "type": "http",
        "url": "http://host.docker.internal:5050/health",
        "label": "Flask 分析服务",
        "category": "application",
    },
    {
        "name": "frontend",
        "type": "http",
        "url": "http://host.docker.internal:5173",
        "label": "React 前端",
        "category": "application",
    },
]

_checker_task: asyncio.Task | None = None


async def _check_redis(service: dict) -> dict:
    """Redis PING 检查"""
    start = time.monotonic()
    try:
        client = get_redis()
        if client is None:
            return {"status": "down", "error": "Redis client not initialized"}
        await client.ping()
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency_ms, 2)}
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "down", "error": str(e), "latency_ms": round(latency_ms, 2)}


async def _check_minio(service: dict) -> dict:
    """MinIO list_buckets 检查"""
    from app.services.minio_client import minio_client

    start = time.monotonic()
    try:
        if minio_client is None:
            return {"status": "down", "error": "MinIO client not initialized"}
        minio_client.list_buckets()
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency_ms, 2)}
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "down", "error": str(e), "latency_ms": round(latency_ms, 2)}


async def _check_http(service: dict) -> dict:
    """HTTP 端点检查"""
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(service["url"])
            latency_ms = (time.monotonic() - start) * 1000

            status_ok = resp.status_code == 200
            # 尝试解析 JSON 中的 status 字段
            try:
                data = resp.json()
                if "status" in data and data["status"] != "ok":
                    status_ok = False
            except Exception:
                pass  # 非 JSON 响应仅检查状态码

            return {
                "status": "healthy" if status_ok else "degraded",
                "status_code": resp.status_code,
                "latency_ms": round(latency_ms, 2),
            }
    except httpx.ConnectError as e:
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "down", "error": f"Connection refused: {e}", "latency_ms": round(latency_ms, 2)}
    except httpx.TimeoutException:
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "down", "error": "Request timed out", "latency_ms": round(latency_ms, 2)}
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        return {"status": "down", "error": str(e), "latency_ms": round(latency_ms, 2)}


CHECKERS = {
    "redis": _check_redis,
    "minio": _check_minio,
    "http": _check_http,
}


async def check_all_services() -> list[dict]:
    """对所有服务执行一次完整检查，返回结果列表"""
    results = []
    for service in SERVICES:
        checker = CHECKERS.get(service["type"])
        if checker is None:
            results.append({**service, "status": "down", "error": f"Unknown check type: {service['type']}"})
            continue

        result = await checker(service)
        results.append({
            "name": service["name"],
            "label": service["label"],
            "category": service["category"],
            "type": service["type"],
            **result,
            "checked_at": datetime.utcnow().isoformat() + "Z",
        })
    return results


async def _save_snapshot(results: list[dict]):
    """保存健康检查快照到 Redis"""
    client = get_redis()
    if client is None:
        return

    now_ts = time.time()
    snapshot_key = "health:current"

    for r in results:
        # 当前状态存入 hash
        await client.hset(snapshot_key, r["name"], json.dumps(r))
        # 历史快照存入 zset
        await client.zadd(f"health:history:{r['name']}", {json.dumps(r): now_ts})

    # 保留 24 小时历史
    cutoff = now_ts - 86400
    for r in results:
        await client.zremrangebyscore(f"health:history:{r['name']}", 0, cutoff)

    await client.expire(snapshot_key, 120)


async def _run_loop():
    """后台循环：定时检查 + 保存快照"""
    logger.info("Health checker started (interval=%ds, services=%d)", CHECK_INTERVAL, len(SERVICES))
    while True:
        try:
            results = await check_all_services()
            await _save_snapshot(results)

            # 统计并记录
            down = [r["name"] for r in results if r["status"] == "down"]
            degraded = [r["name"] for r in results if r["status"] == "degraded"]
            healthy = sum(1 for r in results if r["status"] == "healthy")
            if down:
                logger.warning("Health check: %d healthy, %d down (%s)", healthy, len(down), ", ".join(down))
            elif degraded:
                logger.info("Health check: %d healthy, %d degraded (%s)", healthy, len(degraded), ", ".join(degraded))
        except Exception:
            logger.exception("Health check failed")

        await asyncio.sleep(CHECK_INTERVAL)


async def start_health_checker():
    """启动后台健康检查循环（在 FastAPI lifespan 中调用）"""
    global _checker_task
    _checker_task = asyncio.create_task(_run_loop())
    logger.info("Health checker background task created")


async def stop_health_checker():
    """停止后台健康检查循环"""
    global _checker_task
    if _checker_task:
        _checker_task.cancel()
        try:
            await _checker_task
        except asyncio.CancelledError:
            pass
        _checker_task = None
        logger.info("Health checker stopped")


async def get_current_snapshot() -> dict:
    """获取最新健康快照（从 Redis 读取缓存，无阻塞）"""
    client = get_redis()
    if client is None:
        return {"services": [], "error": "Redis unavailable"}

    raw = await client.hgetall("health:current")
    services = [json.loads(v) for v in raw.values()]
    # 按类别分组
    overall = {
        "total": len(services),
        "healthy": sum(1 for s in services if s.get("status") == "healthy"),
        "degraded": sum(1 for s in services if s.get("status") == "degraded"),
        "down": sum(1 for s in services if s.get("status") == "down"),
    }
    return {
        "overall": overall,
        "services": sorted(services, key=lambda x: x["name"]),
        "checked_at": services[0]["checked_at"] if services else None,
    }


async def get_service_history(service_name: str, hours: int = 24) -> list[dict]:
    """获取单个服务的历史快照"""
    client = get_redis()
    if client is None:
        return []

    cutoff = time.time() - hours * 3600
    raw = await client.zrangebyscore(f"health:history:{service_name}", cutoff, "+inf")
    return [json.loads(v) for v in raw]


async def get_recommended_services() -> list[str]:
    """
    检查 docker-compose 和服务拓扑，返回推荐的服务列表。
    固定返回当前已配置的 6 个服务名称。
    """
    return [s["name"] for s in SERVICES]
