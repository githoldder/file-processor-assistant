# Sprint 08 PRD — LaTeX 文档工程与最终 PDF 交付

Last Updated: 2026-06-15 00:35

## Object

对齐学术标准完成课程设计文档交付：以 txt 分章节维护内容，生成 UML 与工程图，检索并归档关键技术栈 logo，补齐系统 UI 截图，注入 LaTeX 模板，完成编译、视觉检查和最终 PDF。

## Key Results

- KR-1: 报告内容先在 txt 分章节定稿，再注入 LaTeX，避免直接在 tex 中失控扩写。
- KR-2: 工程图/UML 覆盖系统架构、数据流、模块关系、部署关系和核心流程。
- KR-3: 技术栈 logo、UI 截图、接口样例和运行证据全部归档到 `docs/02-process/`。
- KR-4: LaTeX 编译通过，无致命错误、无缺图、无明显 Markdown 泄漏。
- KR-5: 最终 PDF 放入 `docs/03-reports/`，并完成 walkthrough 审计。

## Reference Structure

参考 `/Users/caolei/Desktop/springboot-lgg/docs/02-process/document` 的结构安排，但以本仓库当前目录为准：

- `docs/02-process/document/report-txt/chapters/`: 分章节 txt 事实源。
- `docs/02-process/document/latex/cit-template/data/`: LaTeX 章节注入目标。
- `docs/02-process/Figure/`: UML、截图、图表、logo 和清单。
- `docs/03-reports/`: 最终 PDF 和答辩可提交材料。

## Tasks

### S08-T01: txt 分章节内容定稿

**目标**: 先用 txt 维护最终报告正文，再注入 LaTeX。

**章节建议**:

- 摘要与关键词。
- 绪论。
- 相关技术。
- 需求分析。
- 系统设计与实现。
- 系统测试与结果分析。
- 总结与展望。
- 致谢。

**验收口径**:

- 每章都有事实来源和证据链。
- 不出现 Markdown 结构泄漏到最终 txt。
- 核心技术描述与源码一致。

### S08-T02: UML 与工程图生成

**目标**: 生成报告所需关键工程图。

**图清单**:

- 系统总体架构图。
- 前后端数据流图。
- 用户端业务流程图。
- 管理员大屏/监控流程图。
- Docker Compose + PM2 部署关系图。
- Spark/Flask/ECharts 数据分析管线图。

**验收口径**:

- 每张图有源文件和导出图片。
- LaTeX 中引用路径稳定。

### S08-T03: 技术栈 logo 与 UI 截图归档

**目标**: 收集报告图文证据。

**logo 清单**:

- React、Vite、TypeScript、ECharts。
- FastAPI、Flask、PySpark/Spark。
- Docker、Redis、MinIO、Gotenberg、PM2。

**截图清单**:

- 用户端个人首页。
- 云盘页。
- 文件转换页。
- PDF Studio。
- 管理员大数据舱。
- 集群状态监控。
- 系统 Health 面板。
- 任务监控。

**验收口径**:

- 图片命名清晰。
- 截图来自真实运行页面。
- 不使用占位图冒充运行结果。

### S08-T04: LaTeX 注入与格式对齐

**目标**: 将 txt 章节注入 LaTeX 模板，并对齐学术格式。

**验收口径**:

- `chap01.tex` 至少到 `chap06.tex` 与章节结构一致。
- 图片、表格、引用、交叉引用路径正确。
- 无 Markdown 语法泄漏。

### S08-T05: 最终 PDF 编译、视觉检查与交付

**目标**: 编译最终 PDF，并完成审计。

**验收口径**:

- PDF 编译通过。
- 日志无 fatal error、缺图、明显未定义引用。
- 页面截图检查无明显溢出、空白页、图片错位。
- 最终 PDF 放入 `docs/03-reports/`。

## Acceptance

- `docs/02-process/document/report-txt/chapters/` 有定稿章节。
- `docs/02-process/Figure/` 有 UML、logo、UI 截图和清单。
- LaTeX 编译通过并生成最终 PDF。
- `docs/02-process/governance/walkthrough-final-delivery.md` 完成。

## Walkthrough

最终 walkthrough 必须说明：文档来源、图表来源、截图来源、编译命令、PDF 路径、未解决风险和是否允许最终 push。
