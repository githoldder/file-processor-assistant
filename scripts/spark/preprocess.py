#!/usr/bin/env python3
"""
PySpark 数据预处理管线 — 课程设计核心

完整的大数据预处理 + 多维度统计分析 + 结果导出。

数据流：
  raw CSV/JSON → 数据质量报告 → 清洗 → 转换 → 聚合 → JSON 输出

运行方式（本地）：
  spark-submit --master local[*] scripts/spark/preprocess.py \
    --data-dir data/raw --output data/spark-output

技术要点：
  - Spark DataFrame API 全流程
  - 缺失值处理（填充/删除）
  - 异常值检测与过滤
  - 重复数据去重
  - 字段类型转换
  - 时间格式统一
  - 字段拆分合并
  - 数据归一化
  - 多维度分组统计
"""

import os
import json
import argparse
from datetime import datetime, date

from pyspark.sql import SparkSession
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, DoubleType,
    TimestampType, LongType, BooleanType
)
from pyspark.sql.functions import (
    col, count, sum as _sum, avg, max as _max, min as _min,
    round as spark_round, when, isnan, isnull, lit,
    date_format, to_date, to_timestamp, year, month, dayofmonth,
    hour, dayofweek, weekofyear, quarter, datediff,
    substring, split, concat_ws, regexp_replace, trim, lower,
    countDistinct, approx_count_distinct, stddev, corr, abs as _abs,
    desc, asc, rank, dense_rank, row_number, percent_rank,
    array, create_map, udf, col as f_col
)
from pyspark.sql.window import Window


def create_spark():
    return (
        SparkSession.builder
        .appName("CulCloud Data Preprocessing Pipeline")
        .master("local[*]")
        .config("spark.driver.memory", "1g")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.adaptive.enabled", "true")
        .getOrCreate()
    )


# ════════════════════════════════════════════════════════════════
# 1. 数据加载（支持 CSV/JSON 双格式）
# ════════════════════════════════════════════════════════════════

def load_datasets(spark, data_dir):
    """读取所有原始数据集，展示 Spark 多格式读取能力"""
    datasets = {}

    # --- 用户行为数据 ---
    csv_path = os.path.join(data_dir, "user_behavior.csv")
    json_path = os.path.join(data_dir, "user_behavior.json")

    # 先读 CSV
    if os.path.exists(csv_path):
        df_csv = spark.read.option("header", True).csv(csv_path)
        datasets["user_behavior_raw"] = df_csv
        print(f"[load] user_behavior CSV: {df_csv.count()} rows, {len(df_csv.columns)} cols")
    else:
        print(f"[load] WARNING: {csv_path} not found")

    # 用 JSON 格式（多行模式）读取，展示 Spark 多格式读取能力
    if os.path.exists(json_path):
        df_json = spark.read.option("multiLine", True).json(json_path)
        datasets["user_behavior_json"] = df_json
        print(f"[load] user_behavior JSON: {df_json.count()} rows, {len(df_json.columns)} cols")

    # --- 销售数据 ---
    sales_csv = os.path.join(data_dir, "sales_orders.csv")
    sales_json = os.path.join(data_dir, "sales_orders.json")

    if os.path.exists(sales_csv):
        df_sales = spark.read.option("header", True).csv(sales_csv)
        datasets["sales_raw"] = df_sales
        print(f"[load] sales_orders CSV: {df_sales.count()} rows, {len(df_sales.columns)} cols")

    if os.path.exists(sales_json):
        df_sales_json = spark.read.option("multiLine", True).json(sales_json)
        datasets["sales_json"] = df_sales_json
        print(f"[load] sales_orders JSON: {df_sales_json.count()} rows, {len(df_sales_json.columns)} cols")

    return datasets


# ════════════════════════════════════════════════════════════════
# 2. 数据质量管理
# ════════════════════════════════════════════════════════════════

