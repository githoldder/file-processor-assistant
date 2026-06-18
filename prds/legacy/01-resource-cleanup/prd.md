# PRD 1：资源清理

## 阶段目标
清理无用Docker资源，保留可反向推导的镜像和服务，将Docker镜像占用从15.61GB降至≤8GB。

## 成功标准
- [ ] Docker镜像总大小 ≤8GB
- [ ] 保留：myubuntu:hadoop-yarn-v1 (实验必需)
- [ ] 保留：gotenberg, postgres, redis, nginx, minio (MVP必需)
- [ ] 保留：k8s-api, k8s-celery-worker (运行中)
- [ ] 删除：file-processor-api, hadoop-template (未使用)
- [ ] 删除：未使用的Docker卷
- [ ] 清理：build cache (6.66GB)
- [ ] 可通过docker-compose.v2-lightweight-b.yml和Dockerfile反向推导所有镜像

## 执行清单

### 1. 终端执行：查看当前资源状态（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"
echo "=== Before Cleanup ===" && docker system df -v
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | sort -k3 -rn
```

### 2. 终端执行：删除未使用的镜像（截图）
```bash
# 删除未使用的镜像（可反向推导）
docker rmi file-processor-api:latest hadoop-template:latest 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true
```

### 3. 终端执行：删除未使用的卷（截图）
```bash
docker volume rm $(docker volume ls -q -f "dangling=true") 2>/dev/null || true
docker volume rm file-processor-v101-clean_redis_data file-processor-v101-clean_upload_data 2>/dev/null || true
```

### 4. 终端执行：清理构建缓存（截图）
```bash
docker builder prune -a -f
```

### 5. 终端执行：验证清理结果（截图）
```bash
echo "=== After Cleanup ===" && docker system df -v
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## 测试验证
- 终端命令：`docker-compose -f file-processor/k8s/docker-compose.v2-lightweight-b.yml up -d` 能正常启动服务
- 镜像可通过 `docker commit k8s-hadoop-1` 重新生成hadoop-template
- k8s-api可通过 `file-processor/backend/Dockerfile` 重新构建

## 截图要求
1. `docker system df -v` 清理前
2. `docker images` 清理前
3. 删除命令执行过程
4. `docker system df -v` 清理后
5. `docker images` 清理后

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 1为完成
- 记录清理后的资源占用
