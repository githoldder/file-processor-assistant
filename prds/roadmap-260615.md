# CulCloud Defense Roadmap

Last Updated: 2026-06-15 00:45

## Execution Principle

答辩前所有工作只服务三个目标：

1. 系统能演示。
2. 架构能解释。
3. 报告有证据。

不要再扩大产品范围。Firebase、生产级鉴权、复杂协同编辑、商业计费、K8s/Prometheus/Grafana 等内容都不进入当前答辩主线。

## Sprint Order

| Sprint | File | Purpose | Finish Signal |
| --- | --- | --- | --- |
| Sprint 04 | `sprint04-prd-260614-v0.1` | 先保住答辩基线：Analytics、PM2/Compose、状态刷新、证据链 | 管理端大屏和 SystemStatus 至少可打开、可解释 |
| Sprint 05 | `sprint05-prd-260615-v0.1` | 拆分用户端和管理员端，加入轻量角色切换 | user/admin 两种入口、两套导航和两种主题成立 |
| Sprint 06 | `sprint06-prd-260615-v0.1` | 补齐用户端文件服务与高频转换能力 | 上传、云盘、转换、PDF Studio 至少各有一条演示链路 |
| Sprint 07 | `sprint07-prd-260615-v0.1` | 把 Analytics 做成蓝黑管理员大数据舱 | 管理员默认大屏、隐藏入口、热键、监控入口可演示 |
| Sprint 08 | `sprint08-prd-260615-v0.1` | 完成文档工程和最终 PDF | txt 章节、UML、logo、UI 截图、LaTeX 编译、最终 PDF 完成 |

## UI Product Contract

### User Side

- Visual style: blue and white.
- User intent: use file services.
- Default page: personal data home.
- Modules: personal home, cloud disk, file conversion, PDF preview/light editing/export.

### Admin Side

- Visual style: blue and black.
- Admin intent: operate and defend the platform.
- Default page: data cockpit.
- Modules: big-screen dashboard, Docker Compose cluster monitor, PM2/API Health, task monitor.
- Navigation: module entrances hidden on the sides by default; arrows and hotkeys reveal them.

## Authentication Contract

Use lightweight local demo authentication:

- `demo_user`: user-side service view.
- `admin`: admin-side data cockpit view.
- Store role in localStorage or an equivalent local state.
- Do not introduce Firebase before defense.

Production note for report: a real deployment can replace this layer with OAuth, Firebase, Keycloak or campus SSO.

## Document Contract

The report line must follow Sprint 08:

1. Write final content in `docs/02-process/document/report-txt/chapters/`.
2. Build UML/engineering diagrams and store sources under `docs/02-process/Figure/`.
3. Capture real UI screenshots after Sprint 06 and Sprint 07.
4. Inject chapters into LaTeX.
5. Compile PDF and visually inspect pages.
6. Place final PDF in `docs/03-reports/`.

## Risk Control

- If time runs short, prioritize Sprint 04 + Sprint 07 + Sprint 08.
- If conversion features are unstable, show fewer formats but make each chosen format reliable.
- If Hadoop/Spark cluster pieces are unstable, explain local/demo downgrade clearly and show Docker Compose/PM2 health instead.
- If PDF visual checks fail late, fix layout over adding new content.
