# Analytics Dashboard — 数据来源与答辩讲解答疑

## 数据来源总览

### 1. 文件总量
- **API**: `GET /api/v1/files`
- **来源**: MinIO 对象存储文件列表
- **字段**: `files.length` — 文件总数
- **展示**: 左翼 StatCard "文件总量"

### 2. 转换成功率
- **API**: `GET /api/v1/tasks/stats`
- **来源**: Redis task_tracker 任务统计
- **字段**: `conversion_success / conversion_failed` — 成功/失败任务数
- **展示**: 左翼 StatCard "转换成功"/"失败任务"

### 3. 任务队列长度
- **API**: `GET /api/v1/tasks/queue-length`
- **来源**: Redis 任务队列
- **字段**: `queue_length`
- **展示**: 顶部标题栏 "队列等待"

### 4. 服务健康状态
- **API**: `GET /api/v1/system/health`
- **来源**: Backend health_checker 轮询 Docker/Gotenberg/Redis/MinIO
- **字段**: `services` — 各服务健康状态
- **展示**: 顶部 ClusterStatusPanel + 右翼服务健康环图

### 5. 系统事件日志
- **API**: `GET /api/v1/logs/timeline`
- **来源**: Backend 日志收集器
- **展示**: 底部 SYSTEM LIVE EVENT LOGGER 控制台

### 6. 集群节点拓扑
- **来源**: ECharts 静态拓扑图配置
- **展示**: 中央计算拓扑图
- **交互**: 点击节点热链接跳转监控页面

### 7. Spark 管线信息 (PySpark)
- **API**: `GET /api/analytics/pipeline-info`
- **来源**: `data/spark-output/data_quality_report.json`
- **展示**: 右翼数据预处理质量面板

### 8. 文件类型分布
- **API**: `GET /api/v1/files`
- **来源**: MinIO 文件列表 → 本地提取扩展
- **展示**: 左翼文件类型分布柱状图

## 答辩讲解答疑

### Q: 这些数据是真实业务数据吗？
采用 demo 数据（`data/raw/` 下的模拟 CSV/JSON），经过 PySpark 分析管线正确处理后的输出结果，完整演示了"采集 → 清洗 → 分析 → 展示"全流程。

### Q: 为什么不用销售/用户行为数据？
Sprint 07 目标是将大屏语义对齐 CulCloud 文件处理平台业务，销售订单和用户行为数据与平台核心能力无关，已被替换为文件总量、转换任务统计等真实平台指标。

### Q: 拓扑图点击跳转的原理？
通过 ECharts graph 节点的 `targetView` 字段，在 `chart.on('click')` 事件中调用 `setActiveView('system-status'|'task-monitor')`，实现 SPA 无刷新视图切换。

## 性能说明
- 数据刷新间隔: 30s
- 后端轻量 API 查询 (< 50ms)
- 无数据库依赖，全内存 Redis + 文件 JSON
