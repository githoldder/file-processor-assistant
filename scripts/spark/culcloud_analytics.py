#!/usr/bin/env python3
"""
CulCloud 文件处理平台 PySpark 分析管线

从 telemetry.csv 读取文件处理遥测数据，执行多维度聚合分析，
输出 JSON 供 Flask API 和大屏使用。

运行:
  spark-submit --master local[*] scripts/spark/culcloud_analytics.py \
    --input data/raw/telemetry.csv --output data/spark-output

输出 JSON:
  - telemetry_overview.json        : 平台总览指标
  - format_distribution.json       : 文件类型分布
  - action_distribution.json       : 操作类型分布
  - conversion_stats.json          : 转换成功率/类型分布
  - traffic_trend.json             : 时间序列吞吐趋势
  - hourly_pattern.json            : 时段吞吐模式
  - daily_trend.json               : 日粒度趋势
  - storage_growth.json            : 存储增长曲线
  - user_activity.json             : 用户活跃度
  - error_analysis.json            : 失败/错误分析
  - conversion_matrix.json         : 转换矩阵（源→目标）
  - quality_report.json            : 数据质量报告
  - region_distribution.json       : 地域分布
  - device_distribution.json       : 设备分布
  - error_heatmap.json             : 7×24 错误热力图矩阵
  - sample_cleaned.json            : 清洗后样例
"""

import os
import json
import argparse
from datetime import datetime, date

from pyspark.sql import SparkSession
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, LongType,
    TimestampType, DoubleType
)
from pyspark.sql.functions import (
    col, count, sum as _sum, avg, max as _max, min as _min,
    round as spark_round, when, isnan, isnull, lit,
    date_format, to_date, to_timestamp, year, month, dayofmonth,
    hour, dayofweek, weekofyear, quarter, datediff,
    countDistinct, stddev, desc, asc
)


def create_spark():
    return (
        SparkSession.builder
        .appName("CulCloud Platform Analytics")
        .master("local[*]")
        .config("spark.driver.memory", "1g")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )


def read_telemetry(spark, path):
    schema = StructType([
        StructField("event_id", StringType()),
        StructField("timestamp", StringType()),
        StructField("user_id", StringType()),
        StructField("action", StringType()),
        StructField("file_name", StringType()),
        StructField("file_type", StringType()),
        StructField("file_size_bytes", LongType()),
        StructField("status", StringType()),
        StructField("processing_time_ms", LongType()),
        StructField("conversion_type", StringType()),
        StructField("source_format", StringType()),
        StructField("target_format", StringType()),
        StructField("error_type", StringType()),
        StructField("region", StringType()),
        StructField("device_type", StringType()),
    ])
    df = spark.read.option("header", True).schema(schema).csv(path)
    return df.withColumn("ts", to_timestamp(col("timestamp"), "yyyy-MM-dd HH:mm:ss"))