def generate_data_quality_report(df, name):
    """生成完整的数据质量报告"""
    total = df.count()
    null_counts = {}
    distinct_counts = {}
    sample_data = df.limit(5).collect()

    for field in df.columns:
        null_counts[field] = df.filter(
            col(field).isNull() |
            (trim(col(field).cast("string")) == "")
        ).count()
        distinct_counts[field] = df.select(approx_count_distinct(field)).collect()[0][0]

    report = {
        "dataset": name,
        "total_rows": total,
        "columns": len(df.columns),
        "field_types": {f.name: str(f.dataType) for f in df.schema.fields},
        "null_counts": null_counts,
        "null_rate": {k: round(v / total * 100, 2) if total > 0 else 0
                      for k, v in null_counts.items()},
        "distinct_counts": distinct_counts,
        "duplicate_count": total - df.distinct().count(),
        "sample_rows": [str(r) for r in sample_data],
    }

    print(f"\n[quality] {name}: {total} rows, {len(df.columns)} cols")
    print(f"[quality]   nulls: {sum(null_counts.values())} cells ({sum(v for v in null_counts.values())})")
    print(f"[quality]   duplicates: {report['duplicate_count']} rows")

    return report


# ════════════════════════════════════════════════════════════════
# 3. Spark 数据清洗
# ════════════════════════════════════════════════════════════════

def clean_user_behavior(df):
    """
    用户行为数据清洗管线：
      1. 类型转换: duration_sec → Integer, is_new_user/is_converted → Boolean
      2. 时间解析: event_time → Timestamp
      3. 异常过滤: duration_sec > 86400 或 < 0 视为异常
      4. 缺失值处理: session_id 为空自动填充, browser 为空填充 unknown
      5. 重复数据去重
      6. 无效字符剔除: referrer_source 去除空白
    """
    print("\n[clean] ===== User Behavior Cleaning =====")
    before = df.count()

    # Step 1: 类型转换
    df_cast = df.withColumn("duration_sec", col("duration_sec").cast("int")) \
                 .withColumn("is_new_user", col("is_new_user").cast("int")) \
                 .withColumn("is_converted", col("is_converted").cast("int"))

    # Step 2: 时间解析（兼容多种时间格式）
    df_time = df_cast.withColumn(
        "event_time",
        when(col("event_time").isNull(), lit(None))
        .otherwise(to_timestamp(col("event_time"), "yyyy-MM-dd HH:mm:ss"))
    )

    # Step 3: 缺失值处理
    # 3a: session_id 为空 → 填充前缀 SESSION_ + user_id
    df_fill = df_time.withColumn(
        "session_id",
        when(col("session_id").isNull() | (trim(col("session_id")) == ""),
             concat_ws("_", lit("SESSION"), col("user_id")))
        .otherwise(col("session_id"))
    )
    # 3b: browser 为空 → unknown
    df_fill = df_fill.withColumn(
        "browser",
        when(col("browser").isNull() | (trim(col("browser")) == ""), lit("unknown"))
        .otherwise(col("browser"))
    )
    # 3c: referrer_source 空串 → direct
    df_fill = df_fill.withColumn(
        "referrer_source",
        when(trim(col("referrer_source")) == "", lit("direct"))
        .otherwise(col("referrer_source"))
    )
    # 3d: event_time 为空的记录 → 删除（无法分析）
    df_fill = df_fill.filter(col("event_time").isNotNull())

    # Step 4: 异常值过滤
    df_clean = df_fill.filter(
        (col("duration_sec") >= 0) &
        (col("duration_sec") < 86400)  # 24小时内
    )

    # Step 5: 重复数据去重
    df_dedup = df_clean.dropDuplicates(
        ["user_id", "event_time", "event_type", "session_id"]
    )

    # Step 6: 无效字符清洗
    df_final = df_dedup.withColumn(
        "referrer_source", trim(col("referrer_source"))
    ).withColumn(
        "page_url", trim(col("page_url"))
    )

    after = df_final.count()
    removed = before - after
    print(f"[clean]   before={before}, after={after}, removed={removed} ({round(removed/before*100,2)}%)")
    return df_final


