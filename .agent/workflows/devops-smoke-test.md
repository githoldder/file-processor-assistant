# DevOps & Smoke Test Workflow

## When to Use
When verifying the system after infrastructure changes, before demos, or to validate service health.

## Required Reading
1. `ecosystem.config.js` — PM2 process layout
2. `docker-compose.yml` — Docker services

## Steps
1. Check Docker services: `docker compose ps`.
2. Check PM2 services: `pm2 list`.
3. Verify endpoints respond:
   - `curl -s http://127.0.0.1:8000/health`
   - `curl -s http://127.0.0.1:5050/health`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/`
4. Check logs for errors: examine `logs/*.log`.
5. If any service is down, attempt restart. Record resolution in `context/context.txt`.
