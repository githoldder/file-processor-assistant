import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]

SPRINT_PRDS = {
    "01": "prds/sprints/sprint01/sprint01-prd-260610-v1.0.json",
    "02": "prds/sprints/sprint02/sprint02-prd-260610-v1.0.json",
    "03": "prds/sprints/sprint03/sprint03-prd-260610-v1.0.json",
    "04": "prds/sprints/sprint04/sprint04-prd-260614-v0.1.json",
    "05": "prds/sprints/sprint05/sprint05-prd-260615-v0.1.json",
    "06": "prds/sprints/sprint06/sprint06-prd-260615-v0.1.json",
    "07": "prds/sprints/sprint07/sprint07-prd-260615-v0.1.json",
    "08": "prds/sprints/sprint08/sprint08-prd-260615-v0.1.json",
    "09": "prds/sprints/sprint09/sprint09-prd-260615-v0.1.json",
    "10": "prds/sprints/sprint10/sprint10-prd-260621-v0.2.json",
}

TEST_MATRIX = {
    "01": {
        "features": ["S01-T01", "S01-T02", "S01-T03", "S01-T04", "S01-T05", "S01-T06"],
        "layers": ["unit", "integration", "e2e"],
        "assertions": ["health snapshot", "task lifecycle", "log timeline", "route order"],
    },
    "02": {
        "features": ["S02-T01", "S02-T02", "S02-T03", "S02-T04", "S02-T05", "S02-T06", "S02-T07"],
        "layers": ["unit", "integration", "e2e"],
        "assertions": ["pdf branch errors", "dashboard states", "polling retry", "file UX states"],
    },
    "03": {
        "features": ["S03-T01", "S03-T02", "S03-T03", "S03-T04", "S03-T05"],
        "layers": ["data", "integration", "e2e"],
        "assertions": ["raw row traceability", "spark output schema", "flask analytics schema", "chart data non-empty"],
    },
    "04": {
        "features": ["S04-T01", "S04-T02", "S04-T03", "S04-T04"],
        "layers": ["integration", "e2e", "docs"],
        "assertions": ["analytics loading empty error refresh", "service snapshot", "evidence links"],
    },
    "05": {
        "features": ["S05-T01", "S05-T02", "S05-T03"],
        "layers": ["e2e"],
        "assertions": ["role persistence", "admin default analytics", "user nav isolation"],
    },
    "06": {
        "features": ["S06-T01", "S06-T02", "S06-T03", "S06-T04"],
        "layers": ["integration", "e2e"],
        "assertions": ["file CRUD", "P0 conversion", "pdf workflow", "operation telemetry"],
    },
    "07": {
        "features": ["S07-T01", "S07-T02", "S07-T03", "S07-T04", "S07-T05"],
        "layers": ["integration", "e2e"],
        "assertions": ["admin cockpit non-empty", "hotkeys", "topology modal", "task route order"],
    },
    "08": {
        "features": ["S08-T01", "S08-T02", "S08-T03", "S08-T04", "S08-T05"],
        "layers": ["docs", "visual"],
        "assertions": ["chapter sources", "latex assets", "compile log", "pdf visual smoke"],
    },
    "09": {
        "features": ["P1", "P2", "P3", "P4"],
        "layers": ["data", "integration", "e2e"],
        "assertions": ["cockpit schema", "sankey DAG", "incremental telemetry", "service map"],
    },
    "10": {
        "features": ["S10-V02-T01", "S10-V02-T02", "S10-V02-T03", "S10-V02-T04", "S10-V02-T05", "S10-V02-T06", "S10-V02-T07", "S10-V02-T08"],
        "layers": ["unit", "integration", "e2e"],
        "assertions": ["role route guard", "conversion whitelist", "rename memory", "simple options", "pdf layout stability", "preview matrix", "log persistence"],
    },
}


def _load_prd(sprint: str) -> dict:
    with (ROOT / SPRINT_PRDS[sprint]).open(encoding="utf-8") as f:
        return json.load(f)


def _prd_feature_ids(prd: dict) -> list[str]:
    ids = [task["id"] for task in prd.get("tasks", []) if task.get("id")]
    if ids:
        return ids
    phases = [phase["id"] for phase in prd.get("phases", []) if phase.get("id")]
    if phases:
        return phases
    return [f"KR-{i + 1}" for i, _ in enumerate(prd.get("key_results", []))]


def test_every_sprint_prd_has_engineering_test_matrix_entry():
    assert set(TEST_MATRIX) == set(SPRINT_PRDS)

    for sprint in SPRINT_PRDS:
        prd_ids = set(_prd_feature_ids(_load_prd(sprint)))
        matrix_ids = set(TEST_MATRIX[sprint]["features"])

        assert prd_ids, f"sprint{sprint} has no feature/task ids to test"
        assert prd_ids <= matrix_ids, f"sprint{sprint} PRD ids missing from test matrix: {prd_ids - matrix_ids}"
        assert TEST_MATRIX[sprint]["layers"], f"sprint{sprint} must map to at least one test layer"
        assert TEST_MATRIX[sprint]["assertions"], f"sprint{sprint} must define observable assertions"


def test_prd_acceptance_criteria_are_not_empty_for_quality_gate():
    for sprint in SPRINT_PRDS:
        prd = _load_prd(sprint)
        acceptance = prd.get("acceptance") or []
        task_acceptance = [
            criterion
            for task in prd.get("tasks", [])
            for criterion in task.get("acceptance_criteria", [])
        ]
        key_results = prd.get("key_results") or []
        phases = [
            criterion
            for phase in prd.get("phases", [])
            for criterion in phase.get("acceptance", [])
        ]
        task_steps = [
            step
            for task in prd.get("tasks", [])
            for step in task.get("steps", [])
        ]

        assert acceptance or task_acceptance or key_results or phases or task_steps, (
            f"sprint{sprint} needs acceptance/key-result/step criteria before tests can be complete"
        )
