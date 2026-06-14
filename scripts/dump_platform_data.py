#!/usr/bin/env python3
"""
平台运维数据导出脚本

从 Redis 和 MinIO 导出原始数据为 CSV，供 PySpark 离线分析使用。
运行方式：
  python3 scripts/dump_platform_data.py [--output ./data/raw]

输出：
  data/raw/tasks.csv         任务执行记录
  data/raw/objects.csv       对象存储元数据
"""

import os
import sys
import csv
import json
import argparse
from datetime import datetime

# 将 backend 目录加入路径，复用其 config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.config import settings


def dump_tasks(output_dir):
    """导出 Redis 任务数据到 CSV"""
    import redis
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    filepath = os.path.join(output_dir, "tasks.csv")
    rows = 0

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["task_id", "status", "result_url", "error", "exported_at"])

        now = datetime.now().isoformat()
        for key in client.scan_iter("task:*"):
            data_str = client.get(key)
            if data_str:
                task = json.loads(data_str)
                writer.writerow([
                    task.get("task_id", ""),
                    task.get("status", ""),
                    task.get("result_url", ""),
                    task.get("error", ""),
                    now,
                ])
                rows += 1

    print(f"[tasks] exported {rows} records → {filepath}")
    client.close()


def dump_objects(output_dir):
    """导出 MinIO 对象元数据到 CSV"""
    from minio import Minio

    endpoint = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
    client = Minio(
        endpoint,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=False,
    )

    filepath = os.path.join(output_dir, "objects.csv")
    rows = 0

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "object_name", "size_bytes", "size_mb", "extension",
            "content_type", "last_modified", "etag",
        ])

        for obj in client.list_objects(settings.MINIO_BUCKET, recursive=True):
            ext = ""
            if "." in obj.object_name:
                ext = obj.object_name.rsplit(".", 1)[-1].lower()

            writer.writerow([
                obj.object_name,
                obj.size,
                round(obj.size / (1024 * 1024), 3),
                ext,
                obj.content_type or "unknown",
                obj.last_modified.isoformat() if obj.last_modified else "",
                obj.etag or "",
            ])
            rows += 1

    print(f"[objects] exported {rows} records → {filepath}")


def main():
    parser = argparse.ArgumentParser(description="Dump platform data for Spark analysis")
    parser.add_argument("--output", default="./data/raw", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    print(f"[dump] starting export to {args.output}")
    print(f"[dump] Redis URL: {settings.REDIS_URL}")
    print(f"[dump] MinIO: {settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}")

    try:
        dump_tasks(args.output)
    except Exception as e:
        print(f"[ERROR] tasks dump failed: {e}")

    try:
        dump_objects(args.output)
    except Exception as e:
        print(f"[ERROR] objects dump failed: {e}")

    print("[dump] done")


if __name__ == "__main__":
    main()
