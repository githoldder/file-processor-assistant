#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

for env_file in .env.demo .env.hadoop; do
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
done

if [[ -z "${HADOOP_IMAGE:-}" && -n "${REMOTE_IMAGE:-}" && -n "${REMOTE_TAG:-}" ]]; then
  export HADOOP_IMAGE="${REMOTE_IMAGE}:${REMOTE_TAG}"
fi

PROFILES="${1:-core}"
COMPOSE=(docker compose -f docker-compose.demo.yml -p culcloud-demo)

require_hadoop_image() {
  if [[ -n "${HADOOP_IMAGE:-}" ]]; then
    return
  fi

  if docker image inspect myubuntu:hadoop-mapreduce-lab-topn >/dev/null 2>&1; then
    return
  fi

  cat <<'MSG'
Hadoop demo needs an image source.

Set HADOOP_IMAGE to your Docker Hub image, for example:

  HADOOP_IMAGE=your-dockerhub-username/myubuntu:hadoop-mapreduce-lab-topn scripts/demo-up.sh hadoop

You can also copy .env.demo.example to .env.demo and source it before running this script.
MSG
  exit 2
}

case "${PROFILES}" in
  core)
    "${COMPOSE[@]}" up -d --pull missing --build redis minio gotenberg api
    echo ""
    echo "=== Docker infra is up. Start PM2 apps:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 logs"
    ;;
  full)
    "${COMPOSE[@]}" --profile full up -d --pull missing --build
    ;;
  hadoop)
    require_hadoop_image
    "${COMPOSE[@]}" --profile hadoop up -d --pull missing --build
    ;;
  analytics)
    # Docker 中只启动 spark-analytics, flask-analytics 由 PM2 管理
    "${COMPOSE[@]}" up -d --pull missing --build spark-analytics
    echo ""
    echo "=== Spark is up. For Flask, run: pm2 start ecosystem.config.js --only flask-analytics"
    ;;
  all)
    require_hadoop_image
    "${COMPOSE[@]}" --profile full --profile hadoop up -d --pull missing --build
    echo ""
    echo "=== All Docker services are up. Start PM2:"
    echo "   pm2 start ecosystem.config.js"
    ;;
  *)
    echo "Usage: scripts/demo-up.sh [core|full|hadoop|analytics|all]"
    exit 2
    ;;
esac

"${COMPOSE[@]}" ps
