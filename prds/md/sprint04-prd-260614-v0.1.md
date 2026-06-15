# Sprint 04 PRD — 答辩可展示闭环

Last Updated: 2026-06-14 23:55

## Object

在不继续扩张新功能的前提下，优先打通 CulCloud 的答辩展示闭环：数据可视化大屏能演示、PM2 + Docker Compose 架构能解释、集群/服务状态能刷新、最终报告有证据链。

## Key Results

- KR-1: Analytics 大屏可以稳定展示真实或可追溯 demo 数据，并覆盖 loading、empty、error 和刷新状态。
- KR-2: PM2 + Docker Compose 的分层部署决策在 README、Agent 规范、报告素材和答辩话术中保持一致。
- KR-3: 集群/服务状态形成最小闭环：前端刷新按钮 → 后端状态接口 → Docker/端口/Redis/MinIO/Gotenberg/API 快照 → 页面红绿状态。
- KR-4: 每个关键功能都有可追溯证据：代码路径、接口返回、截图或日志、报告段落。

## Tasks

### S04-T01: Analytics 大屏演示化

**目标**: 把 `file-cloud-frontend/src/views/Analytics.tsx` 从“有图表”推进到“能答辩演示”。

**范围**:

- 检查 ECharts 组件渲染、数据源、刷新逻辑和异常态。
- 保留现有图表框架，不为炫技新增复杂动画。
- 明确每个图表的数据来源和讲解口径。

**主要交付物**:

- 大屏 UI 可演示版本。
- 图表数据来源说明，放入 `docs/02-process/governance/` 或报告素材文档。
- 必要的截图清单。

**验收口径**:

- 页面打开不白屏。
- 图表在有数据、无数据、服务异常时都有合理状态。
- 至少 5 个核心图表/指标能解释“数据从哪里来、说明什么问题”。

### S04-T02: PM2 + Docker Compose 架构统一

**目标**: 把本地演示层和基础设施层的分工固定成项目唯一口径。

**范围**:

- PM2: 管理本地演示前端和 Flask analytics 进程。
- Docker Compose: 管理 Redis、MinIO、Gotenberg、FastAPI、Hadoop/Spark 风格服务和其他状态性/集群式服务。
- 不在本 Sprint 改成全 Docker Compose 或全 PM2。

**主要交付物**:

- README/报告素材中的架构说明。
- 答辩 Q&A 里关于“为什么混合部署”的标准回答。
- 必要时补充 `docs/02-process/governance/` 下的架构决策记录。

**验收口径**:

- 老师追问“为什么不全部 Docker Compose”时，有清楚、统一、可复述的回答。
- `ecosystem.config.js`、`docker-compose*.yml` 与文档口径不冲突。

### S04-T03: 集群与服务状态可视化闭环

**目标**: 完成最小可用的服务状态刷新链路，证明系统具备云平台/分布式服务管理意识。

**范围**:

- 后端提供状态快照接口，返回服务健康、端口、容器/依赖状态和最近日志摘要。
- 前端提供刷新入口和红绿状态展示。
- 失败服务不能阻塞整个快照，返回 partial 数据和错误原因。

**主要交付物**:

- 后端状态服务或路由。
- 前端 SystemStatus/Analytics 中的状态展示。
- 一份接口返回示例。

**验收口径**:

- 点击刷新能触发接口请求。
- Redis/MinIO/Gotenberg/API/Flask/frontend 至少有健康状态展示。
- 某个服务异常时，页面显示局部异常而不是整体崩溃。

### S04-T04: 报告证据链装配

**目标**: 让报告和答辩材料不再停留在概念描述，而能指向真实系统证据。

**范围**:

- 为 Spark/Flask/ECharts/Docker Compose/PM2/Hadoop/MinIO/Redis/FastAPI 等关键词建立证据链。
- 每条证据链至少包含代码路径、运行截图或接口返回、报告段落位置。
- 不伪造截图，不把假设写成事实。

**主要交付物**:

- `docs/02-process/governance/evidence-chain-20260614.md`
- 截图清单或接口返回样例。
- 报告章节待填充清单。

**验收口径**:

- 答辩时讲到一个技术点，可以立刻打开对应代码/截图/API 返回。
- 报告中的核心技术描述与仓库事实一致。

## Acceptance

- `Analytics` 和 `SystemStatus` 至少完成一次浏览器人工验证或截图验证。
- `docs/02-process/governance/evidence-chain-20260614.md` 建立完成。
- `docs/02-process/governance/architecture-decision-pm2-compose-20260614.md` 建立完成或已有文档更新到位。
- PRD JSON 中所有任务状态、验证结果和残余风险有记录。

## Walkthrough

Sprint 结束后必须记录：

- 完成的 Task ID。
- 修改文件清单。
- 验证命令和结果。
- 未验证项。
- 残余风险。
- 是否允许 push。