def save_json(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def default(obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return str(obj)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=default)
    print(f"[spark] saved → {path}")


def analyze_overview(df):
    total = df.count()
    success = df.filter(col("status") == "success").count()
    failed = df.filter(col("status") == "failed").count()
    total_size = df.agg(_sum("file_size_bytes")).collect()[0][0] or 0
    avg_size = df.agg(avg("file_size_bytes")).collect()[0][0] or 0
    unique_users = df.select("user_id").distinct().count()
    unique_files = df.select("file_name").distinct().count()
    total_processing_time = df.agg(_sum("processing_time_ms")).collect()[0][0] or 0
    avg_processing_time = df.agg(avg("processing_time_ms")).collect()[0][0] or 0

    result = {
        "total_events": total,
        "success_count": success,
        "failed_count": failed,
        "success_rate": round(success / total * 100, 2) if total else 0,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "avg_size_bytes": round(avg_size, 2),
        "unique_users": unique_users,
        "unique_files": unique_files,
        "total_processing_time_ms": total_processing_time,
        "avg_processing_time_ms": round(avg_processing_time, 2),
    }
    return result


def analyze_format_distribution(df):
    result = (
        df.groupBy("file_type")
        .agg(
            count("*").alias("count"),
            _sum("file_size_bytes").alias("total_bytes"),
            spark_round(avg("file_size_bytes"), 0).alias("avg_bytes"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success_count"),
        )
        .withColumn("success_rate", spark_round(col("success_count") / col("count") * 100, 1))
        .orderBy(desc("count"))
    )
    return [row.asDict() for row in result.collect()]


def analyze_action_distribution(df):
    result = (
        df.groupBy("action")
        .agg(
            count("*").alias("count"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success_count"),
        )
        .withColumn("success_rate", spark_round(col("success_count") / col("count") * 100, 1))
        .orderBy(desc("count"))
    )
    return [row.asDict() for row in result.collect()]


def analyze_conversion_stats(df):
    convert_df = df.filter(col("action") == "convert")
    total = convert_df.count()
    if total == 0:
        return {"total_conversions": 0, "success_rate": 0, "by_type": []}

    by_type = (
        convert_df.groupBy("conversion_type", "source_format", "target_format")
        .agg(
            count("*").alias("count"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success_count"),
        )
        .withColumn("success_rate", spark_round(col("success_count") / col("count") * 100, 1))
        .orderBy(desc("count"))
    )
    success = convert_df.filter(col("status") == "success").count()
    return {
        "total_conversions": total,
        "success_count": success,
        "failed_count": total - success,
        "success_rate": round(success / total * 100, 2) if total else 0,
        "by_type": [row.asDict() for row in by_type.collect()],
    }


def analyze_traffic_trend(df):
    result = (
        df.withColumn("date_hour", date_format(col("ts"), "yyyy-MM-dd HH:00"))
        .groupBy("date_hour")
        .agg(
            count("*").alias("events"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success"),
            _sum(when(col("status") == "failed", 1).otherwise(0)).alias("failed"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
        )
        .orderBy("date_hour")
    )
    return [row.asDict() for row in result.collect()]


def analyze_hourly_pattern(df):
    result = (
        df.withColumn("hour", hour("ts"))
        .groupBy("hour")
        .agg(
            count("*").alias("events"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
        )
        .orderBy("hour")
    )
    return [{"hour": int(row["hour"]), "events": row["events"], "avg_time_ms": row["avg_time_ms"]}
            for row in result.collect()]


def analyze_daily_trend(df):
    result = (
        df.withColumn("date", to_date("ts"))
        .groupBy("date")
        .agg(
            count("*").alias("events"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success"),
            _sum(when(col("status") == "failed", 1).otherwise(0)).alias("failed"),
            spark_round(_sum("file_size_bytes") / (1024 * 1024), 2).alias("size_mb"),
        )
        .orderBy("date")
    )
    return [row.asDict() for row in result.collect()]


def analyze_storage_growth(df):
    upload_df = df.filter(col("action") == "upload")
    result = (
        upload_df.withColumn("date", to_date("ts"))
        .groupBy("date")
        .agg(
            count("*").alias("files_added"),
            spark_round(_sum("file_size_bytes") / (1024 * 1024), 2).alias("size_added_mb"),
        )
        .orderBy("date")
    )
    rows = [row.asDict() for row in result.collect()]
    cumulative = 0
    for r in rows:
        cumulative += r["size_added_mb"]
        r["cumulative_size_mb"] = round(cumulative, 2)
    return rows


def analyze_user_activity(df):
    result = (
        df.groupBy("user_id")
        .agg(
            count("*").alias("total_actions"),
            countDistinct("action").alias("action_types"),
            _sum(when(col("action") == "upload", 1).otherwise(0)).alias("uploads"),
            _sum(when(col("action") == "convert", 1).otherwise(0)).alias("conversions"),
            _sum(when(col("action") == "download", 1).otherwise(0)).alias("downloads"),
            _sum(when(col("status") == "failed", 1).otherwise(0)).alias("failures"),
        )
        .orderBy(desc("total_actions"))
    )
    rows = [row.asDict() for row in result.collect()]
    return {
        "total_users": len(rows),
        "most_active": rows[:10],
        "avg_actions_per_user": round(sum(r["total_actions"] for r in rows) / len(rows), 1) if rows else 0,
    }


def analyze_errors(df):
    failed = df.filter(col("status") == "failed")
    total_failed = failed.count()
    if total_failed == 0:
        return {"total_failed": 0, "by_error_type": [], "by_file_type": []}

    by_error = (
        failed.groupBy("error_type")
        .agg(count("*").alias("count"))
        .orderBy(desc("count"))
    )
    by_file = (
        failed.groupBy("file_type")
        .agg(
            count("*").alias("count"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
        )
        .orderBy(desc("count"))
    )
    return {
        "total_failed": total_failed,
        "failure_rate": round(total_failed / df.count() * 100, 2),
        "by_error_type": [row.asDict() for row in by_error.collect()],
        "by_file_type": [row.asDict() for row in by_file.collect()],
    }


def analyze_conversion_matrix(df):
    convert_df = df.filter(col("action") == "convert")
    result = (
        convert_df.groupBy("source_format", "target_format")
        .agg(
            count("*").alias("count"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success_count"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
        )
        .withColumn("success_rate", spark_round(col("success_count") / col("count") * 100, 1))
        .orderBy(desc("count"))
    )
    return [row.asDict() for row in result.collect()]


def analyze_quality_report(df):
    total = df.count()
    null_timestamps = df.filter(col("ts").isNull()).count()
    null_users = df.filter(col("user_id").isNull()).count()
    null_file_types = df.filter(col("file_type").isNull()).count()
    negative_sizes = df.filter(col("file_size_bytes") <= 0).count()
    null_actions = df.filter(col("action").isNull()).count()
    null_status = df.filter(col("status").isNull()).count()

    return {
        "total_rows": total,
        "valid_rows": total - (null_timestamps + null_users + null_file_types + null_actions + null_status),
        "null_timestamps": null_timestamps,
        "null_users": null_users,
        "null_file_types": null_file_types,
        "negative_or_zero_size": negative_sizes,
        "null_actions": null_actions,
        "null_status": null_status,
        "quality_score": round(
            (1 - (null_timestamps + null_users + null_file_types + negative_sizes + null_actions + null_status) / max(total, 1)) * 100, 2
        ),
    }


def analyze_region_distribution(df):
    result = (
        df.groupBy("region")
        .agg(
            count("*").alias("events"),
            _sum(when(col("status") == "success", 1).otherwise(0)).alias("success_count"),
        )
        .withColumn("success_rate", spark_round(col("success_count") / col("events") * 100, 1))
        .orderBy(desc("events"))
    )
    return [row.asDict() for row in result.collect()]


def analyze_device_distribution(df):
    result = (
        df.groupBy("device_type")
        .agg(
            count("*").alias("events"),
            spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"),
        )
        .orderBy(desc("events"))
    )
    return [row.asDict() for row in result.collect()]


def get_sample(df, n=20):
    return [row.asDict() for row in df.limit(n).collect()]


def analyze_error_heatmap(df):
    """7×24 错误热力图: day_of_week(0=Mon) × hour(0-23) 的错误计数"""
    failed = df.filter(col("status") == "failed")
    total_failed = failed.count()
    if total_failed == 0:
        return {"total_failed": 0, "matrix": []}

    result = (
        failed.withColumn("dow", dayofweek("ts"))
        .withColumn("hour", hour("ts"))
        .groupBy("dow", "hour")
        .agg(count("*").alias("count"),
             spark_round(avg("processing_time_ms"), 0).alias("avg_time_ms"))
        .orderBy("dow", "hour")
    )
    rows = result.collect()
    matrix = [[0] * 24 for _ in range(7)]
    for r in rows:
        # dayofweek: 1=Sunday, 2=Monday ... 7=Saturday → 0=Monday
        dow = (int(r["dow"]) - 2) % 7
        h = int(r["hour"])
        matrix[dow][h] = int(r["count"])

    return {
        "total_failed": total_failed,
        "failure_rate": round(total_failed / df.count() * 100, 2),
        "matrix": matrix,
        "labels_dow": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "labels_hour": [f"{h:02d}:00" for h in range(24)],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/raw/telemetry.csv")
    parser.add_argument("--output", default="data/spark-output")
    args = parser.parse_args()

    spark = create_spark()
    print(f"[spark] Spark version: {spark.version}")

    df = read_telemetry(spark, args.input)
    total = df.count()
    print(f"[spark] Loaded {total:,} telemetry rows")

    df_cache = df.cache()

    analyses = {
        "telemetry_overview": analyze_overview(df_cache),
        "format_distribution": analyze_format_distribution(df_cache),
        "action_distribution": analyze_action_distribution(df_cache),
        "conversion_stats": analyze_conversion_stats(df_cache),
        "traffic_trend": analyze_traffic_trend(df_cache),
        "hourly_pattern": analyze_hourly_pattern(df_cache),
        "daily_trend": analyze_daily_trend(df_cache),
        "storage_growth": analyze_storage_growth(df_cache),
        "user_activity": analyze_user_activity(df_cache),
        "error_analysis": analyze_errors(df_cache),
        "conversion_matrix": analyze_conversion_matrix(df_cache),
        "quality_report": analyze_quality_report(df_cache),
        "region_distribution": analyze_region_distribution(df_cache),
        "device_distribution": analyze_device_distribution(df_cache),
        "error_heatmap": analyze_error_heatmap(df_cache),
        "sample_cleaned": get_sample(df_cache, 20),
    }

    out_dir = args.output
    for name, data in analyses.items():
        save_json(data, os.path.join(out_dir, f"{name}.json"))

    ov = analyses["telemetry_overview"]
    print(f"\n[spark] === Summary ===")
    print(f"[spark] Total events: {ov['total_events']:,}")
    print(f"[spark] Success rate: {ov['success_rate']}%")
    print(f"[spark] Total size: {ov['total_size_mb']} MB")
    print(f"[spark] Unique users: {ov['unique_users']}")
    print(f"[spark] Unique files: {ov['unique_files']}")
    print(f"[spark] Avg processing time: {ov['avg_processing_time_ms']} ms")
    print(f"[spark] File types: {len(analyses['format_distribution'])} categories")
    print(f"[spark] Traffic trend: {len(analyses['traffic_trend'])} time points")
    print(f"[spark] Daily trend: {len(analyses['daily_trend'])} days")
    eh = analyses['error_heatmap']
    print(f"[spark] Error heatmap: {eh['total_failed']} failures across 7×24 grid")

    spark.stop()
    print("[spark] Done")


if __name__ == "__main__":
    main()
