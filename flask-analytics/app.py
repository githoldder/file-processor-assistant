"""
课程设计数据分析 API — Spark + Flask + ECharts

基于 PySpark 预处理的模拟数据集（用户行为 + 销售数据），
提供 RESTful API 供 ECharts 前端大屏展示。

API 设计：
  /api/analytics/ub/*    — 用户行为分析
  /api/analytics/sales/* — 销售数据分析
  /api/analytics/dashboard?dataset=ub|sales  — 一键看板
"""

import os
import logging

from flask import Flask, jsonify, request
from flask_cors import CORS

from services.analytics import AnalyticsService

# ─── 配置 ──────────────────────────────────────────
SPARK_OUTPUT_DIR = os.environ.get(
    "SPARK_OUTPUT_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "spark-output"))
)

# ─── 初始化 ────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

analytics = AnalyticsService(spark_output_dir=SPARK_OUTPUT_DIR)


# ==================== 系统 ====================

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "课程设计数据分析平台",
        "tech_stack": "Spark + Flask + ECharts",
    })


# ==================== 数据概览 ====================

@app.route("/api/analytics/ub/overview")
def ub_overview():
    try:
        data = analytics.get_ub_overview()
        return jsonify({"ok": True, "data": data or {}})
    except Exception as e:
        logger.error(f"ub/overview: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 用户行为分析 ====================

@app.route("/api/analytics/ub/event-types")
def ub_event_types():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_event_types() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/daily-trend")
def ub_daily_trend():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_daily_trend() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/time-periods")
def ub_time_periods():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_time_period() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/devices")
def ub_devices():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_device() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/top-pages")
def ub_top_pages():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_top_pages() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/referrers")
def ub_referrers():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_referrer() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/conversion")
def ub_conversion():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_conversion() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/duration-buckets")
def ub_duration_buckets():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_duration_buckets() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/heatmap")
def ub_heatmap():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_heatmap() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/ub/sample")
def ub_sample():
    try:
        return jsonify({"ok": True, "data": analytics.get_ub_sample() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 销售数据分析 ====================

@app.route("/api/analytics/sales/overview")
def sales_overview():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_overview() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/categories")
def sales_categories():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_category() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/monthly-trend")
def sales_monthly_trend():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_monthly_trend() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/payments")
def sales_payments():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_payment() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/order-status")
def sales_order_status():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_order_status() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/regions")
def sales_regions():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_regional() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/price-buckets")
def sales_price_buckets():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_price_buckets() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/gender")
def sales_gender():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_gender() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/top-products")
def sales_top_products():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_top_products() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/quarterly")
def sales_quarterly():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_quarterly() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/sales/sample")
def sales_sample():
    try:
        return jsonify({"ok": True, "data": analytics.get_sales_sample() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 数据质量 ====================

@app.route("/api/analytics/quality-report")
def quality_report():
    try:
        return jsonify({"ok": True, "data": analytics.get_data_quality_report() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 一键看板 ====================

@app.route("/api/analytics/dashboard")
def dashboard():
    """一键获取看板全部数据（前端加载时调用一次即可）"""
    dataset = request.args.get("dataset", "ub")
    try:
        data = analytics.get_dashboard(dataset)
        if data is None:
            return jsonify({"ok": False, "error": f"unknown dataset: {dataset}"}), 400
        return jsonify({"ok": True, "dataset": dataset, "data": data})
    except Exception as e:
        logger.error(f"dashboard failed: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== Spark 简述（答辩用）====================

@app.route("/api/analytics/pipeline-info")
def pipeline_info():
    """返回 Spark 管线处理信息，用于答辩展示"""
    report = analytics.get_data_quality_report()
    ub_ov = analytics.get_ub_overview() or {}
    sales_ov = analytics.get_sales_overview() or {}

    if report:
        ub_raw = report.get("user_behavior_raw", {})
        sales_raw = report.get("sales_raw", {})
    else:
        ub_raw = sales_raw = {}

    return jsonify({
        "ok": True,
        "pipeline": {
            "framework": "PySpark 4.1.2 (local[*])",
            "engine": "Apache Spark 4.x",
            "mode": "local cluster (auto-parallelism)",

            "user_behavior": {
                "raw_rows": ub_raw.get("total_rows", "?"),
                "duplicates_found": ub_raw.get("duplicate_count", "?"),
                "null_cells_total": ub_raw.get("nulls", "?"),
                "cleaned_rows": ub_ov.get("total_events", "?"),
                "unique_users": ub_ov.get("unique_users", "?"),
                "conversion_rate": f"{ub_ov.get('overall_conversion_rate', '?')}%",
            },

            "sales_orders": {
                "raw_rows": sales_raw.get("total_rows", "?"),
                "duplicates_found": sales_raw.get("duplicate_count", "?"),
                "null_cells_total": sales_raw.get("nulls", "?"),
                "cleaned_rows": sales_ov.get("total_orders", "?"),
                "total_revenue": f"¥{sales_ov.get('total_revenue', '?'):,.2f}",
            },

            "pipeline_stages": [
                "1. Data Loading (CSV + JSON multipFormat)",
                "2. Data Quality Report (nulls, duplicates, schema)",
                "3. Data Cleaning (null fill, anomaly filter, dedup)",
                "4. Feature Engineering (time split, bucket, field merge/split)",
                "5. Multi-dimensional Statistical Aggregation (groupBy, agg)",
                "6. Result Export (22 JSON files)",
            ],

            "note": "演示 Spark 分布式计算流程，非集群演示使用 local[*] 模式",
        }
    })


# ==================== 启动 ====================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info(f"Analytics API starting on :{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
