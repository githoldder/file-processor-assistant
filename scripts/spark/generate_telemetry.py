#!/usr/bin/env python3
"""
CulCloud 文件处理遥测数据生成器

生成一百万条文件处理操作日志，替代原有的 user_behavior/sales_orders 数据集。
每条记录对应一次真实 CulCloud 平台操作：上传、转换、下载、预览、删除。

Schema:
  - event_id: UUID
  - timestamp: 操作时间
  - user_id: 用户标识
  - action: upload | convert | download | preview | delete
  - file_name: 文件名
  - file_type: 文件类型扩展名
  - file_size_bytes: 文件大小
  - status: success | failed
  - processing_time_ms: 处理耗时
  - conversion_type: 转换类型（仅 convert 动作）
  - source_format: 源格式（仅 convert 动作）
  - target_format: 目标格式（仅 convert 动作）
  - error_type: 错误类型（仅 failed 状态）
  - region: 地域
  - device_type: 设备类型

输出：data/raw/telemetry_*.csv / .json
"""

import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── 配置 ──────────────────────────────────────────────

TOTAL_ROWS = 100_000
START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2026, 6, 1)

# 文件类型分布（权重）
FILE_TYPES = {
    "pdf": 28, "docx": 18, "xlsx": 12, "pptx": 6,
    "png": 10, "jpg": 8, "txt": 6, "csv": 5,
    "md": 3, "zip": 2, "html": 2,
}

FILE_NAMES = {
    "pdf": ["report_{}", "presentation_{}", "contract_{}", "manual_{}", "thesis_{}", "invoice_{}", "form_{}"],
    "docx": ["proposal_{}", "letter_{}", "resume_{}", "meeting_notes_{}", "spec_{}", "agreement_{}"],
    "xlsx": ["budget_{}", "data_export_{}", "statistics_{}", "inventory_{}", "financial_{}", "grades_{}"],
    "pptx": ["slides_{}", "demo_{}", "training_{}", "pitch_{}", "lecture_{}"],
    "png": ["screenshot_{}", "diagram_{}", "chart_{}", "logo_{}", "ui_design_{}"],
    "jpg": ["photo_{}", "scan_{}", "image_{}", "background_{}"],
    "txt": ["notes_{}", "readme_{}", "log_{}", "summary_{}"],
    "csv": ["dataset_{}", "export_{}", "backup_{}"],
    "md": ["readme_{}", "changelog_{}", "docs_{}", "api_{}"],
    "zip": ["archive_{}", "backup_{}", "release_{}"],
    "html": ["page_{}", "template_{}", "report_{}"],
}

# 操作类型分布
ACTIONS = ["upload", "convert", "download", "preview", "delete"]
ACTION_WEIGHTS = [30, 25, 20, 15, 10]

# 转换类型（仅对 convert 动作）
CONVERSIONS = [
    ("docx", "pdf"), ("xlsx", "pdf"), ("pptx", "pdf"),
    ("pdf", "png"), ("pdf", "html"),
    ("png", "jpg"), ("jpg", "png"), ("svg", "png"),
    ("csv", "xlsx"), ("md", "pdf"), ("md", "html"),
    ("pdf", "pdf"),  # PDF merge/split
]
CONVERSION_WEIGHTS = [25, 18, 12, 10, 5, 8, 6, 3, 3, 4, 3, 3]

# 地域分布
REGIONS = ["华东", "华南", "华北", "华中", "西南", "西北", "东北", "港澳台", "海外"]
REGION_WEIGHTS = [25, 20, 18, 12, 10, 5, 5, 3, 2]

# 设备类型
DEVICES = ["desktop", "mobile", "tablet"]
DEVICE_WEIGHTS = [55, 30, 15]

# 失败率 ~5%
FAILURE_RATE = 0.05

# 错误类型
ERROR_TYPES = [
    "文件格式不支持", "文件损坏无法解析", "转换超时",
    "存储空间不足", "文件大小超出限制", "并发限制",
    "权限不足", "未知错误",
]
ERROR_WEIGHTS = [25, 20, 15, 12, 10, 8, 5, 5]


def rand_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def chance(p):
    return random.random() < p


def weighted_choice(options, weights):
    total = sum(weights)
    r = random.random() * total
    for opt, w in zip(options, weights):
        r -= w
        if r <= 0:
            return opt
    return options[-1]


