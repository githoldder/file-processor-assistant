# Directory Map

Last Updated: 2026-06-14 23:05

| Path | Role | Notes |
| --- | --- | --- |
| `Agent.md` | Agent spec and first-read file | Defines reading order, current state, rules and audit gates. |
| `.agent/rules/` | Durable governance rules | Long-lived constraints such as workspace governance, scope, docs and Git discipline. |
| `.agent/workflows/` | Reusable execution workflows | Use before recurring tasks such as implementation, docs, smoke tests and release. |
| `.agent/skills/` | Project-local skill notes | Domain/project checklists copied into the repo for future agents. |
| `context/` | Memory and handoff | `project-brief.md` and `directory-map.md` are durable; `context.txt` is short-term. |
| `prds/md/` | Human-readable sprint PRDs | Markdown board for goals, key results and acceptance. |
| `prds/json/` | Agent-executable sprint boards | JSON board for task state, file scopes and verification. |
| `prds/01-*` to `prds/08-*` | Legacy/phase PRDs | Keep as historical task packets unless actively migrated. |
| `docs/01-resources/` | Reference inputs | Teacher material, research notes and source references. |
| `docs/02-process/` | Working material | Drafts, screenshots, scripts, governance reports and intermediate documents. |
| `docs/03-reports/` | Final/report-facing material | Course report drafts, logs and submit-ready evidence. |
| `backend/` | FastAPI backend | File, task, conversion, log and system APIs. |
| `file-cloud-frontend/` | React/Vite frontend | File workflow UI, task monitor, system status and analytics dashboard. |
| `flask-analytics/` | Flask analytics API | Demo analytics service for dashboard data. |
| `scripts/` | Automation scripts | Demo up/down, stack management, Spark/data scripts and maintenance helpers. |
| `docker/` | Docker/Hadoop support | Compose-adjacent images, Hadoop lab and reproducible cluster support. |
| `data/` | Demo/source data | Raw demo data can be tracked; generated Spark output is ignored. |
| `tests/` | Validation | Backend, blackbox and E2E tests. Generated reports are ignored. |
| `99-archive/` | Archived reference project | Do not treat as active source unless explicitly reusing legacy logic. |

## Placement Rules

- New formal requirements go to `prds/md/` plus matching `prds/json/`.
- New process notes go to `docs/02-process/`; final hand-in material goes to `docs/03-reports/`.
- Running logs, dependency folders, build output, caches and local env files must stay untracked.
- Root directory should stay small: only project entry files, compose files, package manifests and core folders.
