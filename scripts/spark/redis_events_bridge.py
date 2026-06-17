#!/usr/bin/env python3
"""
CulCloud Redis Events → Telemetry CSV Bridge

从 Redis logs:timeline 读取实时操作事件，
映射为 telemetry.csv 格式后合并写入，再触发 Spark 重跑。

运行:
  python scripts/spark/redis_events_bridge.py

依赖:
  pip install redis
"""

import csv
import json
import os
import sys
import time
import uuid
from datetime import datetime
from typing import Optional

import redis as sync_redis

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
SPARK_OUTPUT_DIR = os.path.join(BASE_DIR, "data", "spark-output")
TELEMETRY_CSV = os.path.join(RAW_DIR, "telemetry.csv")
REDIS_EVENTS_CSV = os.path.join(RAW_DIR, "redis_events.csv")
LAST_SYNC_KEY = "bridge:last_sync_ts"

FIELDS = [
    "event_id", "timestamp", "user_id", "action", "file_name", "file_type",
    "file_size_bytes", "status", "processing_time_ms",
    "conversion_type", "source_format", "target_format",
    "error_type", "region", "device_type",
]

EVENT_TYPE_TO_ACTION = {
    "file_uploaded": "upload",
    "file_downloaded": "download",
    "file_deleted": "delete",
    "conversion_started": "convert",
    "conversion_completed": "convert",
    "conversion_failed": "convert",
    "pdf_merge_started": "convert",
    "pdf_merge_completed": "convert",
    "pdf_split_started": "convert",
    "pdf_split_completed": "convert",
    "pdf_reorder_started": "convert",
    "pdf_reorder_completed": "convert",
    "api_request": "preview",
}

FAILED_EVENT_TYPES = {"conversion_failed", "service_down"}

FILE_TYPE_FROM_NAME = {
    ".pdf": "pdf", ".docx": "docx", ".doc": "docx",
    ".xlsx": "xlsx", ".xls": "xlsx",
    ".pptx": "pptx", ".ppt": "pptx",
    ".png": "png", ".jpg": "jpg", ".jpeg": "jpg",
    ".txt": "txt", ".csv": "csv",
    ".md": "md", ".zip": "zip", ".html": "html",
}


def get_redis_client(redis_url: Optional[str] = None):
    if redis_url:
        return sync_redis.from_url(redis_url, decode_responses=True)
    candidates = [
        os.environ.get("REDIS_URL", ""),
        "redis://localhost:6379/0",
        "redis://redis:6379/0",
    ]
    for url in candidates:
        if url:
            try:
                client = sync_redis.from_url(url, decode_responses=True, socket_timeout=3)
                client.ping()
                print(f"[bridge] Connected to Redis: {url}")
                return client
            except Exception:
                continue
    print("[bridge] WARNING: No Redis available, will generate synthetic events")
    return None


def read_last_sync(client) -> float:
    if client is None:
        return 0
    ts = client.get(LAST_SYNC_KEY)
    return float(ts) if ts else 0


def save_last_sync(client, ts: float):
    if client is None:
        return
    client.set(LAST_SYNC_KEY, str(ts))


def fetch_redis_events(client, since_ts: float) -> list[dict]:
    if client is None:
        return generate_synthetic_events(since_ts)
    now = time.time()
    raw = client.zrangebyscore("logs:timeline", since_ts, now)
    events = []
    for item in raw:
        try:
            events.append(json.loads(item))
        except json.JSONDecodeError:
            continue
    print(f"[bridge] Fetched {len(events)} events from Redis (since {datetime.fromtimestamp(since_ts).isoformat()})")
    return events


def guess_file_type(file_name: str) -> str:
    if not file_name:
        return "pdf"
    _, ext = os.path.splitext(file_name)
    return FILE_TYPE_FROM_NAME.get(ext.lower(), "pdf")


