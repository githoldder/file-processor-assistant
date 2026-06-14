# CulCloud Platform Project Brief

Last Updated: 2026-06-14 23:05

## Project Positioning

CulCloud Platform is a course-design cloud file processing and big-data analytics demo system. It reuses a file-processing workflow as the product shell, then focuses the course value on data ingestion, Spark-style analysis, service orchestration, cluster/status monitoring and ECharts dashboard visualization.

## Current Objective

Prepare a defensible early-defense version for the expected 2026-06-21 morning deadline. The target is not a production SaaS system; it is a coherent engineering demonstration with traceable data sources, explainable architecture decisions, visible failure handling and report-ready evidence.

## Core System Loop

1. Files and demo data are uploaded or loaded from local/MinIO-backed storage.
2. Backend APIs expose file, task, conversion, logs and system status surfaces.
3. Analytics scripts and the Flask analytics service produce dashboard data from demo datasets and service snapshots.
4. React/Vite frontend presents file workflows, task monitoring, system status and analytics views.
5. Docker Compose manages Redis, MinIO, Gotenberg and Hadoop/Spark-style infrastructure; PM2 manages local demo frontend/Flask processes.

## Current Progress

- Documentation progress: about 50%. Base templates and process notes exist; final report assembly and evidence traceability still need work.
- System progress: about 70%. The frontend analytics prototype and backend/API alignment are the highest-risk areas.
- Governance progress: Agent spec, rules, context, PRD boards and workflow documents are being consolidated into the repository.

## Current Blockers

- Analytics big-screen UI must look presentable and tell a clear data story.
- PM2 plus Docker Compose split must be documented consistently and defended clearly.
- Cluster status visualization needs refresh endpoints, partial-failure handling and dashboard presentation.
- Defense preparation must cover Docker Compose, Redis, MinIO, Spark, Flask/FastAPI, frontend state, failure handling and data-source traceability.

## Non-Goals

- Do not add authentication, multi-tenant permissions or production billing/user systems.
- Do not replace the course demo with a full production deployment architecture.
- Do not invent unsupported data claims or screenshots; evidence must come from real repository assets or running services.
