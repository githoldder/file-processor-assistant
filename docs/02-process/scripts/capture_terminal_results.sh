#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="$ROOT/docs/02-process/document/latex/cit-template/figures-png/tests"
mkdir -p "$OUT"

run_capture() {
  local name="$1"
  local wait_seconds="$2"
  local command="$3"
  local output="$OUT/$name"

  local escaped
  escaped=$(printf '%s' "cd '$ROOT'; clear; printf 'CulCloud terminal verification\n$ $command\n\n'; $command; cmd_status=\$?; printf '\n[exit code: %s]\n' \"\$cmd_status\"; sleep 120" | sed 's/\\/\\\\/g; s/"/\\"/g')

  local window_id
  window_id=$(osascript \
    -e "tell application \"Terminal\" to do script \"$escaped\"" \
    -e 'tell application "Terminal" to activate' \
    -e 'delay 1' \
    -e 'tell application "Terminal" to set bounds of front window to {80, 80, 1440, 980}' \
    -e 'tell application "Terminal" to id of front window')

  sleep "$wait_seconds"
  screencapture -l "$window_id" "$output"
  osascript -e 'tell application "Terminal" to close front window' >/dev/null 2>&1 || true
  printf '%s\n' "$output"
}

run_capture "fig06-01-backend-pytest-result.png" 8 \
  "./venv/bin/python -m pytest tests/backend/unit/test_auth_and_whitelist.py tests/backend/unit/test_prd_test_matrix.py tests/backend/integration/test_routers.py -q"

run_capture "fig06-02-frontend-typecheck-result.png" 6 \
  "cd file-cloud-frontend && npm run lint"

run_capture "fig06-03-api-runtime-health-result.png" 5 \
  "curl --noproxy '*' -sS http://127.0.0.1:8000/health; printf '\n'; curl --noproxy '*' -sS http://127.0.0.1:8000/api/v1/tasks/stats; printf '\n'; curl --noproxy '*' -sS http://127.0.0.1:8000/api/v1/system/health | ./venv/bin/python -m json.tool | head -n 30"

run_capture "fig06-04-e2e-role-routing-result.png" 10 \
  "cd tests/e2e && PLAYWRIGHT_USE_SYSTEM_CHROME=1 E2E_BASE_URL=http://127.0.0.1:5173 npx playwright test specs/role-routing.spec.ts --project=chromium --reporter=line"
