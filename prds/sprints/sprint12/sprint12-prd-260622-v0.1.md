# Sprint 12 PRD v0.1 — 文献证据链、调研图表与 LaTeX 资产补全

Last Updated: 2026-06-22 19:20

## 背景

Sprint11 已经完成 LaTeX 正文均衡扩写，7 章正文达到 10000--13000 中文字符目标，并通过编译与静态扫描。当前报告仍存在证据链和交付资产层面的缺口：摘要需要进一步扩写并补齐英文关键词，致谢存在学校名称穿帮，`refs.bib` 需要逐条核验以避免幻觉文献，前五章涉及政策、市场、竞品和技术栈的外部信息源还需要系统化归档。与此同时，报告后续需要拼接政策截图，完成市场与竞品调研跑图，抓取技术栈官网/GitHub/社区 logo SVG，并基于代码生成工程 UML 图。

本 Sprint 的目标是把“正文能编译”推进到“证据链可回溯、参考文献可信、图表资产可生成、LaTeX 可最终交付”。

## 总目标

- 扩写中文摘要与英文摘要，补齐中英文关键词。
- 修改致谢穿帮内容，确保学校、课程和指导教师信息一致。
- 制定并执行广泛信息检索计划，覆盖前五章所需政策、竞品、市场、技术栈和工程依据。
- 将外部信息源保存到 `docs/01-resources/references/` 下的对应目录。
- 审计 `docs/02-process/document/latex/cit-template/ref/refs.bib`，确保每条参考文献可检索、可回溯、非幻觉。
- 完成 `figures-png` 政策截图拼接，输出到 `figures-png/stitched/`。
- 完成市场、竞品调研数据整理，并用 Python 生成可用于 LaTeX 的图表。
- 抓取所用技术栈的官网、GitHub 或社区 logo SVG，保存到 `figures-svg/tech-logos/`。
- 基于项目代码生成工程 UML 图，保存到 `docs/02-process/Figure/uml-generated/` 并按需导出 PDF/PNG。

## 范围边界

本 Sprint 只处理文档、引用、图表、调研数据和 LaTeX 资产，不改动前端和后端业务代码。允许新增脚本用于检索、校验、跑图、拼图、生成 UML 和审计 BibTeX。

## 信息源目录规范

| 目录 | 存放内容 |
| --- | --- |
| `docs/01-resources/references/policy/` | 网络安全法、数据安全法、个人信息保护法、大数据政策、教育/课程相关政策来源。 |
| `docs/01-resources/references/competitors/` | Google Drive、Dropbox、Box、iLovePDF、Smallpdf、Adobe Acrobat Online、OnlyOffice 等竞品页面和功能证据。 |
| `docs/01-resources/references/market/` | 云盘、文档处理、PDF 工具、在线办公或大数据教学相关市场数据。 |
| `docs/01-resources/references/tech-stack/` | React、TypeScript、Vite、FastAPI、Pydantic、Redis、Celery、MinIO、Spark、Hadoop、Gotenberg、PDF.js、PyMuPDF 等官方资料。 |
| `docs/01-resources/references/logos/` | 官方 logo 授权来源、品牌资源页和下载记录。 |
| `docs/01-resources/references/github-community/` | GitHub stars、releases、issues、license、community metadata 等用于技术生态说明的数据。 |
| `docs/01-resources/references/bib-audit/` | `refs.bib` 核验表、URL/DOI/ISBN/标准号检查、引用使用位置和风险说明。 |

## 任务清单

| ID | 优先级 | 任务 | 产物 |
| --- | --- | --- | --- |
| S12-T01 | P0 | 摘要扩写与关键词补齐 | `data/abstract.tex` |
| S12-T02 | P0 | 致谢穿帮修复 | `data/acknowledgements.tex` |
| S12-T03 | P0 | 前五章信息检索计划与来源清单 | `docs/01-resources/references/**`、`bib-audit/source-register.*` |
| S12-T04 | P0 | `refs.bib` 真实性与引用闭环审计 | `ref/refs.bib`、`bib-audit/refs-audit.*` |
| S12-T05 | P0 | 政策截图拼接 | `figures-png/stitched/` |
| S12-T06 | P0 | 市场与竞品调研数据整理和 Python 跑图 | `docs/02-process/data/market-research/`、`docs/02-process/data/competitor-research/`、LaTeX figures |
| S12-T07 | P1 | 技术栈官网/GitHub/社区 logo SVG 抓取 | `figures-svg/tech-logos/` |
| S12-T08 | P0 | 基于项目代码生成工程 UML 图 | `docs/02-process/Figure/uml-generated/` |
| S12-T09 | P0 | LaTeX 注入、编译、图文排版和引用验收 | PDF、log audit、visual audit |

