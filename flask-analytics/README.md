# 云文件处理平台运维数据分析 - Flask API

**Spark 离线分析管线 → Flask API 在线服务 → ECharts 可视化大屏**

## 数据流

```
Redis (task:*) ──┐
                 ├──→ dump_data.py → CSV → PySpark 分析 → JSON
MinIO (objects) ─┘                                        │
                                                          ▼
                                                   Flask API (本服务)
                                                          │
                                                          ▼
                                                  ECharts 前端
```

## 启动

```bash
cd flask-analytics
pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

## API 端点

| 端点 | 说明 |
|------|------|
| GET /health | 健康检查 |
| GET /api/analytics/overview | 平台总览（文件数、存储、任务数） |
| GET /api/analytics/file-types | 文件类型分布 |
| GET /api/analytics/storage-trend | 存储趋势（按日） |
| GET /api/analytics/task-stats | 转换任务统计 |
| GET /api/analytics/top-files | Top 10 最大文件 |
