# CulCloud Platform

CulCloud is a course-design cloud file processing and analytics platform. It combines file storage, conversion, task monitoring, system status inspection, Spark/Flask analytics and ECharts dashboard visualization.

## Architecture

- **Frontend**: React + Vite + TailwindCSS in `file-cloud-frontend/`
- **Backend API**: FastAPI in `backend/`
- **Analytics API**: Flask in `flask-analytics/`
- **Data processing**: PySpark scripts in `scripts/spark/`
- **Task Queue**: Redis
- **Storage**: MinIO
- **Converter Engine**: Gotenberg
- **Cluster/demo layer**: Docker Compose plus Hadoop/Spark support files under `docker/`

## Governance

This repository uses `Agent.md` as the Agent spec. Future work should start there, then read `context/context.txt`, active PRDs in `prds/md/` and `prds/json/`, and durable rules under `.agent/rules/`.

## Directory Structure

```text
.
├── Agent.md                  # Agent spec and first-read guide
├── .agent/                   # Rules, workflows and project skills
├── backend/                  # FastAPI backend
├── file-cloud-frontend/      # React frontend
├── flask-analytics/          # Flask analytics service
├── docker/                   # Hadoop/Spark image and cluster support files
├── docs/                     # Resources, process documents and final reports
├── prds/                     # Human PRDs and Agent JSON task boards
├── context/                  # Agent memory and handoff notes
├── data/                     # Demo/source data and generated analytics outputs
├── scripts/                  # Demo, Spark, Docker and maintenance scripts
├── tests/                    # Backend, blackbox and E2E tests
├── docker-compose.yml        # Main compose stack
├── docker-compose.demo.yml   # Demo compose stack
└── 99-archive/               # Archived legacy reference project
```

## Quick Start

```bash
docker-compose up -d --build
```

For local presentation mode, use PM2 for frontend/Flask processes and Docker Compose for stateful infrastructure and cluster services.

## Demo Stack

Use the demo stack when you only need the heavier services for a presentation or experiment. It pulls missing images on demand, starts the stack under the isolated Compose project `culcloud-demo`, and can remove containers, volumes, and demo images afterwards.

Start the core demo services:

```bash
scripts/demo-up.sh
```

Start with Hadoop:

```bash
HADOOP_IMAGE=<your-dockerhub-username>/myubuntu:hadoop-mapreduce-lab-topn scripts/demo-up.sh hadoop
```

Or keep the value in a local env file:

```bash
cp .env.demo.example .env.demo
source .env.demo
scripts/demo-up.sh hadoop
```

Stop and clean the demo stack:

```bash
scripts/demo-down.sh
```

`demo-down.sh` runs `docker compose down --volumes --remove-orphans --rmi all`, so demo data and demo-pulled images are removed. Keep important data outside Docker volumes before running it.

## Hadoop Image Workflow

Use [scripts/hadoop-image.sh](/Users/caolei/Desktop/culcloud-platform/scripts/hadoop-image.sh) to manage the Hadoop lab image lifecycle:

```bash
cp .env.hadoop.example .env.hadoop
scripts/hadoop-image.sh pull
scripts/hadoop-image.sh run
scripts/hadoop-image.sh shell
scripts/hadoop-image.sh commit hadoop-mapreduce-lab-topn-v2
scripts/hadoop-image.sh push hadoop-mapreduce-lab-topn-v2
```

See [Hadoop-Docker-镜像工作流.md](/Users/caolei/Desktop/culcloud-platform/docs/02-process/Hadoop-Docker-镜像工作流.md) for the full pull, run, modify, commit, and push flow.

## Current Sprint Focus

The current planning source is [Agent.md](/Users/caolei/Desktop/culcloud-platform/Agent.md), with project context in [context/project-brief.md](/Users/caolei/Desktop/culcloud-platform/context/project-brief.md) and the directory contract in [context/directory-map.md](/Users/caolei/Desktop/culcloud-platform/context/directory-map.md).

Near-term priorities before the expected 2026-06-21 early defense:

- Make the analytics dashboard explainable and demo-ready.
- Keep PM2 for local demo app processes and Docker Compose for stateful infrastructure/cluster services.
- Finish cluster status refresh and failure-state visualization.
- Assemble final course report evidence from real APIs, screenshots, logs and PRDs.
