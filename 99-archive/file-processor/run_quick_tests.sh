#!/bin/bash
# Quick Test Runner - Runs the most essential E2E tests
# Usage: ./run_quick_tests.sh

set -e

echo "=========================================="
echo "Quick E2E Test Runner"
echo "=========================================="
echo ""

# Check if Docker is running
echo "[1/5] Checking Docker services..."
export COMPOSE_PROJECT_NAME=pdf-processor
docker compose ps | grep -q "Up" || { echo "Docker services not running. Run: docker compose up -d"; exit 1; }
echo "  ✓ Docker services running"

# Check if frontend is accessible
echo ""
echo "[2/5] Checking frontend accessibility..."
curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200" || { echo "  ✗ Frontend not accessible"; exit 1; }
echo "  ✓ Frontend accessible"

# Check if API is accessible
echo ""
echo "[3/5] Checking API accessibility..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health | grep -q "200" || { echo "  ✗ API not accessible"; exit 1; }
echo "  ✓ API accessible"

# Create output directory
echo ""
echo "[4/5] Preparing test output directory..."
mkdir -p /Users/caolei/Desktop/文件处理全能助手/test_screenshots/conversion
mkdir -p /Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_quality
echo "  ✓ Output directory ready"

# Run lightweight conversion test
echo ""
echo "[5/5] Running lightweight E2E test..."
echo "  (This will open a browser for visual testing)"
echo ""

cd /Users/caolei/Desktop/文件处理全能助手

# Run the test with Python
python3 tests/e2e/test_lightweight_conversion.py

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ All tests passed!"
else
    echo "✗ Some tests failed"
fi
echo "=========================================="

exit $EXIT_CODE
