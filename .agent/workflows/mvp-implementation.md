# MVP Implementation Workflow

## When To Use

Use this workflow for frontend, backend, analytics, Docker/PM2 or script changes that affect the demoable course MVP.

## Read First

1. `Agent.md`
2. `context/project-brief.md`
3. `context/directory-map.md`
4. Active `prds/md/` and matching `prds/json/`
5. `.agent/rules/mvp-scope.md`

## Steps

1. Identify the smallest user-visible or defense-visible outcome.
2. Confirm owned files and out-of-scope areas from the PRD JSON board.
3. Implement inside the existing module boundary.
4. Update related API types, UI states or docs when behavior changes.
5. Run focused validation for touched areas.
6. Record verification and residual risk in `context/context.txt` or the sprint walkthrough.

## Hard Rules

- Keep the MVP tied to course requirements: data storage/read, Spark-style preprocessing, Flask/FastAPI service, ECharts visualization and lightweight deployment.
- Do not add auth, production-only infrastructure or unrelated product features.
- Do not commit generated reports, cache, dependency folders, local env files or OS metadata.