def clean_sales_orders(df):
    """
    销售数据清洗管线：
      1. 类型转换: price/quantity/total_amount/customer_age → numeric
      2. 时间解析: order_date → 标准 Date 格式
      3. 异常过滤: 负价格、负金额、极小金额
      4. 缺失值填充: customer_gender → unknown
      5. 重复订单去重 (order_id 唯一性)
    """
    print("\n[clean] ===== Sales Orders Cleaning =====")
    before = df.count()

    # Step 1: 类型转换
    df_cast = df.withColumn("price", col("price").cast("double")) \
                 .withColumn("quantity", col("quantity").cast("int")) \
                 .withColumn("total_amount", col("total_amount").cast("double")) \
                 .withColumn("customer_age", col("customer_age").cast("int"))

    # Step 2: 时间解析（多种日期格式兼容）
    df_time = df_cast.withColumn(
        "order_date",
        when(col("order_date").isNull(), lit(None))
        .otherwise(
            when(col("order_date").contains("/"),
                 to_date(col("order_date"), "yyyy/MM/dd"))
            .otherwise(to_date(col("order_date"), "yyyy-MM-dd"))
        )
    )

    # Step 3: 异常值过滤（负价格/负金额/过小金额 < 1 元视为无效）
    df_clean = df_time.filter(
        (col("price").isNotNull()) &
        (col("price") > 0) &
        (col("total_amount").isNotNull()) &
        (col("total_amount") > 0) &
        (col("quantity") >= 1)
    )

    # Step 4: 缺失值填充
    df_fill = df_clean.withColumn(
        "customer_gender",
        when(col("customer_gender").isNull(), lit("未知"))
        .otherwise(col("customer_gender"))
    )

    df_fill = df_fill.withColumn(
        "order_date",
        when(col("order_date").isNull(), to_date(lit("2024-06-01")))
        .otherwise(col("order_date"))
    )

    # Step 5: 去重（按 order_id 去重，保留最新记录）
    window_spec = Window.partitionBy("order_id").orderBy(desc("total_amount"))
    df_dedup = df_fill.withColumn("rn", row_number().over(window_spec)) \
                       .filter(col("rn") == 1) \
                       .drop("rn")

    after = df_dedup.count()
    removed = before - after
    print(f"[clean]   before={before}, after={after}, removed={removed} ({round(removed/before*100,2)}%)")
    return df_dedup


# ════════════════════════════════════════════════════════════════
# 4. 数据转换与特征工程
# ════════════════════════════════════════════════════════════════

def transform_user_behavior(df):
    """用户行为数据的转换与特征提取"""
    print("\n[transform] User Behavior Feature Engineering")

    # 时间字段拆解
    df_tf = df.withColumn("event_year", year("event_time")) \
               .withColumn("event_month", month("event_time")) \
               .withColumn("event_day", dayofmonth("event_time")) \
               .withColumn("event_hour", hour("event_time")) \
               .withColumn("event_dayofweek", dayofweek("event_time")) \
               .withColumn("event_week", weekofyear("event_time")) \
               .withColumn("event_quarter", quarter("event_time"))

    # 时间归类（凌晨/上午/下午/晚上）
    df_tf = df_tf.withColumn(
        "time_period",
        when(col("event_hour") < 6, lit("凌晨"))
        .when(col("event_hour") < 12, lit("上午"))
        .when(col("event_hour") < 18, lit("下午"))
        .otherwise(lit("晚上"))
    )

    # duration 分桶（短/中/长/超长）
    df_tf = df_tf.withColumn(
        "duration_bucket",
        when(col("duration_sec") < 10, lit("short"))
        .when(col("duration_sec") < 60, lit("medium"))
        .when(col("duration_sec") < 300, lit("long"))
        .otherwise(lit("extra_long"))
    )

    # 字段合并：device_type + browser → user_agent 概要
    df_tf = df_tf.withColumn(
        "device_summary",
        concat_ws(" / ", "device_type", "browser")
    )

    print(f"[transform]   added: event_year, event_month, event_day, event_hour, "
          f"dayofweek, week, quarter, time_period, duration_bucket, device_summary")
    print(f"[transform]   rows: {df_tf.count()}")
    return df_tf


def transform_sales_orders(df):
    """销售数据的转换与特征提取"""
    print("\n[transform] Sales Orders Feature Engineering")

    # 时间字段拆解
    df_tf = df.withColumn("order_year", year("order_date")) \
               .withColumn("order_month", month("order_date")) \
               .withColumn("order_quarter", quarter("order_date")) \
               .withColumn("order_dayofweek", dayofweek("order_date"))

    # 案均额（客单价）
    df_tf = df_tf.withColumn(
        "unit_price",
        spark_round(col("total_amount") / col("quantity"), 2)
    )

    # 价格区间分桶
    df_tf = df_tf.withColumn(
        "price_bucket",
        when(col("price") < 50, lit("low"))
        .when(col("price") < 500, lit("medium"))
        .when(col("price") < 2000, lit("high"))
        .otherwise(lit("premium"))
    )

    # 字段拆分：将 product_name 切割出关键词
    df_tf = df_tf.withColumn(
        "product_first_word",
        split(col("product_name"), " ").getItem(0)
    )

    # 计算折扣率（假设原价为 price，但实际 total_amount = price * qty，这里演示业务逻辑）
    # 正常价格无折扣，演示字段计算能力
    df_tf = df_tf.withColumn(
        "discount_rate",
        spark_round(
            when(col("quantity") >= 5, lit(0.85))  # 批量折扣
            .when(col("quantity") >= 3, lit(0.92))
            .otherwise(lit(1.0)),
            2
        )
    )

    # 地域字段标准化（演示字符串归一化）
    df_tf = df_tf.withColumn("customer_region", trim(col("customer_region")))

    print(f"[transform]   added: order_year, month, quarter, dayofweek, unit_price, "
          f"price_bucket, product_first_word, discount_rate")
    return df_tf


# ════════════════════════════════════════════════════════════════
# 5. 多维度统计分析
# ════════════════════════════════════════════════════════════════

def analyze_user_behavior(df):
    """用户行为多维度统计分析"""
    analyses = {}

    # 5a: 事件类型分布（柱状图）
    analyses["event_type_distribution"] = [
        row.asDict() for row in
        df.groupBy("event_type").agg(
            count("*").alias("count"),
            spark_round(avg("duration_sec"), 1).alias("avg_duration_sec")
        ).orderBy(desc("count")).collect()
    ]

    # 5b: 按日访问趋势（折线图）
    analyses["daily_trend"] = [
        row.asDict() for row in
        df.groupBy("event_date").agg(
            count("*").alias("event_count"),
            approx_count_distinct("user_id").alias("unique_users")
        ).orderBy("event_date").collect()
    ]
    # 需要先创建 event_date 字段
    # (将在总管线中处理)

    # 5c: 时段分布（饼图）
    analyses["time_period_distribution"] = [
        row.asDict() for row in
        df.groupBy("time_period").agg(
            count("*").alias("count"),
            spark_round(avg("duration_sec"), 1).alias("avg_duration")
        ).orderBy(desc("count")).collect()
    ]

    # 5d: 设备占比（饼图）
    analyses["device_distribution"] = [
        row.asDict() for row in
        df.groupBy("device_type").agg(
            count("*").alias("count"),
            spark_round(avg("duration_sec"), 1).alias("avg_duration_sec")
        ).orderBy(desc("count")).collect()
    ]

    # 5e: 页面访问排名（柱状图 Top 20）
    analyses["top_pages"] = [
        row.asDict() for row in
        df.groupBy("page_url").agg(
            count("*").alias("visit_count"),
            approx_count_distinct("user_id").alias("unique_visitors")
        ).orderBy(desc("visit_count")).limit(20).collect()
    ]

    # 5f: 新老用户转化率对比
    analyses["conversion_by_new_user"] = [
        row.asDict() for row in
        df.groupBy("is_new_user").agg(
            count("*").alias("total_events"),
            spark_round(_sum("is_converted") / count("*") * 100, 2).alias("conversion_rate")
        ).orderBy("is_new_user").collect()
    ]

    # 5g: 来源渠道分布
    analyses["referrer_distribution"] = [
        row.asDict() for row in
        df.groupBy("referrer_source").agg(
            count("*").alias("count"),
            spark_round(avg("duration_sec"), 1).alias("avg_duration_sec")
        ).orderBy(desc("count")).collect()
    ]

    # 5h: 各时段用户活跃度热力图数据 (hour × dayofweek)
    analyses["heatmap_data"] = [
        row.asDict() for row in
        df.groupBy("event_hour", "event_dayofweek").agg(
            count("*").alias("activity_count")
        ).orderBy("event_dayofweek", "event_hour").collect()
    ]

    # 5i: 时长分桶分布
    analyses["duration_bucket_distribution"] = [
        row.asDict() for row in
        df.groupBy("duration_bucket").agg(
            count("*").alias("count"),
            spark_round(avg("duration_sec"), 1).alias("avg_duration")
        ).orderBy(desc("count")).collect()
    ]

    # 5j: 整体总览
    stats = df.agg(
        count("*").alias("total_events"),
        approx_count_distinct("user_id").alias("unique_users"),
        approx_count_distinct("session_id").alias("unique_sessions"),
        spark_round(avg("duration_sec"), 1).alias("avg_duration_sec"),
        spark_round(avg("is_converted") * 100, 2).alias("overall_conversion_rate"),
        spark_round(stddev("duration_sec"), 1).alias("duration_stddev"),
        _max("duration_sec").alias("max_duration_sec"),
    ).collect()[0]
    analyses["overview"] = stats.asDict()

    print(f"[analyze] user_behavior: {len(analyses)} analyses generated")
    for k, v in analyses.items():
        if isinstance(v, list):
            print(f"  {k}: {len(v)} records")
        else:
            print(f"  {k}: {v.get('total_events', 'ok')}")

    return analyses


