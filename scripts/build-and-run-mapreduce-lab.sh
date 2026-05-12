#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-myubuntu:hadoop-mapreduce-lab}"
CONTAINER_NAME="${CONTAINER_NAME:-hadoop-mapreduce-lab}"
REPORT_DIR="${ROOT_DIR}/docs/03-reports"
LOG_FILE="${REPORT_DIR}/mapreduce-lab-run.log"

mkdir -p "${REPORT_DIR}"

echo "=== Build image: ${IMAGE_NAME} ==="
docker build -t "${IMAGE_NAME}" "${ROOT_DIR}/docker/hadoop-mapreduce-lab"

echo "=== Remove previous container if present ==="
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "=== Run lab container: ${CONTAINER_NAME} ==="
docker run --name "${CONTAINER_NAME}" \
  -p 8088:8088 \
  -p 9870:9870 \
  "${IMAGE_NAME}" | tee "${LOG_FILE}"

echo "=== Commit runnable lab image snapshot ==="
docker commit "${CONTAINER_NAME}" "${IMAGE_NAME}-snapshot"

echo "=== Outputs ==="
echo "Log: ${LOG_FILE}"
echo "Image: ${IMAGE_NAME}"
echo "Snapshot: ${IMAGE_NAME}-snapshot"
