# CulCloud PRD Test Case Matrix

本矩阵把 `prds/sprints` 的 feature/data design 映射到可执行测试层。目标不是用一份文档替代测试，而是给每个 Sprint 留下可追踪的质量入口：单元测试覆盖分支，集成测试覆盖 API/数据契约，E2E 覆盖用户可见闭环。

## 测试分层

| Layer | 目的 | 当前落点 |
| --- | --- | --- |
| unit | helper、状态机、路径清洗、能力矩阵、纯数据分支 | `tests/backend/unit/` |
| integration | FastAPI/Flask 路由、Spark JSON 契约、MinIO/Redis mock 契约 | `tests/backend/integration/` |
| data | raw telemetry -> Spark output -> Flask API 可追溯 | `tests/backend/integration/test_analytics_contracts.py` |
| e2e | 用户/管理员可见页面、图表非空、交互闭环 | `tests/e2e/specs/` |
| docs/visual | 报告、截图、UML、LaTeX/PDF 证据链 | `tests/docs/` 后续扩展 |

## Sprint Coverage

| Sprint | Feature / Data Design | 核心测试用例 |
| --- | --- | --- |
| 01 | health_checker、task_tracker、log_collector、system/tasks/logs/cluster API | 健康快照 partial/down；任务 queued->processing->completed/failed；非法流转 warning；日志 timeline；任务具体路由不被 `/{task_id}` 拦截 |
| 02 | Dashboard 指标、PDF merge/split/reorder/info、MyFiles/ConvertCenter/PDFStudio 三态 | PDF 损坏/页码越界；dashboard loading/error/empty；批量转换 polling retry；上传进度和文件类型图标 |
| 03 | NASA/CulCloud telemetry remap、Spark preprocess、Flask analytics、Analytics charts | raw 行数等于 overview；format/action/conversion/error heatmap 聚合守恒；Flask endpoint schema；前端图表只消费聚合数据 |
| 04 | Analytics 演示态、PM2 + Compose 架构、服务状态、证据链 | Analytics loading/empty/error/refresh；服务快照；证据链文件路径/API/截图存在 |
| 05 | user/admin 角色、localStorage、双主题和导航隔离 | 用户默认 dashboard；管理员默认 analytics；刷新保持角色；用户端不出现 PM2/Docker/集群入口 |
| 06 | 用户个人首页、云盘 CRUD、P0 转换、PDF 工作流、任务/日志回流 | 上传/列表/下载/删除/重命名；Office/PDF/图片/MD 转换；PDF 预览->编辑->导出；失败原因进入任务监控 |
| 07 | 蓝黑大数据舱、业务图表、隐藏入口/热键、拓扑 Modal | 16:9 不重叠；图表非空；`1-7` 热键；拓扑节点进入 SystemStatus/TaskMonitor；不展示销售类假数据 |
| 08 | txt 章节、UML/工程图、logo/UI 截图、LaTeX/PDF | 章节齐全；无 Markdown 泄漏；图片和引用路径有效；编译日志无 fatal/缺图；PDF 视觉冒烟 |
| 09 | cockpit 聚合、Service Map、Sankey DAG、增量遥测 | `/api/analytics/cockpit` schema；Sankey source/target 分层无环；Redis logs bridge 到增量 telemetry；不下发百万明细 |
| 10 | user/admin 路由隔离、用户端四项 sidebar、高保真转换白名单、转换命名记忆、转换参数简化、PDF 页面整理稳定化 | user 端无 admin-only 入口；旧 localStorage 自动回落；默认只展示 P0 高保真转换；转换输出名继承 displayName；Excel 仅 3 个预设；PDF 拖拽无重叠/错位；未实现批注不展示为可用功能 |

## 当前新增质量门

- `tests/backend/unit/test_prd_test_matrix.py`：PRD task/phase id 必须在测试矩阵中有映射。
- `tests/backend/integration/test_analytics_contracts.py`：Spark 输出非空、raw telemetry 行数可追溯、cockpit 节点/链路可渲染、pipeline 元数据可追溯、Sankey/heatmap 输入非空。
- `tests/e2e/specs/admin-cockpit.spec.ts`：用模拟 API 数据打开管理员大屏，断言 ECharts canvas 非空，防止白屏图。
- `tests/backend/unit/test_auth_and_whitelist.py`：后端 demo role API、非法角色、三类转换入口的 P0 whitelist 403 拦截。
- Sprint10 v0.2 E2E 已补：`role-routing.spec.ts`、`sidebar-user.spec.ts`、`convert-capability-whitelist.spec.ts`、`convert-rename-memory.spec.ts`、`convert-simple-options.spec.ts`、`pdf-page-organizer.spec.ts`、`pdf-layout-stability.spec.ts`、`admin-routes.spec.ts`。

## 后续覆盖率扩展顺序

1. 先把 Sprint10 E2E 接入稳定浏览器环境，作为合并前质量门。
2. 再补 PDF 页面整理的大文档/多页性能边界测试。
3. 再补生产鉴权替换 demo role API 的集成测试。
4. 最后补 docs/visual 测试，把报告证据链和大屏截图纳入 CI。
