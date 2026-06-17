"""
CulCloud 文件处理遥测分析 API — Spark + Flask + ECharts

基于 PySpark 预处理的 CulCloud 文件处理遥测数据，
提供 RESTful API 供 ECharts 前端大屏展示。

API 设计：
  /api/analytics/telemetry/*   — 文件处理遥测分析
  /api/analytics/quality/*     — 数据质量报告
  /api/analytics/cockpit       — 全局态势感知视图
"""

import os
import logging

from flask import Flask, jsonify
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
        "service": "CulCloud Telemetry Analytics",
        "tech_stack": "PySpark + Flask + ECharts",
    })


# ==================== 文件处理遥测总览 ====================

@app.route("/api/analytics/telemetry/overview")
def telemetry_overview():
    try:
        data = analytics.get_telemetry_overview()
        return jsonify({"ok": True, "data": data or {}})
    except Exception as e:
        logger.error(f"telemetry/overview: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/format-distribution")
def telemetry_format_dist():
    try:
        return jsonify({"ok": True, "data": analytics.get_format_distribution() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/action-distribution")
def telemetry_action_dist():
    try:
        return jsonify({"ok": True, "data": analytics.get_action_distribution() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/conversion-stats")
def telemetry_conversion():
    try:
        return jsonify({"ok": True, "data": analytics.get_conversion_stats() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/traffic-trend")
def telemetry_traffic():
    try:
        return jsonify({"ok": True, "data": analytics.get_traffic_trend() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/hourly-pattern")
def telemetry_hourly():
    try:
        return jsonify({"ok": True, "data": analytics.get_hourly_pattern() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/daily-trend")
def telemetry_daily():
    try:
        return jsonify({"ok": True, "data": analytics.get_daily_trend() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/storage-growth")
def telemetry_storage():
    try:
        return jsonify({"ok": True, "data": analytics.get_storage_growth() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/user-activity")
def telemetry_user_activity():
    try:
        return jsonify({"ok": True, "data": analytics.get_user_activity() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/error-analysis")
def telemetry_errors():
    try:
        return jsonify({"ok": True, "data": analytics.get_error_analysis() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/conversion-matrix")
def telemetry_conv_matrix():
    try:
        return jsonify({"ok": True, "data": analytics.get_conversion_matrix() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/quality-report")
def telemetry_quality():
    try:
        return jsonify({"ok": True, "data": analytics.get_quality_report() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/region-distribution")
def telemetry_region():
    try:
        return jsonify({"ok": True, "data": analytics.get_region_distribution() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/device-distribution")
def telemetry_device():
    try:
        return jsonify({"ok": True, "data": analytics.get_device_distribution() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/sample")
def telemetry_sample():
    try:
        return jsonify({"ok": True, "data": analytics.get_sample() or []})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/analytics/telemetry/error-heatmap")
def telemetry_error_heatmap():
    try:
        return jsonify({"ok": True, "data": analytics.get_error_heatmap() or {}})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 全局态势感知 ====================

@app.route("/api/analytics/cockpit")
def cockpit():
    """管理员大数据舱聚合接口。"""
    try:
        return jsonify({"ok": True, "data": analytics.get_cockpit() or {}})
    except Exception as e:
        logger.error(f"cockpit failed: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== Spark 管线元数据（答辩用）====================

@app.route("/api/analytics/pipeline-info")
def pipeline_info():
    try:
        return jsonify({"ok": True, "data": analytics.get_pipeline_info()})
    except Exception as e:
        logger.error(f"pipeline-info: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


# ==================== 启动 ====================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info(f"CulCloud Analytics API starting on :{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
