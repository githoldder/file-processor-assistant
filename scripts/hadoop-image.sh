#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env.hadoop ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.hadoop
  set +a
fi

DOCKERHUB_USER="${DOCKERHUB_USER:-chaoliu123}"
REMOTE_IMAGE="${REMOTE_IMAGE:-${DOCKERHUB_USER}/myubuntu}"
REMOTE_TAG="${REMOTE_TAG:-hadoop-mapreduce-lab-topn}"
LOCAL_IMAGE="${LOCAL_IMAGE:-myubuntu:hadoop-mapreduce-lab-topn}"
HADOOP_CONTAINER="${HADOOP_CONTAINER:-hadoop-mapreduce-lab}"
REMOTE_REF="${REMOTE_IMAGE}:${REMOTE_TAG}"

usage() {
  cat <<EOF
Usage: scripts/hadoop-image.sh <command> [args]

Commands:
  pull                  Pull REMOTE_IMAGE:REMOTE_TAG and tag it as LOCAL_IMAGE
  run                   Create/start ${HADOOP_CONTAINER} from LOCAL_IMAGE
  verify-remote         Inspect Docker Hub manifest for REMOTE_IMAGE:REMOTE_TAG
  shell                 Open bash inside ${HADOOP_CONTAINER}
  stop                  Stop ${HADOOP_CONTAINER}
  clean                 Remove ${HADOOP_CONTAINER}, keeping images
  commit [tag]          Commit container to myubuntu:<tag> and REMOTE_IMAGE:<tag>
  push [tag]            Push REMOTE_IMAGE:<tag>; defaults to REMOTE_TAG
  status                Show related images and container state

Current config:
  REMOTE_REF=${REMOTE_REF}
  LOCAL_IMAGE=${LOCAL_IMAGE}
  HADOOP_CONTAINER=${HADOOP_CONTAINER}

Create .env.hadoop from .env.hadoop.example to override these values.
EOF
}

ensure_local_image() {
  if docker image inspect "${LOCAL_IMAGE}" >/dev/null 2>&1; then
    return
  fi

  echo "Local image ${LOCAL_IMAGE} not found; pulling ${REMOTE_REF} first."
  pull_image
}

pull_image() {
  docker pull "${REMOTE_REF}"
  docker tag "${REMOTE_REF}" "${LOCAL_IMAGE}"
  docker image ls "${REMOTE_IMAGE}" "${LOCAL_IMAGE}"
}

verify_remote() {
  docker buildx imagetools inspect "${REMOTE_REF}"
}

run_container() {
  ensure_local_image

  if docker container inspect "${HADOOP_CONTAINER}" >/dev/null 2>&1; then
    docker start "${HADOOP_CONTAINER}" >/dev/null
    docker ps --filter "name=${HADOOP_CONTAINER}"
    return
  fi

  docker run -itd \
    --name "${HADOOP_CONTAINER}" \
    -p 8088:8088 \
    -p 9870:9870 \
    "${LOCAL_IMAGE}"

  docker ps --filter "name=${HADOOP_CONTAINER}"
}

commit_container() {
  local tag="${1:-hadoop-mapreduce-lab-$(date +%Y%m%d-%H%M)}"
  local local_ref="myubuntu:${tag}"
  local remote_ref="${REMOTE_IMAGE}:${tag}"

  docker commit "${HADOOP_CONTAINER}" "${local_ref}"
  docker tag "${local_ref}" "${remote_ref}"

  echo "Committed:"
  echo "  ${local_ref}"
  echo "  ${remote_ref}"
}

push_image() {
  local tag="${1:-${REMOTE_TAG}}"
  local remote_ref="${REMOTE_IMAGE}:${tag}"

  if ! docker image inspect "${remote_ref}" >/dev/null 2>&1; then
    if [[ "${tag}" == "${REMOTE_TAG}" ]]; then
      docker tag "${LOCAL_IMAGE}" "${remote_ref}"
    elif docker image inspect "myubuntu:${tag}" >/dev/null 2>&1; then
      docker tag "myubuntu:${tag}" "${remote_ref}"
    else
      echo "No local image found for tag ${tag}."
      echo "Run: scripts/hadoop-image.sh commit ${tag}"
      exit 2
    fi
  fi

  docker push "${remote_ref}"
}

case "${1:-}" in
  pull)
    pull_image
    ;;
  run)
    run_container
    ;;
  verify-remote)
    verify_remote
    ;;
  shell)
    docker exec -it "${HADOOP_CONTAINER}" bash
    ;;
  stop)
    docker stop "${HADOOP_CONTAINER}"
    ;;
  clean)
    docker rm -f "${HADOOP_CONTAINER}"
    ;;
  commit)
    commit_container "${2:-}"
    ;;
  push)
    push_image "${2:-}"
    ;;
  status)
    docker image ls | awk 'NR == 1 || /myubuntu|chaoliu123/'
    docker ps -a --filter "name=${HADOOP_CONTAINER}"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac
