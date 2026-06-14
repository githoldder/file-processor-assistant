"""
PySpark 离线分析脚本 - 文件存储统计

从 dump_platform_data.py 导出的 CSV 读取数据，
执行 PySpark DataFrame 清洗、转换、聚合，输出 JSON 供 Flask API 使用。

运行方式：
  spark-submit --master local[*] scripts/spark/file_stats.py \
    --input data/raw/objects.csv \
    --output data/spark-output/
"""

import os
import json
import argparse
from datetime import datetime

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, count, sum as _sum, avg, max as _max, min as _min,
    date_format, to_date, desc, round as spark_round,
)


def create_spark():
    return (
        SparkSession.builder
        .appName("CulCloud Platform Analytics")
        .master("local[*]")
        .config("spark.driver.memory", "512m")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )


def analyze_file_types(df):
    """文件类型分布：按扩展名分组"""
    result = (
        df.groupBy("extension")
        .agg(
            count("*").alias("count"),
            spark_round(_sum("size_mb"), 2).alias("total_size_mb"),
        )
        .orderBy(desc("count"))
        .limit(20)
    )
    return [row.asDict() for row in result.collect()]


def analyze_storage_trend(df):
    """存储趋势：按日聚合"""
    df_with_date = df.withColumn("date", to_date(col("last_modified")))
    result = (
        df_with_date.groupBy("date")
        .agg(
            count("*").alias("file_count"),
            spark_round(_sum("size_mb"), 2).alias("total_size_mb"),
        )
        .orderBy("date")
    )
    return [row.asDict() for row in result.collect()]


def analyze_overview(df):
    """平台总览"""
    stats = df.agg(
        count("*").alias("total_files"),
        spark_round(_sum("size_bytes"), 0).alias("total_size_bytes"),
        spark_round(_sum("size_mb"), 2).alias("total_size_mb"),
        spark_round(avg("size_mb"), 2).alias("avg_size_mb"),
        spark_round(_max("size_mb"), 2).alias("max_size_mb"),
        spark_round(_min("size_mb"), 2).alias("min_size_mb"),
    ).collect()[0]

    result = stats.asDict()
    # 任务统计字段留给 tasks analysis 脚本填充
    result["total_tasks"] = 0
    result["success_tasks"] = 0
    result["failed_tasks"] = 0
    result["processing_tasks"] = 0
    result["success_rate"] = 0
    return result


def analyze_top_files(df, limit=10):
    """Top N 最大文件"""
    result = (
        df.select("object_name", "size_mb", "content_type", "last_modified", "extension")
        .orderBy(desc("size_mb"))
        .limit(limit)
    )
    return [row.asDict() for row in result.collect()]


def save_json(data, path):
    """输出 JSON 文件"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # 处理 date/datetime 类型
    def default_serializer(obj):
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        return str(obj)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=default_serializer)
    print(f"[spark] saved → {path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input CSV path (objects.csv)")
    parser.add_argument("--output", default="./data/spark-output", help="Output directory for JSON")
    args = parser.parse_args()

    spark = create_spark()
    print(f"[spark] Spark version: {spark.version}")

    # 读取数据
    df = spark.read.option("header", True).csv(args.input)

    # Schema 修正
    df = df.withColumn("size_bytes", col("size_bytes").cast("long"))
    df = df.withColumn("size_mb", col("size_mb").cast("double"))

    # 数据质量报告
    total_rows = df.count()
    null_last_mod = df.filter(col("last_modified").isNull()).count()
    print(f"[spark] rows={total_rows}, null_last_modified={null_last_mod}")

    # 过滤无效记录
    df_clean = df.filter(
        col("last_modified").isNotNull() &
        (col("size_bytes") > 0)
    )
    print(f"[spark] clean rows={df_clean.count()}")

    # 执行分析
    analyses = {
        "overview": analyze_overview(df_clean),
        "file_types": analyze_file_types(df_clean),
        "storage_trend": analyze_storage_trend(df_clean),
        "top_files": analyze_top_files(df_clean),
    }

    # 输出
    os.makedirs(args.output, exist_ok=True)
    for name, data in analyses.items():
        save_json(data, os.path.join(args.output, f"{name}.json"))

    # 打印摘要
    ov = analyses["overview"]
    print(f"[spark] overview: {ov['total_files']} files, {ov['total_size_mb']} MB")
    print(f"[spark] file_types: {len(analyses['file_types'])} categories")
    print(f"[spark] storage_trend: {len(analyses['storage_trend'])} days")

    spark.stop()
    print("[spark] done")


if __name__ == "__main__":
    main()
