#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  CulCloud Platform — Hybrid Stack Startup Script
#  启动顺序: Docker 基础设施 → PM2 应用层
# ════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "═══════════════════════════════════════════════════"
echo "  CulCloud Platform — Stack Up"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Phase 1: Docker 基础设施层 ─────────────────────
echo "▸ Phase 1: Starting Docker Infrastructure..."
echo "  (Redis, MinIO, Gotenberg, FastAPI Backend)"
echo ""

# 加载环境变量
for env_file in .env.demo .env.hadoop; do
  if [[ -f "${env_file}" ]]; then
    set -a; source "${env_file}"; set +a
  fi
done

COMPOSE=(docker compose -f docker-compose.demo.yml -p culcloud-demo)

# 构建并启动核心服务
"${COMPOSE[@]}" up -d --build redis minio gotenberg api

echo ""
echo "  ✓ Docker 基础设施启动完成"
echo ""

# ─── Phase 2: PM2 应用层 ────────────────────────────
echo "▸ Phase 2: Starting PM2 Applications..."
echo "  (Flask Analytics API → :5050)"
echo "  (Frontend Vite Dev Server → :5173)"
echo ""

pm2 start ecosystem.config.js --only 'flask-analytics,culcloud-frontend-dev' 2>&1

echo ""
echo "  ✓ PM2 应用层启动完成"
echo ""

# ─── 状态汇总 ────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo "  Service           Port     Status"
echo "─────────────────────────────────────────────────"
echo -n "  Redis             :6379    "; docker exec culcloud-demo-redis-1 redis-cli PING 2>&1 | tr '\n' ' '
echo ""
echo -n "  MinIO             :9010    "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9010/minio/health/live 2>&1
echo -n "  Gotenberg         :3000    "; docker ps --filter name=culcloud-demo-gotenberg-1 --format "{{.Status}}" 2>&1
echo ""
echo -n "  FastAPI Backend   :8000    "; curl -s http://localhost:8000/health 2>&1
echo ""
echo -n "  Flask Analytics   :5050    "; curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5050/health 2>&1
echo -n "  Frontend (Vite)   :5173    "; curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5173/ 2>&1
echo "─────────────────────────────────────────────────"
echo ""
echo "  PM2 进程:"
pm2 list 2>&1 | grep -E "flask|frontend" | awk '{printf "    %s → :%s\n", $8, $12}'
echo ""
echo "  ▸ 打开前端: http://localhost:5173"
echo "  ▸ Analytics: http://localhost:5050/api/analytics/overview"
echo "  ▸ 查看日志: pm2 logs"
echo "═══════════════════════════════════════════════════"
