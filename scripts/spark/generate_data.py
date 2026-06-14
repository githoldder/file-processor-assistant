#!/usr/bin/env python3
"""
生成模拟数据集 — 课程设计专用

输出两份数据集（均包含刻意引入的数据质量问题）：
  1. 用户行为数据 (100k rows) → data/raw/user_behavior.csv
  2. 销售订单数据 (10k rows)  → data/raw/sales_orders.csv

每个数据集包含：清洗前的原始数据（含 null/异常），
以及对应的 JSON 格式副本。
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

# ─── 工具函数 ──────────────────────────────────────────────

def rand_date(start, end):
    """生成 start~end 之间的随机日期"""
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def chance(p):
    """以概率 p 返回 True"""
    return random.random() < p


def pick_region():
    return random.choice([
        "华东", "华南", "华北", "华中", "西南", "西北", "东北"
    ])


def pick_device():
    return random.choices(
        ["mobile", "desktop", "tablet"], weights=[0.55, 0.35, 0.10]
    )[0]


def pick_browser():
    return random.choice(["Chrome", "Safari", "Edge", "Firefox", "QQ Browser"])


def pick_payment():
    return random.choice(["微信支付", "支付宝", "银行卡", "信用卡"])


# ════════════════════════════════════════════════════════════════
# 数据集 A: 用户行为日志 (100,000 rows)
# ════════════════════════════════════════════════════════════════

USER_FIELDS = [
    "user_id", "event_time", "event_type", "page_url", "session_id",
    "duration_sec", "device_type", "browser", "region", "is_new_user",
    "referrer_source", "is_converted"
]

EVENT_TYPES = ["page_view", "click", "add_to_cart", "purchase", "search", "logout"]
REFERRERS = ["direct", "搜索引擎", "社交媒体", "广告投放", "邮件营销", "外部链接"]
PAGES = [
    "/home", "/products", "/product/{id}", "/cart", "/checkout",
    "/search", "/category/electronics", "/category/clothing",
    "/category/food", "/profile", "/orders", "/promotions"
]


def gen_user_behavior_row(user_idx):
    """生成一条用户行为记录，约 5% 含缺失值"""
    uid = f"U{user_idx:07d}"

    # 刻意引入缺失值（~5% 概率）
    if chance(0.05):
        event_time = None
    else:
        dt = rand_date(datetime(2024, 6, 1), datetime(2025, 5, 31))
        # 随机时分秒，模拟真实日志分布
        event_time = dt.replace(
            hour=random.randint(0, 23),
            minute=random.randint(0, 59),
            second=random.randint(0, 59)
        ).strftime("%Y-%m-%d %H:%M:%S")

    event_type = random.choice(EVENT_TYPES)

    # page url 可能含产品 ID
    page = random.choice(PAGES)
    if "{id}" in page:
        page = page.replace("{id}", str(random.randint(1, 500)))

    session_id = str(uuid.uuid4())[:8] if chance(0.98) else None  # ~2% 缺失
    duration = random.randint(1, 600)

    # 异常值：万分之一的异常长会话
    if chance(0.0001):
        duration = random.randint(10000, 99999)

    device = pick_device()
    browser = pick_browser() if chance(0.97) else None  # ~3% 缺失
    region = pick_region()

    # referrer_source 空串模拟脏数据
    ref = random.choice(REFERRERS) if chance(0.95) else ""

    is_new = 1 if chance(0.3) else 0
    is_conv = 1 if event_type == "purchase" else 0

    return [
        uid, event_time, event_type, page, session_id,
        duration, device, browser, region, is_new,
        ref, is_conv
    ]


# ════════════════════════════════════════════════════════════════
# 数据集 B: 销售订单数据 (10,000 rows)
# ════════════════════════════════════════════════════════════════

SALES_FIELDS = [
    "order_id", "product_name", "category", "subcategory", "price",
    "quantity", "total_amount", "order_date", "customer_region",
    "payment_method", "order_status", "customer_age", "customer_gender"
]

PRODUCTS = {
    "电子产品": ["iPhone 15", "MacBook Air", "AirPods Pro", "iPad Air", "Apple Watch",
                  "Samsung Galaxy S24", "Dell XPS 15", "Sony WH-1000XM5", "Kindle Paperwhite",
                  "罗技 MX Master 3"],
    "服装": ["Nike Air Max", "Adidas Ultraboost", "Levi's 501", "优衣库羽绒服",
              "Zara 西装外套", "H&M 连衣裙", "北面冲锋衣", "New Balance 574"],
    "食品": ["三只松鼠坚果礼盒", "良品铺子零食包", "德芙巧克力", "星巴克咖啡豆",
              "农夫山泉", "蒙牛纯牛奶", "茅台酒", "百威啤酒"],
    "家居": ["宜家书架", "小米台灯", "网易严选床垫", "美的电饭煲",
              "戴森吸尘器", "九阳豆浆机", "小熊加湿器"],
    "图书": ["三体全集", "人类简史", "思考快与慢", "原则",
              "深入理解计算机系统", "算法导论", "Python编程从入门到实践"],
}

CATEGORIES = list(PRODUCTS.keys())
STATUSES = ["completed", "completed", "completed", "completed", "completed",
            "completed", "pending", "pending", "cancelled", "refunded"]  # ~60% completed

GENDERS = ["男", "女", None]  # ~33% 缺失


def gen_sales_row(order_idx):
    """生成一条销售记录"""
    oid = f"ORD{order_idx:06d}"

    cat = random.choice(CATEGORIES)
    sub_cats = list(PRODUCTS[cat])
    product = random.choice(sub_cats)

    price = round(random.uniform(9.9, 9999.0), 2)

    # 异常价格
    if chance(0.002):
        price = -price  # 负价格（异常）

    qty = random.randint(1, 10)
    amount = round(price * qty, 2)

    dt = rand_date(datetime(2024, 1, 1), datetime(2025, 6, 1))
    # 随机时间戳，模拟交易分散
    order_date = dt.replace(
        hour=random.randint(8, 22),
        minute=random.randint(0, 59),
        second=random.randint(0, 59)
    ).strftime("%Y/%m/%d")  # 使用斜杠格式，后续 Spark 统一转换

    region = pick_region()
    payment = pick_payment()
    status = random.choice(STATUSES)

    # 年龄区间 18-65
    age = random.randint(18, 65)
    gender = random.choice(GENDERS)

    return [oid, product, cat, cat[:2] + cat[-2:], price, qty, amount,
            order_date, region, payment, status, age, gender]


# ════════════════════════════════════════════════════════════════
# 写入 CSV
# ════════════════════════════════════════════════════════════════

def write_csv(path, fields, rows, label):
    print(f"[generate] Generating {len(rows)} rows of {label} data ...")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for row in rows:
            writer.writerow(row)
    size = os.path.getsize(path) / (1024 * 1024)
    print(f"[generate] → {path} ({len(rows)} rows, {size:.1f} MB)")


def write_json(path, fields, rows, label):
    """同时输出 JSON 格式（演示 Spark 多格式读取能力）"""
    records = [dict(zip(fields, row)) for row in rows]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(path) / (1024 * 1024)
    print(f"[generate] → {path} ({len(rows)} rows, {size:.1f} MB)")


def main():
    print("=" * 60)
    print("CulCloud — 模拟数据生成器")
    print("=" * 60)
    print(f"Output: {OUTPUT_DIR}")

    # 数据集 A: 用户行为
    rows_a = [gen_user_behavior_row(i) for i in range(100_000)]
    write_csv(os.path.join(OUTPUT_DIR, "user_behavior.csv"), USER_FIELDS, rows_a, "user behavior")
    write_json(os.path.join(OUTPUT_DIR, "user_behavior.json"), USER_FIELDS, rows_a, "user behavior")

    # 数据集 B: 销售订单
    rows_b = [gen_sales_row(i) for i in range(10_000)]
    write_csv(os.path.join(OUTPUT_DIR, "sales_orders.csv"), SALES_FIELDS, rows_b, "sales orders")
    write_json(os.path.join(OUTPUT_DIR, "sales_orders.json"), SALES_FIELDS, rows_b, "sales orders")

    print("=" * 60)
    print("Done! Use spark-submit to run preprocess.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
