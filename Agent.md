# Agent Guide

## Operating Principle

`Agent.md` is the project spec and first-read file for all future agents. Start here, then read:

1. `context/context.txt`
2. `docs/02-process/governance/entropy-audit-20260614.md`
3. `prds/md/` and `prds/json/` for the active Sprint board
4. `.agent/rules/workspace-governance-taste-v3.md`
5. `.agent/rules/agent-ops-governance.md`
6. `.agent/rules/mvp-scope.md`
7. `README.md`

The governing model is the decoupled workspace system: human-readable planning stays in Markdown, executable task state stays in JSON, durable rules stay in `.agent/rules/`, and short-term handoff state stays in `context/context.txt`.

## Current State

**Project**: CulCloud Platform
**Type**: course design engineering project
**Deadline**: expected early defense on 2026-06-21 morning
**System progress**: about 70%; frontend analytics prototype and backend alignment remain the highest-risk work.
**Document progress**: about 50%; base templates exist, but final course report and evidence chain still need assembly.

The platform combines:

- FastAPI backend for file storage, task tracking, conversion and system APIs.
- React + Vite frontend for file workflows, task monitoring, system status and analytics dashboard.
- Redis, MinIO, Gotenberg and Hadoop/Spark related services through Docker Compose.
- Flask analytics service and PySpark scripts for data analysis and ECharts visualization.
- PM2 for local demo application processes, Docker Compose for stateful infrastructure and cluster-style services.

## Sprint Plan

### Sprint 1

Finalize topic direction, downgrade plan and LaTeX/report base templates.

### Sprint 2

Finish market, technical and competitor research. Focus engineering effort on data processing, Docker Compose service orchestration, pseudo-distributed cluster monitoring and dashboard visualization. Reuse the previous file processing assistant for non-core file processing logic.

### Sprint 3

Align final content with academic standards: maintain chapters as text, generate UML/figures, collect logo/UI screenshots, align specifications and produce LaTeX/PDF deliverables.

## Current Blockers

- Data visualization big-screen UI still needs a presentable, explainable dashboard layout.
- PM2 plus Docker Compose architecture needs to be consistently documented and defendable.
- Distributed big-data and cluster service status visualization needs a clear refresh/status design.
- Defense preparation must cover Docker Compose, Redis, MinIO, Spark, Flask/FastAPI, frontend state, failure handling and data source traceability.

## Work Rules

- Do not use `git add .`.
- Do not commit local secrets, `.env`, cache folders, dependency folders, generated test reports or OS metadata.
- Keep formal requirements in `prds/md/` and executable task status in `prds/json/`.
- Put process notes, snapshots and governance reports under `docs/02-process/`.
- Put final reports and evidence intended for submission under `docs/03-reports/`.
- Keep `context/context.txt` short and useful: decisions, blockers, verification results and next steps only.
- Prefer small, auditable commits after a coherent task is complete.

## Folder Rules

| Path | Purpose |
| --- | --- |
| `.agent/rules/` | Long-lived project governance and hard constraints |
| `.agent/skills/` | Project-specific operating skills and checklists |
| `.agent/workflows/` | Repeatable workflows for implementation, docs and release |
| `context/` | Agent memory and handoff state |
| `prds/md/` | Human-readable Sprint PRDs |
| `prds/json/` | Agent-executable Sprint task boards |
| `docs/01-resources/` | Original reference materials |
| `docs/02-process/` | Process notes, drafts, governance reports, screenshots and intermediate artifacts |
| `docs/03-reports/` | Final report drafts and submit-ready outputs |
| `backend/` | FastAPI platform backend |
| `file-cloud-frontend/` | React/Vite frontend |
| `flask-analytics/` | Flask analytics API |
| `scripts/` | Automation, demo, Spark and maintenance scripts |
| `docker/` | Docker image and Hadoop/Spark support files |
| `tests/` | Backend, blackbox and E2E tests |

## Audit Gate

Before commit:

1. Run `git status --short`.
2. Confirm no `.env`, `node_modules/`, `venv/`, `__pycache__/`, `.DS_Store`, `logs/`, Playwright reports or build targets are staged.
3. Stage only task-related files by explicit path.
4. Run focused validation when code changed. For governance-only changes, perform a status and path audit.

Before push:

1. Confirm the commit contains only intended project files.
2. Confirm branch and remote target.
3. Push only after the human explicitly requests backup or release.
