# Sprint 09 PRD — CulCloud 体验与大数据闭环重构

Last Updated: 2026-06-18 21:20

## Object

将 CulCloud 从功能演示型文件处理系统升级为“用户服务端 + 管理员大数据舱”的双视角闭环产品，并以真实 Spark 聚合结果支撑答辩叙事。

## 评估结论

原计划方向正确，尤其是“大数据集包装为 CulCloud 全局历史遥测日志”“高保真转换避坑”“PDF 前端叠层编辑”“用户端与管理端解耦”四点，可以作为后续标准。

需要收敛两处风险：

1. 3D Globe 首版不引入 three/globe.gl，新依赖和复杂 3D 调试会消耗答辩前稳定性。先用 ECharts graph、lines、effectScatter 做 2.5D 全球节点态势图，满足视觉冲击和可构建性。
2. 百万级数据不下发明细到前端，只展示 Spark 聚合结果、质量报告和处理规模。前端只承担展示，数据真实性由 Spark 脚本和输出 JSON 兜底。

## Product Split

用户端保持蓝白服务型 UI：

- 用户个人数据首页
- 云盘服务
- 文件转换服务
- PDF 预览与轻量编辑服务

管理员端采用蓝黑沉浸式 UI：

- 管理员默认进入大数据舱
- 大屏展示全局遥测、转换吞吐、文件格式偏好、服务健康、数据质量
- 集群状态、任务监控、系统 Health 作为大屏 Modal 或快捷入口

## Accepted Decisions

- 2026-06-18：管理员大数据舱桑基图采用“来源格式层 -> 目标格式层”的双层节点模型，避免双向转换统计形成 ECharts Sankey 不支持的有向环。
- 2026-06-18：ECharts 图表异常不在大屏裸露内部报错，统一降级为产品态“图表暂不可用”空状态，保障答辩演示连续性。
- 用公开/生成的大规模行为日志包装为 CulCloud 全局历史遥测日志，保持大数据课设与文件处理主线一致。
- 文件转换能力只保留 Office to PDF、图片格式互转、PDF 拆分合并/提取等高保真路径。
- PDF 轻量编辑采用 pdf.js + Fabric.js + pdf-lib 的前端叠层方案，避免后端重排版风险。
- 云盘页升级为现代 Drive UX：目录、搜索、类型筛选和预览抽屉。
- 登录注册首版采用本地角色切换与演示鉴权，不接 Firebase；一周内优先保证演示闭环。

## Out Of Scope

- PDF 转 Word/Excel。
- 实时真实公网节点接入。
- 答辩前引入复杂 3D 物理地球依赖。
- 前端加载百万级明细。
- 将未验证功能写入最终报告为已完成事实。

## Phase Plan

### P1 基础设施打通与演示风险收敛

目标：

- 修复任务路由具体路径被 `/{task_id}` 拦截的问题。
- 补齐前端 ECharts graph/lines/effectScatter 注册。
- 确认 SystemStatus、TaskMonitor、logs、tasks stats 接口不白屏。

验收：

- `npm run build` 通过。
- `/api/v1/tasks/stats`、`/api/v1/tasks/queue-length`、`/api/v1/system/health` 可返回。
- 管理员大屏、任务监控、Health 页面可互相进入。

### P2 沉浸式全球节点大屏与 Spark 遥测闭环

目标：

- 新增 `/api/analytics/cockpit` 聚合接口。
- 用 Spark 输出或兜底样例生成 telemetry scale、format mix、traffic trend、node status。
- 将 Analytics 中央 2D 拓扑替换为全球节点态势图。
- 管理员 Analytics 视图隐藏传统 Navbar/Sidebar/AdminDock。

验收：

- 大屏显示数据处理规模、文件格式偏好、吞吐趋势、服务节点状态。
- 中央图不空白，点击节点弹出详情 Modal。
- 宽屏下信息不重叠，能作为答辩首屏截图。
- 转换桑基图在存在双向转换数据时仍可渲染，不出现 `Sankey is a DAG` 白屏错误。

### P3 现代化云盘与高保真文件格式工厂

目标：

- 云盘实现面包屑、目录状态、文件名高亮搜索、MIME Tab。
- 文件预览抽屉支持图片、文本、PDF。
- 转换中心隐藏低保真/高风险选项，只保留 Office2PDF、ImageFactory、PDF Utils。

验收：

- 用户端是蓝白服务型 UI。
- 点击文件优先预览，不默认下载。
- 转换选项全部有可验证后端能力。

### P4 PDF 叠层轻编辑与导出

目标：

- 移植/复用 pdfjs-dist 渲染思路。
- 增加 Fabric.js 透明交互层。
- 增加文字、框选、高亮、箭头等轻量批注工具。
- 用 pdf-lib 在浏览器端将透明批注图层合并回 PDF。

验收：

- 原 PDF 排版不被重排。
- 批注可拖拽、缩放、删除。
- 导出 PDF 可下载并保留原文清晰度。

## Implementation Notes

- Flask analytics 层新增 cockpit 聚合接口，负责把 Spark 输出包装成 CulCloud 遥测口径。
- React Analytics 页只消费聚合指标，不自己伪造百万明细。
- 大屏中心图使用 ECharts graph/lines/effectScatter，保留后续替换为 three/globe.gl 的接口空间。
- 转换桑基图消费 `conversion-stats.by_type` 时，前端将 `source_format` 和 `target_format` 映射到独立层级节点，保留双向统计且保证 DAG。
- 文档、截图、LaTeX 叙事均以 PRD、接口返回、代码截图为事实源。