## 任务细化

### S12-T01 摘要扩写与关键词补齐

中文摘要需要形成“背景痛点、系统方案、关键实现、测试验证、课程价值”的完整结构，目标 450--650 中文字符。英文摘要需要补齐与中文摘要对应的内容，并增加 `Keywords:` 行。关键词应覆盖云盘、文件转换、PDF 编辑、对象存储、任务队列、Spark 数据分析、课程大作业等核心概念。

### S12-T02 致谢穿帮修复

致谢必须修正学校名称、课程语境和指导教师信息。当前“常州工业职业技术学院”属于穿帮，应改为常州工学院。指导教师名称需要与封面保持一致，若未最终确认则使用封面当前值并标注待用户复核。

### S12-T03 信息检索计划与来源清单

检索覆盖前五章：第 1 章需要政策、云盘/PDF/转换竞品来源；第 2 章需要技术栈官方文档、GitHub/社区信号；第 3 章需要需求、合规、安全和教学场景依据；第 4 章需要架构、对象存储、任务队列和部署模式资料；第 5 章需要实现模块对应技术资料和竞品功能证据。所有来源必须登记来源名、URL、访问日期、使用章节、支撑论点和可信度等级。

### S12-T04 BibTeX 真实性与引用闭环审计

逐条检查 `refs.bib`：URL 是否可访问，作者/机构是否真实，年份是否合理，是否有 DOI/ISBN/标准号或官方来源，是否被正文引用。严禁保留无法核验的幻觉文献。对当前 `\nocite{*}` 的使用进行风险评估；若保留，必须说明每条文献进入文末的理由。最终生成 `refs-audit` 文件。

### S12-T05 figures-png 截图拼接

对 `figures-png` 中政策截图、调研截图和后续截图进行拼接，形成可插入 LaTeX 的长图或分组图。拼接后需要保留原始截图、拼接脚本、拼接产物和图题建议。若拼接图过长，应优先拆分为多张图，避免 LaTeX 页面大面积空白。

### S12-T06 市场与竞品调研跑图

围绕云盘、在线 PDF 工具、文件转换工具、开源文件处理组件和大数据教学平台进行市场/竞品数据整理。Python 脚本输出 CSV/JSON 数据、图表 PNG/PDF 和图表说明。图表不得只做装饰，必须支撑第 1/2/3 章中的论点。

### S12-T07 技术栈 logo SVG 抓取

抓取 React、TypeScript、Vite、FastAPI、Redis、Celery、MinIO、Apache Spark、Apache Hadoop、Gotenberg、PDF.js、PyMuPDF、Docker、PM2 等技术栈 logo。优先使用官网品牌资源、Simple Icons、GitHub 官方组织资源或项目仓库中的合法 SVG。记录来源和 license。

### S12-T08 工程 UML 图生成

基于前端路由、主要 React views、后端 routers/services/models、转换任务链路、预览链路、对象存储路径和日志系统生成用例图、组件图、时序图、状态图和部署图。UML 源文件保存到 `uml-generated/`，渲染图保存到 LaTeX figures 目录。

### S12-T09 LaTeX 注入与交付验收

将摘要、致谢、参考文献、图表和 UML 按章节注入 LaTeX。执行计数、静态扫描、BibTeX 审计、XeLaTeX 编译、日志扫描和 PDF 视觉检查。图表页不得孤立堆图，表格不得溢出。

## 验收标准

- 中文摘要 450--650 字，英文摘要有 `Keywords:`。
- 致谢不出现错误学校、错误课程或错误教师信息。
- `docs/01-resources/references/` 下存在完整来源登记。
- `refs.bib` 每条参考文献有核验记录，无明显幻觉条目。
- 前五章涉及外部事实的段落能追溯到来源或明确标注为项目事实。
- 市场/竞品跑图脚本、数据和图表产物齐全。
- 技术栈 logo SVG 有来源记录和 license 说明。
- UML 图源文件和渲染产物齐全。
- `make -C docs/02-process/document/latex/cit-template/scripts clean compile` 通过。
- log 扫描无 fatal、undefined citation/reference、overfull hbox。
- PDF 视觉检查无大面积孤立图表空白。

## 风险

- 外部数据检索可能遇到网络限制或页面结构变化，需要优先使用官方文档、GitHub API 和可下载公开资料。
- 市场数据若无法找到权威来源，不得硬写具体数值，只能写为趋势观察或删除图表。
- logo 使用可能涉及商标和版权，应记录来源并仅用于课程报告说明。
- `refs.bib` 当前包含若干 `year=2026` 的官方文档条目，需要审计其访问日期与年份字段是否规范。
