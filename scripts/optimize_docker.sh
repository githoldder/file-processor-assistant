#!/bin/bash
# 清理冗余的 Celery/Worker 镜像及旧系统残留
echo "Optimizing Docker environment..."
# 清理虚悬镜像
docker image prune -f
# 删除所有带有 'worker' 或 'celery' 字样的容器/镜像
docker ps -a | grep -E "worker|celery" | awk '{print $1}' | xargs -r docker rm -f
docker images | grep -E "worker|celery" | awk '{print $3}' | xargs -r docker rmi -f
# 清理未使用的 volumes
docker volume prune -f
echo "Docker optimization complete. Ready for docker-compose up."
