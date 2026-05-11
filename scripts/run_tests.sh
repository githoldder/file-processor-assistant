#!/bin/bash
echo "======================================"
echo "CulCloud Platform Testing Suite"
echo "======================================"

echo "[1/3] Running Backend Unit & Integration Tests..."
export PYTHONPATH="$(pwd)/backend"
pytest tests/backend/unit tests/backend/integration -v

echo "\n[2/3] Running Blackbox API Tests (Requires Docker)..."
pytest tests/blackbox -v

echo "\n[3/3] Running Playwright E2E Tests (Requires Frontend & Backend running)..."
cd tests/e2e
npm install
npm run test:headed
