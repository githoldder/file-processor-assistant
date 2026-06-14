# PRD Index

Last Updated: 2026-06-14 23:05

This folder is the requirements and execution-control center for CulCloud Platform.

## Active Boards

| Folder | Purpose |
| --- | --- |
| `md/` | Human-readable sprint PRDs. Use these for objective, key results, task intent and acceptance. |
| `json/` | Agent-executable sprint boards. Use these for status, owned files, steps and verification records. |

## Historical PRD Packets

The numbered folders `01-resource-cleanup/` through `08-file-preview-conversion-folders/` are earlier task packets. Keep them as historical context unless a future sprint explicitly migrates them into the `md/` plus `json/` double-board format.

## Naming Contract

Sprint PRDs use matching filenames:

```text
prds/md/sprintNN-prd-YYMMDD-vX.Y.md
prds/json/sprintNN-prd-YYMMDD-vX.Y.json
```

The Markdown file is for human review. The JSON file is the execution state source for agents.

## Current Sprint Direction

- Sprint 1: topic direction, downgrade plan and LaTeX/report template.
- Sprint 2: research, API/data processing, Docker Compose orchestration and dashboard prototype.
- Sprint 3: academic-standard alignment, UML/figures/screenshots/spec checks and final LaTeX/PDF delivery.
