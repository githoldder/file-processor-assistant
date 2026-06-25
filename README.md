# CulCloud Platform

CulCloud is a course-design cloud file processing and analytics platform. It combines file storage, conversion, task monitoring, system status inspection, Spark/Flask analytics and ECharts dashboard visualization.

## Architecture

- **Frontend**: React + Vite + TailwindCSS in `file-cloud-frontend/`
- **Backend API**: FastAPI in `backend/`
- **Analytics API**: Flask in `flask-analytics/`
- **Data processing**: PySpark scripts in `scripts/spark/`
- **Task Queue**: Redis (Docker)
- **Storage**: MinIO (Docker)
- **Converter Engine**: Gotenberg (Docker)
- **Process management**: PM2 (frontend + analytics)
- **Cluster/demo layer**: Docker Compose + Hadoop/Spark under `docker/`

## Governance

This repository uses `Agent.md` as the Agent spec. Start there, then read `context/`, active PRDs in `prds/`, and durable rules under `.agent/rules/`.

## Directory Structure

```text
.
├── Agent.md                  # Agent spec and first-read guide
├── .agent/                   # Rules, workflows and project skills
├── .vscode/                  # VSCode LaTeX Workshop settings
├── backend/                  # FastAPI backend (file, task, conversion, system)
├── file-cloud-frontend/      # React + Vite frontend
├── flask-analytics/          # Flask analytics service
├── docker/                   # Hadoop/Spark image and cluster support
├── docs/                     # Resources, process docs, reports
│   ├── 01-resources/         # Course references, lecture notes
│   ├── 02-process/           # Screenshots, scripts, drafts, governance
│   └── 03-reports/           # Lab reports, final PDF
├── prds/                     # Human PRDs + Agent JSON task boards
├── context/                  # Agent memory and handoff
├── data/                     # Demo/source data + Spark output
├── scripts/                  # Demo, Spark, Docker, maintenance scripts
├── tests/                    # Backend, blackbox, E2E tests
├── ecosystem.config.js       # PM2 process manager config
├── docker-compose.yml        # Main Docker Compose stack
└── 99-archive/               # Archived legacy reference project
```

## Quick Start

```bash
docker compose up -d redis minio gotenberg api
pm2 start ecosystem.config.js
```

## Demo Stack

```bash
scripts/demo-up.sh         # start core demo services
scripts/demo-up.sh hadoop  # start with Hadoop
scripts/demo-down.sh       # stop and clean
```

## Current Sprint Focus

Near-term priorities before expected 2026-06-21 early defense:

- Analytics dashboard explainable and demo-ready
- PM2 + Docker Compose defense logic documented
- Cluster status refresh and failure-state visualization
- Final course report evidence from APIs, screenshots, logs and PRDs
