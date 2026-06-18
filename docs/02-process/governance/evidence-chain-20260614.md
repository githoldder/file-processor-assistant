# 答辩与课程设计证据链 (Evidence Chain)

**日期**：2026-06-14  
**状态**：已就绪 (Ready)  

本文件汇总了 CulCloud 平台各核心技术组件的物理路径、运行证据及验证方式，供答辩演示及报告引用。

---

## 1. 基础设施层 (Docker Containers)

### 1.1 Redis 缓存与任务队列
- **容器名称**：`culcloud-redis`
- **物理端口**：`6379`
- **代码路径**：[task_queue.py](file:///Users/caolei/Desktop/culcloud-platform/backend/app/services/task_queue.py)
- **获取运行状态命令**：
  ```bash
  docker exec -it culcloud-redis redis-cli ping
  ```
  *预期输出：`PONG`*

### 1.2 MinIO 对象存储
- **容器名称**：`culcloud-minio`
- **物理端口**：`9000` (API), `9001` (Console)
- **代码路径**：[minio_client.py](file:///Users/caolei/Desktop/culcloud-platform/backend/app/services/minio_client.py)
- **验证命令**：
  ```bash
  curl -I http://localhost:9000/minio/health/live
  ```
  *预期输出：`HTTP/1.1 200 OK`*

### 1.3 Gotenberg PDF 转换引擎
- **容器名称**：`culcloud-gotenberg`
- **内部网络端口**：`3000`
- **代码路径**：[convert.py](file:///Users/caolei/Desktop/culcloud-platform/backend/app/routers/convert.py)
- **验证方式**：FastAPI 后端通过 `http://gotenberg:3000/health` 探测其健康度。

---

## 2. 应用层 (PM2 & API Services)

### 2.1 FastAPI 平台后端
- **服务路径**：`backend/`
- **物理端口**：`8000`
- **API 文档路径**：`http://localhost:8000/docs`
- **健康检查接口**：`GET http://localhost:8000/api/v1/system/health`
- **快照返回样例**：
  ```json
  {
    "overall": {
      "total": 6,
      "healthy": 6,
      "degraded": 0,
      "down": 0
    },
    "services": [
      {
        "name": "api",
        "label": "FastAPI 文件服务",
        "category": "application",
        "type": "http",
        "status": "healthy",
        "latency_ms": 12.4
      },
      {
        "name": "redis",
        "label": "Redis 缓存",
        "category": "infrastructure",
        "type": "redis",
        "status": "healthy",
        "latency_ms": 2.1
      }
    ],
    "checked_at": "2026-06-15T00:45:00Z"
  }
  ```

### 2.2 Flask 数据分析服务
- **服务路径**：`flask-analytics/`
- **物理端口**：`5050`
- **监控大屏数据接口**：`GET http://localhost:5050/api/analytics/dashboard?dataset=ub`
- **PM2 启动脚本**：`ecosystem.config.js` 中的 `flask-analytics`

### 2.3 React 前端 (Vite)
- **服务路径**：`file-cloud-frontend/`
- **物理端口**：`5173` (Dev Server)
- **状态监控组件**：[SystemStatus.tsx](file:///Users/caolei/Desktop/culcloud-platform/file-cloud-frontend/src/views/SystemStatus.tsx)
- **分析大屏组件**：[Analytics.tsx](file:///Users/caolei/Desktop/culcloud-platform/file-cloud-frontend/src/views/Analytics.tsx)

---

## 3. 大数据分析管线 (Data Analysis Pipeline)

### 3.1 Spark 分析输出数据
- **物理数据源路径**：`data/spark-output/` (内含 Spark 离线分析输出的 JSON 格式报表数据)
- **分析逻辑源码**：`scripts/` 下的 Spark 数据分析脚本（例如统计活跃文件、文件大小分布、成功转换率）。
- **演示对接方式**：Flask API 从 `data/spark-output/` 直接拉取最近的计算报告，渲染到前端大屏，证明“Spark 数据离线计算 → 仪表盘分析呈现”的管道完整性。
