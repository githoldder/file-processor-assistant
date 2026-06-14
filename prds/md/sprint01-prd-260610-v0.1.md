# Sprint 01 — CulCloud 系统后台监控面板：任务监控 + 服务健康

Last Updated: 2026-06-10

## Object

将 TaskMonitor 和 SystemStatus 前端视图从 mock 数据状态改造为对接真实后端 API 的可用监控面板。重构三个后端 Service（health_checker、task_tracker、log_collector），新增 3 个 FastAPI Router 约 15 个 REST 端点，覆盖 6 个服务的健康检查、转换/Spark 任务追踪、Worker 节点管理、系统日志汇聚和事件告警时间线。所有新增 API 在前端通过 loading/error/empty 三态 UX 展现。

> Agent 执行以 `prds/json/sprint01-prd-260610-v0.1.json` 为详细设计拆解文件。

## Key-Results

- KR-01: TaskMonitor 数据源从 mock 迁移至 5 个真实 REST 端点
- KR-02: SystemStatus 聚合 6 个服务的实时健康状态，30s 自动刷新
- KR-03: 系统日志汇聚推送到前端终端（5s polling）
- KR-04: 服务健康异常时前端卡片变色 + 事件写入 incident 时间线
- KR-05: 两种视图均覆盖 loading/error/empty 三态 UX
- KR-06: 所有 mock 数据从 constants.ts 移除

## Tasks

### S01-T01: health_checker 服务健康检查引擎
创建异步并发健康检查引擎，ping FastAPI / Flask / Redis / MinIO / Gotenberg / PySpark。
- 文件: `backend/app/services/health_checker.py`
- 验收: check_all() 5s 内返回 6 个服务状态，缓存 10s，单服务失败不扩散

### S01-T02: task_tracker: 任务追踪与模拟生成器
任务列表枚举 + Worker 节点模拟 + 集群概览。所有数据存 Redis，模拟数据标注 `is_simulated: true`。
- 文件: `backend/app/services/task_tracker.py`, `minio_stats.py`
- 验收: 任务列表支持过滤分页，Worker 8 个，MinIO 统计真实

### S01-T03: log_collector: 系统日志收集器
基于 Redis List 的环形缓冲日志收集（上限 1000 条），支持分页拉取和可选 WebSocket 推送。
- 文件: `backend/app/services/log_collector.py`
- 验收: 日志按时间降序返回，health_checker 失败自动写入 WARN

### S01-T04: FastAPI 新增 system + task_monitor + cluster + logs 路由
4 个 Router 约 15 个端点，注册到 main.py。
- 文件: `backend/app/routers/system.py`, `task_monitor.py`, `logs.py`, `main.py`
- 验收: 所有端点 HTTP 200，结构统一 `{ok, data}`

### S01-T05: 前端 TaskMonitor 对接真实 API
重写 215 行组件，绑定 cluster overview / tasks / workers / logs 四个 API。
- 文件: `file-cloud-frontend/src/views/TaskMonitor.tsx`, `services/api.ts`
- 验收: 指标卡实时数据，任务表格过滤，日志 5s 轮询

### S01-T06: 前端 SystemStatus 对接真实 API
重写 241 行组件，30s polling 健康状态 + 服务卡片动态生成 + 事件时间线。
- 文件: `file-cloud-frontend/src/views/SystemStatus.tsx`, `services/api.ts`
- 验收: 6 个服务卡片状态灯实时变化，单服务离线不影响其他

### S01-T07: 基础设施补全：Docker healthcheck + 清理 constants
Docker Compose 补 healthcheck，移除 constants.ts 空 mock 数组。
- 文件: `docker-compose.demo.yml`, `constants.ts`, `types.ts`
- 验收: `docker compose ps` 全 healthy，`npx tsc --noEmit` 零错误

## Guardrails
- 不破坏文件上传/转换/下载/Analytics 大屏
- 模拟数据必须标注 `is_simulated`
- 前端 API 失败时降级提示而非白屏
- TypeScript 编译零错误

## Exit Criteria
- 两个视图 mock 全部替换为 API 调用
- 6 个服务健康检查 5s 内完成
- 日志实时查看，5s polling 推送
- 覆盖 loading/error/empty 三态
- Docker Compose 全服务 healthcheck