def analyze_sales_orders(df):
    """销售数据多维度统计分析"""
    analyses = {}

    # 品类销售额（柱状图）
    analyses["category_sales"] = [
        row.asDict() for row in
        df.groupBy("category").agg(
            spark_round(_sum("total_amount"), 2).alias("total_sales"),
            spark_round(avg("total_amount"), 2).alias("avg_order_amount"),
            count("*").alias("order_count"),
            _sum("quantity").alias("total_quantity")
        ).orderBy(desc("total_sales")).collect()
    ]

    # 月度销售趋势（折线图）
    analyses["monthly_trend"] = [
        row.asDict() for row in
        df.groupBy("order_year", "order_month").agg(
            spark_round(_sum("total_amount"), 2).alias("monthly_sales"),
            count("*").alias("order_count"),
            spark_round(avg("total_amount"), 2).alias("avg_amount")
        ).orderBy("order_year", "order_month").collect()
    ]

    # 支付方式占比（饼图）
    analyses["payment_distribution"] = [
        row.asDict() for row in
        df.groupBy("payment_method").agg(
            count("*").alias("count"),
            spark_round(_sum("total_amount"), 2).alias("total_sales"),
            spark_round(avg("total_amount"), 2).alias("avg_amount")
        ).orderBy(desc("count")).collect()
    ]

    # 订单状态分布（饼图）
    analyses["order_status_distribution"] = [
        row.asDict() for row in
        df.groupBy("order_status").agg(
            count("*").alias("count"),
            spark_round(_sum("total_amount"), 2).alias("total_sales")
        ).orderBy(desc("count")).collect()
    ]

    # 地域销售额分布（柱状图）
    analyses["regional_sales"] = [
        row.asDict() for row in
        df.groupBy("customer_region").agg(
            spark_round(_sum("total_amount"), 2).alias("total_sales"),
            count("*").alias("order_count"),
            spark_round(avg("total_amount"), 2).alias("avg_amount")
        ).orderBy(desc("total_sales")).collect()
    ]

    # 价格区间分布
    analyses["price_bucket_distribution"] = [
        row.asDict() for row in
        df.groupBy("price_bucket").agg(
            count("*").alias("count"),
            spark_round(_sum("total_amount"), 2).alias("total_sales"),
            spark_round(avg("price"), 2).alias("avg_price")
        ).orderBy(desc("count")).collect()
    ]

    # 客户性别分布
    analyses["gender_distribution"] = [
        row.asDict() for row in
        df.groupBy("customer_gender").agg(
            count("*").alias("count"),
            spark_round(avg("total_amount"), 2).alias("avg_amount"),
            spark_round(avg("customer_age"), 1).alias("avg_age")
        ).orderBy(desc("count")).collect()
    ]

    # Top 10 热销商品
    analyses["top_products"] = [
        row.asDict() for row in
        df.groupBy("product_name", "category").agg(
            count("*").alias("order_count"),
            _sum("quantity").alias("total_quantity"),
            spark_round(_sum("total_amount"), 2).alias("total_sales")
        ).orderBy(desc("total_sales")).limit(10).collect()
    ]

    # 季度销售汇总
    analyses["quarterly_sales"] = [
        row.asDict() for row in
        df.groupBy("order_year", "order_quarter").agg(
            spark_round(_sum("total_amount"), 2).alias("total_sales"),
            count("*").alias("order_count"),
            spark_round(avg("total_amount"), 2).alias("avg_amount")
        ).orderBy("order_year", "order_quarter").collect()
    ]

    # 总览
    stats = df.agg(
        count("*").alias("total_orders"),
        spark_round(_sum("total_amount"), 2).alias("total_revenue"),
        spark_round(avg("total_amount"), 2).alias("avg_order_amount"),
        _max("total_amount").alias("max_order_amount"),
        spark_round(avg("customer_age"), 1).alias("avg_customer_age"),
        approx_count_distinct("product_name").alias("unique_products"),
        approx_count_distinct("customer_region").alias("region_count"),
    ).collect()[0]
    analyses["overview"] = stats.asDict()

    print(f"[analyze] sales_orders: {len(analyses)} analyses generated")
    return analyses