def map_event_to_telemetry(event: dict, idx: int) -> list:
    event_type = event.get("type", "api_request")
    action = EVENT_TYPE_TO_ACTION.get(event_type, "preview")
    is_failed = event_type in FAILED_EVENT_TYPES
    status = "failed" if is_failed else "success"
    error = event.get("metadata", {}).get("error", "") if is_failed else ""

    ts_str = event.get("timestamp", datetime.utcnow().isoformat() + "Z")
    if ts_str.endswith("Z"):
        ts_str = ts_str[:-1].replace("T", " ")
    else:
        ts_str = ts_str.replace("T", " ")[:19]

    file_name = event.get("file_name", f"file_{idx}.pdf")
    file_type = guess_file_type(file_name)
    file_size = event.get("file_size", 1024 * 1024)
    user_id = event.get("user_id", f"U{5000 + idx:05d}")

    processing_time = event.get("metadata", {}).get("processing_time_ms", 0)
    if not processing_time:
        processing_time = {
            "upload": 1500, "download": 500, "delete": 200,
            "convert": 8000, "preview": 300,
        }.get(action, 500)

    conv_type = ""
    src = ""
    tgt = ""
    if action == "convert" and "conversion" in event_type:
        conv_type = event.get("metadata", {}).get("conversion_type", "docx_to_pdf")
        src = event.get("metadata", {}).get("source_format", "docx")
        tgt = event.get("metadata", {}).get("target_format", "pdf")

    return [
        str(uuid.uuid4()), ts_str, user_id, action, file_name, file_type,
        file_size, status, processing_time,
        conv_type, src, tgt,
        error, "online", "desktop",
    ]


def generate_synthetic_events(since_ts: float) -> list[dict]:
    print("[bridge] Generating synthetic events for demo")
    now = time.time()
    count = max(0, int((now - since_ts) / 60))
    if count > 200:
        count = 200
    events = []
    actions = ["file_uploaded", "file_downloaded", "conversion_completed", "file_uploaded", "api_request"]
    for i in range(count):
        events.append({
            "type": actions[i % len(actions)],
            "message": f"synthetic event {i}",
            "timestamp": datetime.fromtimestamp(now - count * 60 + i * 60).isoformat() + "Z",
            "user_id": f"U{i % 50 + 5000:05d}",
            "file_name": f"synth_{i}.pdf",
            "file_size": 1024 * 1024 * (1 + (i % 5)),
        })
    print(f"[bridge] Generated {len(events)} synthetic events")
    return events


def write_events_csv(events: list[dict], path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rows = [map_event_to_telemetry(e, i) for i, e in enumerate(events)]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(FIELDS)
        for row in rows:
            writer.writerow(row)
    print(f"[bridge] Wrote {len(rows)} events → {path}")


def merge_csvs(main_path: str, delta_path: str, output_path: str):
    if not os.path.exists(delta_path):
        print(f"[bridge] No delta file at {delta_path}, skipping merge")
        return False
    if not os.path.exists(main_path):
        os.rename(delta_path, main_path)
        print(f"[bridge] No main CSV, promoted delta → {main_path}")
        return True

    rows = []
    with open(main_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows.extend(reader)
    main_count = len(rows)

    with open(delta_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        _ = next(reader)
        rows.extend(reader)
    delta_count = len(rows) - main_count

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(FIELDS)
        for row in rows:
            writer.writerow(row)

    print(f"[bridge] Merged: main={main_count} + delta={delta_count} → total={len(rows)}")
    return True


def run_spark(input_csv: str, output_dir: str):
    script = os.path.join(os.path.dirname(__file__), "culcloud_analytics.py")
    cmd = (
        f'spark-submit --master local[*] '
        f'"{script}" '
        f'--input "{input_csv}" '
        f'--output "{output_dir}"'
    )
    print(f"[bridge] Running Spark: {cmd}")
    ret = os.system(cmd)
    if ret == 0:
        print("[bridge] Spark analysis completed successfully")
    else:
        print(f"[bridge] Spark analysis failed (exit={ret})")
    return ret == 0


def main():
    redis_url = os.environ.get("REDIS_URL", "")
    client = get_redis_client(redis_url) if redis_url else get_redis_client()

    last_sync = read_last_sync(client)
    print(f"[bridge] Last sync: {datetime.fromtimestamp(last_sync).isoformat() if last_sync else 'never'}")

    events = fetch_redis_events(client, last_sync)
    if not events:
        print("[bridge] No new events, skipping")
        return

    write_events_csv(events, REDIS_EVENTS_CSV)
    merged = merge_csvs(TELEMETRY_CSV, REDIS_EVENTS_CSV, TELEMETRY_CSV)

    if merged:
        run_spark(TELEMETRY_CSV, SPARK_OUTPUT_DIR)

    now = time.time()
    save_last_sync(client, now)
    print(f"[bridge] Last sync updated to {datetime.fromtimestamp(now).isoformat()}")


if __name__ == "__main__":
    main()
