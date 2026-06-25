#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  CulCloud Platform — Hybrid Stack Shutdown Script
#  停止顺序: PM2 应用层 → Docker 基础设施层
# ════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "▸ Stopping PM2 applications..."
pm2 stop culcloud-frontend-dev culcloud-frontend-preview flask-analytics 2>&1

echo ""
echo "▸ Stopping Docker infrastructure..."
docker compose stop 2>&1

echo ""
echo "✓ Stack stopped"