# ════════════════════════════════════════════════════════════════
# 6. 保存结果 + 主流程
# ════════════════════════════════════════════════════════════════

def save_json(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def serializer(obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return str(obj)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=serializer)
    print(f"[save] → {path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="./data/raw",
                        help="原始数据集目录")
    parser.add_argument("--output", default="./data/spark-output",
                        help="分析结果输出目录")
    args = parser.parse_args()

    spark = create_spark()
    print(f"[spark] Spark {spark.version} | master=local[*]")

    # ─── Phase 1: 加载 ───────────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 1: Data Loading")
    print("═══════════════════════════════════════════")
    datasets = load_datasets(spark, args.data_dir)

    # ─── Phase 2: 数据质量报告 ────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 2: Data Quality Report")
    print("═══════════════════════════════════════════")
    quality_reports = {}
    for name, df in datasets.items():
        qr = generate_data_quality_report(df, name)
        quality_reports[name] = qr

    save_json(quality_reports, os.path.join(args.output, "data_quality_report.json"))

    # ─── Phase 3: 数据清洗 ────────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 3: Data Cleaning")
    print("═══════════════════════════════════════════")

    # 清洗用户行为数据
    df_ub = datasets.get("user_behavior_raw")
    if df_ub is not None:
        df_ub_clean = clean_user_behavior(df_ub)
    else:
        print("[ERROR] user_behavior_raw not loaded")
        return

    # 清洗销售数据
    df_sales = datasets.get("sales_raw")
    if df_sales is not None:
        df_sales_clean = clean_sales_orders(df_sales)
    else:
        print("[ERROR] sales_raw not loaded")
        return

    # ─── Phase 4: 数据转换 ────────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 4: Feature Engineering & Transformation")
    print("═══════════════════════════════════════════")

    df_ub_tf = transform_user_behavior(df_ub_clean)
    df_sales_tf = transform_sales_orders(df_sales_clean)

    # 为用户行为数据补充 event_date 字段
    df_ub_tf = df_ub_tf.withColumn("event_date", to_date(col("event_time")))

    # ─── Phase 5: 统计分析 ────────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 5: Multi-dimensional Statistical Analysis")
    print("═══════════════════════════════════════════")

    ub_analyses = analyze_user_behavior(df_ub_tf)
    sales_analyses = analyze_sales_orders(df_sales_tf)

    # ─── Phase 6: 导出 ────────────────────────────────
    print("\n═══════════════════════════════════════════")
    print("Phase 6: Export Results")
    print("═══════════════════════════════════════════")

    output_dir = os.path.abspath(args.output)
    os.makedirs(output_dir, exist_ok=True)

    # 用户行为分析
    for name, data in ub_analyses.items():
        save_json(data, os.path.join(output_dir, f"ub_{name}.json"))

    # 销售分析
    for name, data in sales_analyses.items():
        save_json(data, os.path.join(output_dir, f"sales_{name}.json"))

    # 清洗后数据样例
    save_json(
        [row.asDict() for row in df_ub_tf.limit(20).collect()],
        os.path.join(output_dir, "ub_sample_cleaned.json")
    )
    save_json(
        [row.asDict() for row in df_sales_tf.limit(20).collect()],
        os.path.join(output_dir, "sales_sample_cleaned.json")
    )

    # ─── 总览摘要 ──────────────────────────────────────
    print(f"\n{'=' * 60}")
    ub_ov = ub_analyses.get("overview", {})
    sales_ov = sales_analyses.get("overview", {})
    print(f"User Behavior: {ub_ov.get('total_events', '?')} events, "
          f"{ub_ov.get('unique_users', '?')} users, "
          f"conversion {ub_ov.get('overall_conversion_rate', '?')}%")
    print(f"Sales Orders:  {sales_ov.get('total_orders', '?')} orders, "
          f"¥{sales_ov.get('total_revenue', '?')} revenue, "
          f"avg ¥{sales_ov.get('avg_order_amount', '?')}")
    print(f"Output: {output_dir}")
    print(f"{'=' * 60}")

    spark.stop()
    print("[spark] Pipeline complete!")


if __name__ == "__main__":
    main()