def gen_telemetry_row(idx):
    user_id = f"U{random.randint(1, 5000):05d}"

    dt = rand_date(START_DATE, END_DATE)
    hour = random.choices(
        range(24),
        weights=[1, 1, 1, 1, 1, 1, 1, 3, 5, 8, 9, 8, 4, 7, 8, 9, 8, 6, 4, 3, 2, 1, 1, 1]
    )[0]
    timestamp = dt.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
    ts_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")

    action = weighted_choice(ACTIONS, ACTION_WEIGHTS)

    file_type = weighted_choice(list(FILE_TYPES.keys()), list(FILE_TYPES.values()))
    name_tpl = random.choice(FILE_NAMES[file_type])
    file_name = f"{name_tpl.format(random.randint(1000, 9999))}.{file_type}"

    size_ranges = {
        "pdf": (50000, 5000000), "docx": (20000, 2000000), "xlsx": (30000, 3000000),
        "pptx": (100000, 5000000), "png": (100000, 3000000), "jpg": (50000, 2000000),
        "txt": (1000, 200000), "csv": (5000, 1000000),
        "md": (1000, 100000), "zip": (500000, 20000000), "html": (10000, 500000),
    }
    lo, hi = size_ranges.get(file_type, (1000, 1000000))
    file_size = random.randint(lo, hi)

    is_failed = chance(FAILURE_RATE)
    status = "failed" if is_failed else "success"

    processing_time = 0
    if action == "upload":
        processing_time = random.randint(200, 5000)
    elif action == "convert":
        processing_time = random.randint(1000, 30000)
    elif action == "download":
        processing_time = random.randint(100, 2000)
    elif action == "preview":
        processing_time = random.randint(50, 1500)
    elif action == "delete":
        processing_time = random.randint(50, 500)

    if is_failed and action == "convert":
        processing_time = random.randint(500, 8000)

    conversion_type = ""
    source_format = ""
    target_format_val = ""
    if action == "convert":
        src, tgt = weighted_choice(CONVERSIONS, CONVERSION_WEIGHTS)
        conversion_type = f"{src}_to_{tgt}"
        source_format = src
        target_format_val = tgt

    error_type = ""
    if is_failed:
        error_type = weighted_choice(ERROR_TYPES, ERROR_WEIGHTS)

    region = weighted_choice(REGIONS, REGION_WEIGHTS)
    device = weighted_choice(DEVICES, DEVICE_WEIGHTS)

    event_id = str(uuid.uuid4())

    return [
        event_id, ts_str, user_id, action, file_name, file_type,
        file_size, status, processing_time,
        conversion_type, source_format, target_format_val,
        error_type, region, device,
    ]


FIELDS = [
    "event_id", "timestamp", "user_id", "action", "file_name", "file_type",
    "file_size_bytes", "status", "processing_time_ms",
    "conversion_type", "source_format", "target_format",
    "error_type", "region", "device_type",
]


def write_csv(path, fields, rows, label):
    print(f"[generate] Generating {len(rows)} rows of {label} ...")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for row in rows:
            writer.writerow(row)
    size = os.path.getsize(path) / (1024 * 1024)
    print(f"[generate] → {path} ({len(rows)} rows, {size:.1f} MB)")


def write_json(path, fields, rows, label):
    records = [dict(zip(fields, row)) for row in rows]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(path) / (1024 * 1024)
    print(f"[generate] → {path} ({len(rows)} rows, {size:.1f} MB)")


def main():
    print("=" * 60)
    print("CulCloud — 文件处理遥测数据生成器")
    print("=" * 60)
    print(f"Output: {OUTPUT_DIR}")
    print(f"Rows: {TOTAL_ROWS:,}")

    rows = [gen_telemetry_row(i) for i in range(TOTAL_ROWS)]

    write_csv(os.path.join(OUTPUT_DIR, "telemetry.csv"), FIELDS, rows, "file telemetry")
    write_json(os.path.join(OUTPUT_DIR, "telemetry.json"), FIELDS, rows, "file telemetry")

    success = sum(1 for r in rows if r[7] == "success")
    failed = TOTAL_ROWS - success
    print(f"[generate] success={success}, failed={failed}, rate={success/TOTAL_ROWS*100:.1f}%")

    actions_dist = {}
    for r in rows:
        a = r[3]
        actions_dist[a] = actions_dist.get(a, 0) + 1
    for a, c in sorted(actions_dist.items(), key=lambda x: -x[1]):
        print(f"[generate]   {a}: {c} ({c/TOTAL_ROWS*100:.1f}%)")

    format_dist = {}
    for r in rows:
        ft = r[5]
        format_dist[ft] = format_dist.get(ft, 0) + 1
    print("\n[generate] File type distribution:")
    for ft, c in sorted(format_dist.items(), key=lambda x: -x[1]):
        print(f"[generate]   .{ft}: {c} ({c/TOTAL_ROWS*100:.1f}%)")

    print("=" * 60)
    print("Done! Use spark-submit to run culcloud_analytics.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
