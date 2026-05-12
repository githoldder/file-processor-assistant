#!/bin/bash
echo "======================================"
echo "CulCloud E2E Environment Runner"
echo "======================================"

# 1. Start Backend Infra (Docker)
echo "[1/4] Starting Docker infrastructure..."
docker-compose up -d || echo "Warning: Docker compose failed. Ensure Docker Desktop is running and terminal has permissions."

# 2. Start Frontend Dev Server
echo "[2/4] Starting Frontend (Vite)..."
cd file-cloud-frontend
npm install --quiet
npm run dev &
VITE_PID=$!
cd ..

# 3. Wait for Ports
echo "[3/4] Waiting for services (8000 & 5173)..."
MAX_RETRIES=30
COUNT=0
while ! curl -s http://localhost:8000/health > /dev/null; do
    [ $COUNT -eq $MAX_RETRIES ] && echo "Backend timeout" && exit 1
    sleep 1
    COUNT=$((COUNT+1))
done
echo "Backend is UP."

COUNT=0
while ! curl -s http://localhost:5173 > /dev/null; do
    [ $COUNT -eq $MAX_RETRIES ] && echo "Frontend timeout" && exit 1
    sleep 1
    COUNT=$((COUNT+1))
done
echo "Frontend is UP."

# 4. Run E2E Tests
echo "[4/4] Running Playwright E2E Tests..."
cd tests/e2e
npm install --quiet
npx playwright test --headed
cd ../..

# Cleanup
echo "Cleaning up..."
kill $VITE_PID
