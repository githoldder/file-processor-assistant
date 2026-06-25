#!/usr/bin/env bash
# CulCloud manual terminal verification checklist.
# Execute commands group by group and capture the terminal window after each group.

set -u

cd /Users/caolei/Desktop/culcloud-platform || exit 1

echo "=== A1 Docker Compose services ==="
docker compose ps

echo "=== A2 PM2 process manager ==="
pm2 status

echo "=== A3 Service health endpoints ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/health
echo
curl --noproxy "*" -sS http://127.0.0.1:5050/health
echo

echo "=== B1 FastAPI file objects ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files | python3 -m json.tool

echo "=== B2 FastAPI task/log/queue statistics ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/logs/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/queue-length | python3 -m json.tool

echo "=== C1 Upload verification file ==="
printf "CulCloud verification file\n" > /tmp/culcloud-verification.txt
curl --noproxy "*" -sS -X POST \
  -F "file=@/tmp/culcloud-verification.txt" \
  http://127.0.0.1:8000/api/v1/files/upload | python3 -m json.tool

echo "=== C2 File list and recent logs after upload ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files | python3 -m json.tool
curl --noproxy "*" -sS "http://127.0.0.1:8000/api/v1/logs/recent?limit=10" | python3 -m json.tool

echo "=== D1 Real-time stats after business operation ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/logs/stats | python3 -m json.tool

echo "=== E1 Available npm scripts ==="
cat package.json
cat file-cloud-frontend/package.json

echo "=== E2 End-to-end test command, adjust if package script differs ==="
npm run test:e2e

echo "=== F1 Structured error boundaries ==="
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/not-exist-task-id | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files/not-exist-file-id | python3 -m json.tool
