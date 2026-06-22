import csv
import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SPARK_OUTPUT = ROOT / "data" / "spark-output"
RAW_TELEMETRY = ROOT / "data" / "raw" / "telemetry.csv"

REQUIRED_SPARK_OUTPUTS = {
    "telemetry_overview": dict,
    "format_distribution": list,
    "action_distribution": list,
    "conversion_stats": dict,
    "traffic_trend": list,
    "hourly_pattern": list,
    "daily_trend": list,
    "storage_growth": list,
    "user_activity": dict,
    "error_analysis": dict,
    "conversion_matrix": list,
    "quality_report": dict,
    "region_distribution": list,
    "device_distribution": list,
    "error_heatmap": dict,
    "sample_cleaned": list,
}


def _load_json(name: str):
    with (SPARK_OUTPUT / f"{name}.json").open(encoding="utf-8") as f:
        return json.load(f)


def _load_flask_app():
    sys.path.insert(0, str(ROOT / "flask-analytics"))
    spec = importlib.util.spec_from_file_location("culcloud_flask_analytics_app", ROOT / "flask-analytics" / "app.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.app


def test_spark_outputs_exist_and_are_non_empty_for_all_cockpit_charts():
    for name, expected_type in REQUIRED_SPARK_OUTPUTS.items():
        path = SPARK_OUTPUT / f"{name}.json"
        assert path.exists(), f"missing Spark output: {path}"
        payload = _load_json(name)

        assert isinstance(payload, expected_type), f"{name}.json must be a {expected_type.__name__}"
        if isinstance(payload, (list, dict)):
            assert payload, f"{name}.json must not be empty; empty data can render blank charts"


def test_raw_telemetry_is_traceable_to_spark_overview_counts():
    with RAW_TELEMETRY.open(encoding="utf-8", newline="") as f:
        raw_rows = sum(1 for _ in csv.DictReader(f))

    overview = _load_json("telemetry_overview")
    quality = _load_json("quality_report")
    sample = _load_json("sample_cleaned")

    assert raw_rows > 0
    assert overview["total_events"] == raw_rows
    assert quality["total_rows"] == raw_rows
    assert quality["valid_rows"] > 0
    assert sample and {"event_id", "timestamp", "action", "file_type", "status"} <= set(sample[0])


def test_analytics_cockpit_has_renderable_business_graph_data():
    app = _load_flask_app()
    client = app.test_client()

    response = client.get("/api/analytics/cockpit")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    cockpit = payload["data"]

    scale = cockpit["scale"]
    assert scale["processed_rows"] >= 100_000
    assert 0 < scale["conversion_rate"] <= 100
    assert scale["spark_mode"].startswith("PySpark")

    assert len(cockpit["format_mix"]) >= 3
    assert len(cockpit["traffic_trend"]) >= 6
    assert len(cockpit["nodes"]) >= 6
    assert len(cockpit["links"]) >= 6

    node_names = {node["name"] for node in cockpit["nodes"]}
    for link in cockpit["links"]:
        assert link["source"] in node_names
        assert link["target"] in node_names


def test_analytics_pipeline_info_preserves_cluster_and_database_traceability():
    app = _load_flask_app()
    client = app.test_client()

    response = client.get("/api/analytics/pipeline-info")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True

    pipeline = payload["data"]["pipeline"]
    telemetry = pipeline["telemetry"]
    overview = _load_json("telemetry_overview")

    assert pipeline["framework"].startswith("PySpark")
    assert pipeline["engine"].startswith("Apache Spark")
    assert "local" in pipeline["mode"]
    assert len(pipeline["pipeline_stages"]) >= 6
    assert telemetry["raw_rows"] == overview["total_events"]
    assert telemetry["cleaned_rows"] > 0
    assert telemetry["unique_files"] == overview["unique_files"]
    assert telemetry["unique_users"] == overview["unique_users"]


def test_error_heatmap_and_sankey_inputs_are_not_blank():
    heatmap = _load_json("error_heatmap")
    conversion_stats = _load_json("conversion_stats")
    conversion_matrix = _load_json("conversion_matrix")

    assert heatmap["total_failed"] > 0
    assert len(heatmap["matrix"]) == 7
    assert all(len(row) == 24 for row in heatmap["matrix"])
    assert sum(sum(row) for row in heatmap["matrix"]) == heatmap["total_failed"]

    assert conversion_stats["total_conversions"] > 0
    assert conversion_stats["by_type"], "Sankey chart needs conversion by_type rows"
    assert conversion_matrix, "conversion matrix chart needs source-target rows"
    for row in conversion_stats["by_type"]:
        assert row["source_format"]
        assert row["target_format"]
        assert row["count"] > 0


def test_frontend_cockpit_does_not_use_random_chart_data():
    analytics_tsx = ROOT / "file-cloud-frontend" / "src" / "views" / "Analytics.tsx"
    source = analytics_tsx.read_text(encoding="utf-8")

    assert "Math.random()" not in source, "admin cockpit charts must be traceable, not random per refresh"
