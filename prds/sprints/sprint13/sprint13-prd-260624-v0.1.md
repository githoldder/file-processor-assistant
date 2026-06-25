# Sprint 13 PRD v0.1 — 第四至六章正文推进、界面结果图整理与答辩认知树

Last Updated: 2026-06-24 22:40

## 背景

Sprint 12 已完成市场调研、UML 图源优化、运行界面与测试终端结果采集的主体工作。当前报告进入最后的正文组织阶段：第四章需要把系统设计从模块列表升级为架构、流程、数据结构、部署结构的完整说明；第五章需要围绕真实代码实现和关键界面结果说明各功能模块；第六章需要把命令行验证、接口验证和业务闭环验证组织为可复现的测试分析。

同时，用户已在桌面手动截取若干关键页面图像，要求进行 OCR/视觉识别、重命名整理、矩阵式排版和 LaTeX 编译。用户还需要参加课程设计相关现场说明，因此必须形成一份 top-down 的真实代码认知树，能够从顶层架构一路讲到 API、状态流转、函数方法和代码位置。

## 总目标

- 推进 `chap04.tex`、`chap05.tex`、`chap06.tex` 正文，使其符合“设计—实现—测试”的完整叙事。
- 将 `figures-pdf` 中的 UML 图有选择地注入第四章和第五章，形成架构、模块、流程、数据模型和组件协作证据链。
- 对 `/Users/caolei/Desktop/截屏2026-06-24*.png` 进行视觉识别/OCR 归类，复制到 LaTeX 图像目录并按业务模块重命名。
- 在第 5 章使用矩阵式界面结果图布局，同一模块最多三张并排，避免单图堆砌。
- 在第 6 章保留真实命令行运行结果图，并补齐测试用例、验证命令、实际结果、结论类三线表。
- 生成 `docs/02-process/document/process-notes/culcloud-code-architecture-tree.md`，作为接手和现场说明用的真实代码认知树。
- 执行正文禁用口径审计、图像密度审计和 LaTeX 编译。

## 正文分布约定

| 章节 | 主要职责 | 应放内容 | 不应放内容 |
| --- | --- | --- | --- |
| 第 4 章 | 系统总体设计 | 总体架构、模块划分、业务流程、数据结构、部署结构、UML 设计图 | 具体界面操作结果、测试命令输出 |
| 第 5 章 | 详细设计及实现 | 代码模块、核心函数、API 调用、状态流转、界面结果图 | 大段市场背景、无代码依据的功能描述 |
| 第 6 章 | 系统测试 | 环境、测试数据、功能测试、转换链路测试、命令结果、问题修复、结论 | 新功能设计、界面展示堆图 |

## 图像与命名规范

| 来源 | 处理要求 |
| --- | --- |
| `figures-pdf/fig08`--`fig15` | 作为 UML 设计图，优先用于第 4 章，`fig15` 可用于第 5 章详细设计总览。 |
| `figures-png/ui/fig05-*` | 作为已自动采集的界面结果图，可继续保留或替换为手动图。 |
| `/Users/caolei/Desktop/截屏2026-06-24*.png` | 先 OCR/视觉识别，再复制到 `figures-png/ui/manual/`，按业务模块重命名。 |
| `figures-png/tests/fig06-*` | 作为第 6 章真实命令行运行结果图，必须保留命令语义和结果说明。 |

建议手动图命名：

```text
fig05-manual-01-dashboard-runtime.png
fig05-manual-02-file-upload-result.png
fig05-manual-03-file-preview-result.png
fig05-manual-04-conversion-submit.png
fig05-manual-05-conversion-success.png
fig05-manual-06-pdf-studio-workspace.png
fig05-manual-07-pdf-export-result.png
fig05-manual-08-admin-runtime-dashboard.png
fig05-manual-09-admin-task-events.png
```

## 正文口径门禁

正式正文不得出现以下非专业或交付过程词：

```text
截图
大作业
课程设计报告
演示
答辩
```

推荐替代表述：

```text
界面结果图
运行结果图
图像记录
可复现验证
现场说明
验收
```

## 任务清单

| ID | 优先级 | 任务 | 产物 |
| --- | --- | --- | --- |
| S13-T01 | P0 | 同步 context 与 PRD，确保可接手 | `context/context.txt`、本 PRD、JSON 状态文件 |
| S13-T02 | P0 | 生成 top-down 代码认知树 | `docs/02-process/document/process-notes/culcloud-code-architecture-tree.md` |
| S13-T03 | P0 | 手动界面图 OCR/视觉识别与重命名整理 | `figures-png/ui/manual/`、图像清单 |
| S13-T04 | P0 | 改写第 4 章，嵌入 UML PDF | `chap04.tex` |
| S13-T05 | P0 | 改写第 5 章，补齐实现说明与矩阵界面图 | `chap05.tex` |
| S13-T06 | P0 | 改写第 6 章，补齐测试表与命令结果说明 | `chap06.tex` |
| S13-T07 | P0 | 执行审计与 LaTeX 编译 | audit 输出、PDF 输出 |
| S13-T08 | P1 | 补充核心业务闭环与任务状态事件流转 UML 源文件 | `figures-uml/12-*.puml`、`figures-uml/13-*.puml` |

## 代码认知树内容要求

`culcloud-code-architecture-tree.md` 必须覆盖：

- 顶层架构：用户端、管理端、FastAPI、MinIO、Redis、Gotenberg、Flask Analytics、Spark。
- 技术选型：每项技术为什么在当前系统中出现。
- 模块边界：文件管理、预览、转换、PDF 编辑、任务监控、系统状态、管理驾驶舱。
- API 依赖：前端视图到 `services/api.ts`，再到 `backend/app/routers/*`。
- 状态流转：上传、转换、PDF 导出、任务队列、日志事件。
- 函数/文件位置：至少覆盖 frontend views、backend routers/services、flask analytics、spark scripts。
- 业务边界：已实现、弱覆盖、未实现，必须实事求是。

## 验收标准

- 第四章形成设计叙事，至少引用系统架构、模块依赖、流程、ER/数据管线类 UML 图。
- 第五章形成实现叙事，说明真实代码位置、API 和状态流，并包含矩阵式界面结果图。
- 第六章形成测试叙事，保留真实命令结果图，三线表数量充足。
- 手动界面图被整理到报告目录，文件名能表达业务含义。
- `culcloud-code-architecture-tree.md` 可作为后续 agent 接手和用户现场说明材料。
- `python3 docs/02-process/scripts/latex_chapter_audit.py` 通过正式正文禁用词检查。
- `make -C docs/02-process/document/latex/cit-template/scripts clean compile` 编译通过。
