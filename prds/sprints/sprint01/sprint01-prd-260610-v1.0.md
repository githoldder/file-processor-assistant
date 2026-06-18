# Sprint-01 PRD — 系统后台基础设施层

**版本**: v1.0 | **状态**: Planned | **日期**: 2026-06-10

---

## 项目定位

**CulCloud** — 对标 Convertio 的分布式文件处理分析与可视化平台

CulCloud 是一个面向校园场景的轻量化文件处理平台，对标 Convertio（全球最大在线文件转换平台，累计处理 31.9 亿文件 / 58,299 TB 数据），在架构上完整覆盖「文件托管 → 格式转换 → 数据处理 → 分析大屏」全链路。核心差异化在于：分析数据来源于 NASA-HTTP 公开数据集（350 万条真实 HTTP 请求日志）经语义重映射后的文件处理平台操作记录，使 Spark 的分析对象具备真实的业务语义和时间分布。

## 数据集叙事

CulCloud 的平台运营数据来源于 NASA-HTTP 公开 HTTP 服务器日志数据集（1995 年 8-9 月，约 350 万条请求记录），通过 PySpark 数据管线重映射为文件处理平台的操作日志——每个 HTTP 请求映射为一次文件上传/转换/下载操作。这种处理方式保证了数据真实性的同时又赋予了业务语义。

## 里程碑目标

构建文件处理分布式平台的系统监控基础设施层——包括全服务健康检查器（health_checker）、统一异步任务追踪器（task_tracker）、操作日志采集器（log_collector），以及对应的后端 REST 路由和前端实时监控面板。

---

## 6 个任务

### S01-T01: 统一健康检查器 (health_checker.py)

**产出**: `backend/app/services/health_checker.py`

**实现要点**:
- 每 30 秒轮询 Docker 容器（redis/minio/gotenberg/api）和 PM2 进程（flask-analytics）健康状态
- 支持多种检查类型：HTTP(200+status字段)、TCP(socket)、Redis(PING)、MinIO(list_buckets)
- 结果写入 Redis sorted set，保留 24 小时历史快照
- 单服务失败不影响其他服务（降级而非瘫痪）

**验收标准**:
- 手动关闭 gotenberg 后 → 状态显示 'down'，其他服务正常
- Redis 中存在 health:current 键
- 24 小时历史可通过 health:history:{service} 查询

---

### S01-T02: 统一任务追踪器 (task_tracker.py)

**产出**: `backend/app/services/task_tracker.py`

**实现要点**:
- 任务生命周期管理：queued → processing → completed/failed
- UUID 任务 ID、Redis hash 存储完整任务对象
- 支持分页查询、状态过滤、队列长度统计、集群总览
- 任务类型枚举：conversion / pdf_merge / pdf_split / spark_analysis

**验收标准**:
- create_task → 返回 36 位 UUID
- 非法状态转换（completed→processing）记录 warning 不抛异常
- get_cluster_overview() 返回正确的统计摘要

---

### S01-T03: 操作日志采集器 (log_collector.py)

**产出**: `backend/app/services/log_collector.py`

**实现要点**:
- 从 MinIO 事件、任务状态变更（task_tracker 回调）、API 请求日志 3 个来源汇聚事件
- 事件类型：file_uploaded/deleted、conversion_started/completed/failed、service_restart
- Redis LPUSH + LTRIM 保留最近 5000 条，ZSET 按时间索引
- 集成到 FastAPI middleware 和 task_tracker 回调中

**验收标准**:
- FastAPI POST /files/upload 自动触发 file_uploaded 事件
- get_event_stats(24) 返回过去 24 小时的事件计数
- 事件可在 logs:recent 列表中查询

---

### S01-T04: 后端路由 — 系统健康 + 任务 + 日志 + 集群总览

**产出**: `backend/app/routers/system.py`, `tasks.py`(扩展), `logs.py`

**端点清单**:
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/v1/system/health | 全服务健康状态 |
| GET | /api/v1/system/health/history | 单服务 24 小时历史 |
| GET | /api/v1/tasks/{id} | 任务详情 |
| GET | /api/v1/tasks | 任务列表（分页+过滤） |
| GET | /api/v1/tasks/queue-length | 排队任务数 |
| GET | /api/v1/tasks/stats | 任务统计 |
| GET | /api/v1/cluster/overview | 集群总览 |
| GET | /api/v1/logs/recent | 最近事件 |
| GET | /api/v1/logs/timeline | 时间线查询 |
| GET | /api/v1/logs/stats | 事件统计 |

**验收标准**:
- 10 个端点全部 HTTP 200
- /system/health 返回 6 个服务状态
- /cluster/overview 返回 total_tasks / active_workers 等字段

---

### S01-T05: 前端 TaskMonitor — 对接真实任务 API

**产出**: 重写 `file-cloud-frontend/src/views/TaskMonitor.tsx`

**实现要点**:
- 顶部统计行（总任务/排队/处理/完成/失败）→ 来自 getTaskStats()
- 中部 ECharts 饼图：4 种状态分布
- 下部分页表格：最近 20 个任务，点击展开详情
- 每 5 秒自动轮询刷新
- 覆盖 loading/error/empty 三态

**验收标准**:
- 页面挂载后数据从 API 获取（非 mock）
- 表格每 5 秒自动刷新
- 后端关闭时显示错误横幅，不白屏

---

### S01-T06: 前端 SystemStatus — 从 mock 改为实时 API

**产出**: 重写 `file-cloud-frontend/src/views/SystemStatus.tsx`

**实现要点**:
- 6 个服务卡片（redis/minio/gotenberg/api/flask/frontend），绿/黄/红状态
- 24 小时延迟趋势折线图（多线重叠）
- 集群总览卡片（活跃节点/队列长度/24h 转换量/成功率/存储总量）
- 每 10 秒自动轮询
- 移除硬编码 HDFS/YARN 占位指标

**验收标准**:
- 6 个服务卡片根据 API 返回显示对应颜色
- 延迟趋势图对接健康历史 endpoint
- 集群数据来自 /cluster/overview（非 mock）

---

## 执行顺序

```
S01-T01 health_checker → S01-T03 log_collector
S01-T02 task_tracker  → S01-T03 (回调) + S01-T04 (路由)
S01-T04 路由 → S01-T05 TaskMonitor + S01-T06 SystemStatus
```

## 护栏 (Guardrails)
- 不破坏现有文件上传/转换/下载端点
- Redis 键前缀统一：health: / task: / logs:
- 异步循环使用 asyncio，不阻塞事件循环
- TypeScript 编译零错误为底线

## 退出标准
- ✅ 6 个 Docker/PM2 服务全健康检查通过
- ✅ 所有任务通过 task_tracker 追踪状态
- ✅ 上传/转换操作自动写入事件日志
- ✅ TaskMonitor + SystemStatus 全部对接真实 API
- ✅ 两视图各自自动轮询
- ✅ TypeScript 编译零错误
