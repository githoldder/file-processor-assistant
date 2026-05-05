#!/bin/bash
# PRD 1：资源清理脚本
# 目标：清理无用Docker资源，保留可反向推导的镜像和服务

set -e

echo "=========================================="
echo "PRD 1：Docker资源清理"
echo "=========================================="
echo ""

echo "=== 步骤1：清理前状态 ==="
echo "--- Docker镜像占用 ---"
docker system df -v
echo ""
echo "--- Docker镜像列表（按大小排序）---"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}" | sort -k3 -rn
echo ""

echo "=== 步骤2：删除未使用的镜像 ==="
# 删除file-processor-api（可通过Dockerfile重新构建）
docker rmi file-processor-api:latest 2>/dev/null && echo "✅ 删除 file-processor-api:latest" || echo "⚠️  file-processor-api:latest 不存在"
echo ""

# 删除hadoop-template（可通过 docker commit k8s-hadoop-1 重新生成）
docker rmi hadoop-template:latest 2>/dev/null && echo "✅ 删除 hadoop-template:latest" || echo "⚠️  hadoop-template:latest 不存在"
echo ""

# 删除悬空镜像
echo "--- 删除悬空镜像 ---"
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null && echo "✅ 删除悬空镜像" || echo "⚠️  无悬空镜像"
echo ""

echo "=== 步骤3：删除未使用的卷 ==="
# 删除未使用的卷
echo "--- 删除未使用的卷 ---"
docker volume rm $(docker volume ls -q -f "dangling=true") 2>/dev/null && echo "✅ 删除未使用卷" || echo "⚠️  无未使用卷"
echo ""

# 删除已知的未使用卷
docker volume rm file-processor-v101-clean_redis_data 2>/dev/null && echo "✅ 删除 file-processor-v101-clean_redis_data" || true
docker volume rm file-processor-v101-clean_upload_data 2>/dev/null && echo "✅ 删除 file-processor-v101-clean_upload_data" || true
echo ""

echo "=== 步骤4：清理构建缓存 ==="
docker builder prune -a -f && echo "✅ 清理构建缓存完成"
echo ""

echo "=== 步骤5：清理后验证 ==="
echo "--- Docker镜像占用 ---"
docker system df -v
echo ""
echo "--- Docker镜像列表（按大小排序）---"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}" | sort -k3 -rn
echo ""

echo "--- 检查保留的镜像 ---"
echo "✅ 保留：myubuntu:hadoop-yarn-v1"
docker images | grep hadoop-yarn-v1
echo ""
echo "✅ 保留：gotenberg"
docker images | grep gotenberg
echo ""
echo "✅ 保留：postgres"
docker images | grep postgres
echo ""
echo "✅ 保留：redis"
docker images | grep redis
echo ""
echo "✅ 保留：nginx"
docker images | grep nginx
echo ""
echo "✅ 保留：minio"
docker images | grep minio
echo ""

echo "--- 检查运行中的容器 ---"
docker ps | grep -E "k8s-|hadoop"
echo ""

echo "=========================================="
echo "✅ PRD 1 资源清理完成！"
echo "=========================================="
