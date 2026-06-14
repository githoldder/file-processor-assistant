# Agent Guide

## Operating Principle

`Agent.md` is the project spec and first-read file for all future agents. Start here, then read:

1. `context/context.txt`
2. `context/project-brief.md`
3. `context/directory-map.md`
4. `prds/md/` and `prds/json/` for the active Sprint board
5. `.agent/rules/workspace-governance-taste-v3.md`
6. `.agent/rules/agent-ops-governance.md`
7. `.agent/rules/mvp-scope.md`
8. `README.md`

The governing model is the decoupled workspace system: human-readable planning stays in Markdown, executable task state stays in JSON, durable rules stay in `.agent/rules/`, and short-term handoff state stays in `context/context.txt`.

## Current State

**Project**: CulCloud Platform — 课程大作业
**Type**: Course design engineering project (大数据分析与可视化)
**Deadline**: Expected early defense on 2026-06-21 (Sunday, Week 17)
**System progress**: ~70% — frontend analytics prototype and backend alignment are highest-risk
**Document progress**: ~50% — base LaTeX template exists, final content and evidence chain still need assembly

Architecture: PM2 (Flask analytics + React frontend) + Docker Compose (Redis, MinIO, Gotenberg, FastAPI, Hadoop/Spark). Data flow: raw data → Spark analysis → JSON results → Flask API → ECharts dashboard.

## Sprint Plan

### Sprint 1 ✓
Finalize topic direction, downgrade plan and LaTeX/report base templates.

### Sprint 2 ◷ (Active — ~70%)
Market/tech/competitor research. Focus: data processing, Docker Compose service orchestration, pseudo-distributed cluster monitoring, dashboard visualization. Reuse previous file processing assistant for non-core logic.

Key deliverables:
- [ ] Analytics big-screen UI with real data, charts, and auto-refresh
- [ ] PM2 + Docker Compose architecture documentation and defense logic
- [ ] Cluster status visualization with refresh endpoints and partial-failure handling
- [ ] Frontend: loading/empty/error states for all data views

### Sprint 3
Align final content with academic standards: chapter maintenance as txt, UML/figures, logo/UI screenshots, spec alignment, LaTeX/PDF compilation.

## Current Blockers

1. **Data visualization big-screen UI** — needs a presentable, explainable dashboard layout with zoom/refresh/status.
2. **PM2 + Docker Compose architecture** — needs consistent documentation and oral defense logic (layered governance: infrastructure=containerized, app=process-managed).
3. **Cluster service status visualization** — needs clear refresh/status/failure design (docker stats, port probe, HDFS report).
4. **Defense preparation** — must cover Docker Compose, Redis, MinIO, Spark, Flask/FastAPI, frontend state, failure handling, data-source traceability.

## Work Rules

- Do not use `git add .`.
- Do not commit local secrets, `.env`, cache folders, dependency folders, generated test reports or OS metadata.
- Keep formal requirements in `prds/md/` and executable task status in `prds/json/`.
- Put process notes, snapshots and governance reports under `docs/02-process/`.
- Put final reports and evidence intended for submission under `docs/03-reports/`.
- Keep `context/context.txt` short and useful: decisions, blockers, verification results and next steps only.
- Prefer small, auditable commits after a coherent task is complete.
- When editing code, follow existing patterns (no comments unless asked).

## Folder Rules

| Path | Purpose |
| --- | --- |
| `.agent/rules/` | Long-lived project governance and hard constraints |
| `.agent/skills/` | Project-specific operating skills and checklists |
| `.agent/workflows/` | Repeatable workflows for implementation, docs and release |
| `context/` | Agent memory and handoff state |
| `prds/md/` | Human-readable Sprint PRDs |
| `prds/json/` | Agent-executable Sprint task boards |
| `docs/01-resources/` | Original reference materials (lecture notes, rubrics, examples) |
| `docs/02-process/` | Process notes, drafts, governance reports, screenshots, intermediate artifacts |
| `docs/03-reports/` | Final report drafts and submit-ready outputs |
| `backend/` | FastAPI platform backend (file, task, conversion, logs, system APIs) |
| `file-cloud-frontend/` | React/Vite frontend (file workflow, task monitor, system status, analytics dashboard) |
| `flask-analytics/` | Flask analytics API (dashboard data endpoints) |
| `scripts/` | Automation, demo, Spark and maintenance scripts |
| `docker/` | Docker image and Hadoop/Spark support files |
| `data/` | Demo/source data (raw CSV/JSON + spark-output JSON) |
| `tests/` | Backend, blackbox and E2E tests |
| `99-archive/` | Legacy file-processor reference project |

## Audit Gate

Before commit:
1. Run `git status --short`.
2. Confirm no `.env`, `node_modules/`, `venv/`, `__pycache__/`, `.DS_Store`, `logs/`, Playwright reports or build targets are staged.
3. Stage only task-related files by explicit path.
4. Run focused validation when code changed. For governance-only changes, perform a status and path audit.

Before push:
1. Confirm the commit contains only intended project files.
2. Confirm branch and remote target.
3. Push only after human explicitly requests backup or release.
