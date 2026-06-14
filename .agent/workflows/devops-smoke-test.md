# DevOps Smoke Test Workflow

## When To Use

Use this workflow before demos, commits that change service wiring, or push backups that include Docker/PM2/API changes.

## Checks

1. Inspect `docker-compose.yml`, `docker-compose.demo.yml` and `ecosystem.config.js` for changed service contracts.
2. Verify Docker Compose is used for stateful infrastructure and cluster-style services.
3. Verify PM2 is used only for local demo application processes such as frontend and Flask analytics.
4. Check frontend/backend ports and API base URLs.
5. Run the smallest meaningful smoke command available for the touched layer.

## Evidence To Record

- Service names and health status.
- URLs checked.
- Commands run and whether they passed.
- Known residual risk, especially services that were not started locally.
