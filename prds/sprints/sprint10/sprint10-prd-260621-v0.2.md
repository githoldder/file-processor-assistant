# Sprint 10 PRD v0.2 — 用户端真实能力收敛与 PDF 体验重构

Last Updated: 2026-06-22 15:00

## 变更原因分析

### 1. 路由与权限边界混乱

当前 `Sidebar.tsx` 将 `system`、`tasks` 放在 `userItems` 中，导致普通用户端能看到系统监控、任务监控等管理员入口。`App.tsx` 的 `viewMap` 也把 user/admin 视图放在同一层，虽然管理员大屏有沉浸式逻辑，但 user 侧没有硬性路由隔离。

根因：
- 导航菜单先按“已有页面”组织，而不是按“用户角色任务”组织。
- 个人信息设置页与首页账户/配额信息重合，不再作为独立入口。
- admin-only 页面没有统一的 route guard，更多依赖 UI 是否展示。

### 2. 转换中心暴露了过宽能力，存在低保真/伪功能感

当前 ConvertCenter 动态展示后端 `capabilities` 的几乎全部能力，包括 `word_to_markdown`、`markdown_to_word`、`pdf_to_html`、`png_to_svg` 等 beta/medium 能力。用户看到的是“全能转换器”，但真实高保真稳定能力主要是 Office/PDF/图片到 PDF、PDF 渲染图片、Markdown 到 PDF/HTML 等。

根因：
- PRD v0.1 写的是“全转换矩阵暴露”，目标过宽。
- 前端没有以 `quality=high && stability=stable` 做产品级白名单。
- 转换参数区域复用了工程参数思维，出现 DPI、OCR、LZO 等当前链路未真实使用或用户不该理解的选项。

### 3. 转换后文件命名没有继承用户意图

当前本地文件转换先 `uploadFile(actualFile)`，再 `convertExistingFile(uploadRes.object_name, targetFormat, options)`；上传时如果用户已经重命名或前端 display name 有变化，转换输出文件名没有稳定继承“用户可见名称”。后端 `async_convert_task` 支持 `source_display_name`，但前端调用没有统一传入。

根因：
- 上传名称、对象名、展示名、转换输出名没有同一个 `displayName` 状态源。
- 本地上传与云端选择两条路径的命名逻辑不一致。

### 4. PDF Studio 不是“编辑器”，只是页面重排工具

当前 PDFStudio 使用 `extractPdfPages` 将 PDF 页渲染为 PNG，再用 `motion/Reorder` 做页面删除、旋转、重排、追加合并，最后后端 `processPdf` 重组。没有文字/高亮/图形批注，也没有真实 PDF canvas + annotation layer。页面拖拽使用 grid + y 轴 Reorder，天然容易出现卡顿、重叠、错位和位置跳变。

根因：
- 功能模型是“页面管理器”，不是“PDF 编辑器”。
- PNG 页面缩略图承担了过多交互，缺少稳定尺寸、虚拟化、拖拽占位和动画降级。
- PRD v0.1 一步到位要求 pdf.js + Fabric.js + pdf-lib，工作量大但没有拆成可验收阶段。

## 产品边界

### User Sidebar 必须仅包含

| id | 页面 | 说明 |
| --- | --- | --- |
| `dashboard` | 个人首页 | 个人文件数、存储占用、最近转换、快捷入口 |
| `files` | 我的云盘 | 上传资料、目录、搜索、预览、下载、删除、重命名 |
| `convert` | 文件转换 | 只展示高保真稳定转换能力 |
| `pdf` | PDF 工作台 | PDF 页面加载、追加合并、删除、旋转、排序、导出，并逐步承接真实 PDF 编辑 |

User 端不得展示或通过导航进入：
- `analytics`
- `system`
- `tasks`
- 集群、Docker、PM2、端口健康、系统 Health 等运维入口

### Admin 端入口

| id | 页面 | 说明 |
| --- | --- | --- |
| `analytics` | 管理员大数据舱 | 默认入口 |
| `system` | 系统监控 | 服务健康、PM2/Docker/端口状态 |
| `tasks` | 任务监控 | 队列、失败任务、最近转换 |

Admin 端可保留热键，但只在 `role=admin` 时生效。user 角色即使 localStorage 中有旧的 `system/tasks` view，也必须自动回落到 `dashboard`。

## 转换能力收敛

### P0 高保真白名单

只在用户端 ConvertCenter 默认展示这些能力：

| key | 说明 | 保真判断 |
| --- | --- | --- |
| `word_to_pdf` | DOCX -> PDF | Office/Gotenberg 路径稳定 |
| `excel_to_pdf` | XLSX -> PDF | 参数简化后稳定 |
| `pptx_to_pdf` | PPTX -> PDF | Office/Gotenberg 路径稳定 |
| `markdown_to_pdf` | MD -> PDF | 可控样式输出 |
| `markdown_to_html` | MD -> HTML | 预览/导出稳定 |
| `svg_to_png` | SVG -> PNG | 图像高保真 |
| `svg_to_pdf` | SVG -> PDF | 图像高保真 |
| `png_to_pdf` | PNG -> PDF | 包装成 PDF |
| `jpg_to_pdf` / `jpeg_to_pdf` | JPEG -> PDF | 包装成 PDF |
| `png_to_ico` | PNG -> ICO | 小工具型稳定转换 |
| `pdf_to_images` | PDF -> PNG ZIP | 渲染页图稳定 |

### 默认隐藏/不做

这些不作为用户端核心能力展示：
- `word_to_markdown`
- `markdown_to_word`
- `pdf_to_html`
- `png_to_svg`
- PDF -> Word/Excel/PPTX
- PPTX -> Images

如果保留接口，只允许 admin/debug 模式或“实验能力”折叠区展示，并明确标记 beta，不进入主流程。

## 转换参数简化

### 普通转换

默认无参数。用户只需要：
1. 选择文件
2. 选择目标格式
3. 可选修改输出文件名
4. 开始转换

移除用户端当前未真实生效或过技术化的参数：
- DPI 分段按钮
- OCR checkbox
- LZO checkbox
- 泛化的 Fidelity 概念

### Excel -> PDF 简化参数

只保留一个“页面适配”分段控制：

| 模式 | 实际参数 |
| --- | --- |
| 自动适配（默认） | A4 横向、最多 8 列、字号 8、重复表头 |
| 宽表格 | A3 横向、最多 16 列、字号 7、重复表头 |
| 打印友好 | A4 纵向、最多 6 列、字号 9、重复表头 |

高级参数不直接展开，除非用户点击“更多布局设置”。

## 命名记忆规则

新增统一状态：`displayName`。

规则：
1. 本地上传时，默认 `displayName = 原始文件名去扩展名`。
2. 用户在转换前修改输出名时，保存为 `displayName`。
3. 上传到云盘的对象仍可带 UUID，但用户可见名必须使用 `displayName`。
4. 调用 `convertExistingFile` / `convertFile` 时必须传 `displayName`。
5. 后端输出文件名使用 `displayName + "." + output_ext`，必要时只在对象名前加 `task_id`，不能污染下载文件名。
6. 同一个文件再次转换时，前端记住最近一次 `displayName`，优先从 localStorage 的 `culcloud_conversion_names` 映射读取。

验收：
- 上传 `课程报告-终稿.docx`，转换 PDF 后下载建议名为 `课程报告-终稿.pdf`。
- 用户将输出名改为 `大数据课程报告`，转换结果建议名为 `大数据课程报告.pdf`。
- 云盘文件和本地文件路径一致。

## PDF 编辑体验重构

### 阶段 1：把当前页面管理器做稳

目标：先解决卡顿、重叠、错位，不冒充完整编辑器。

调整：
- 页面缩略图容器固定 `aspect-ratio: 3 / 4`、固定最小宽高。
- 拖拽使用明确占位，不用 grid + y-axis Reorder 的混合模型。
- 大于 20 页启用虚拟化或分页，避免一次性渲染大量 PNG。
- 旋转只影响预览 transform，导出时由后端按 page config 处理。
- 禁止拖拽过程中图片重新加载，预加载完成后再允许排序。
- 删除“分布式网格就绪/12 worker”等未验证文案。

阶段 1 交付名：`PDF 工作台`，能力为加载、追加合并、删除、旋转、排序、导出。

### 阶段 2：实现真正 PDF 编辑

目标：让“PDF 编辑”名副其实。

能力：
- pdf.js canvas 阅读器：缩放、翻页、页码跳转、适配宽度。
- annotation layer：高亮、矩形、箭头、文本框。
- 元素交互：选中、拖拽、缩放、删除。
- 每页独立批注状态。
- pdf-lib 导出：将批注写回 PDF 坐标。

体验验收：
- 1440×900 与 1920×1080 下无重叠、无错位。
- 50 页 PDF 页面切换不卡顿。
- 拖拽批注 60fps 目标，低端环境可降级但不能卡死。
- 导出 PDF 中批注位置与屏幕预览误差小于 5px 等效比例。

### 阶段 3：命名与云盘闭环

- 编辑导出文件名默认 `原文件名_edited.pdf`。
- 用户可修改导出名。
- 导出后写入云盘并进入最近文件/最近任务。

## 任务重排

| 优先级 | 任务 | 说明 |
| --- | --- | --- |
| P0 | 路由/Sidebar 角色隔离 | 先把 user/admin 边界修正 |
| P0 | ConvertCenter 白名单与参数简化 | 只做高保真能力 |
| P0 | 转换命名记忆 | 上传名、输出名、下载名一致 |
| P0 | PDF 工作台稳定化 | 先修卡顿、重叠、错位 |
| P1 | PDF 真编辑阶段 2 | pdf.js + annotation layer + pdf-lib |
| P1 | 测试补齐 | 路由隔离、转换白名单、命名、PDF 交互 |
| P2 | 实验转换能力折叠区 | 非核心，不影响主流程 |
| P0 | 云盘文件分类细化 | 按 pdf/docx/xlsx/png-jpeg/svg/txt/md/zip-rar/other 展示全局分类 |
| P0 | 下午文档工程路线 | 从 docx 模板、政策截图、数据分析图、系统设计图到最终 LaTeX 编译形成闭环 |

## 下午文档工程 Sprint 路线

目标：在功能口径稳定后，把课程大作业文档工程推进到可编译、可截图、可追溯的交付状态。

| 顺序 | 工作项 | 产出 |
| --- | --- | --- |
| 1 | 针对 `docs/01-resources/课程大作业说明书-模板.docx` 手搓 LaTeX 模板 | `docs/02-process/document/latex/cit-template` 的结构、封面、目录、章节、图表样式与课程模板对齐 |
| 2 | 处理国家政策截图 | 国家政府文件 PDF 链接、政策截图、证据链说明 |
| 3 | 需求与市场分析跑图 | 对爬取数据集进行 Python 分析，使用中文兼容字体输出图表 |
| 4 | 系统设计素材准备 | 检索技术栈 logo 的 SVG/PNG，优先复用 `/Users/caolei/Desktop/springboot-lgg/docs/02-process/document/latex/分布式/figures` |
| 5 | 公式、算法、学术三线表设计 | 算法公式、关键指标定义、三线表说明 |
| 6 | 工程图 UML 生成 | 用例图、流程图、数据流图、实体关系图、整体系统架构图、模块架构图、状态图、时序图、活动图 |
| 7 | 关键路径 MVP 用户故事 | 形成截图清单与用户故事脚本，UI 截图由人工手动补拍 |
| 8 | 图片转 PDF 与最终编译 | 将相关图片转换/归档，完成 LaTeX 编译链路 |
| 9 | 文本内容和文章结构优化 | 对正文结构、引用、图表说明和章节衔接做最终润色 |

分工原则：
- 资料证据：政策合规、竞品、市场需求、真实参考文献 BibTeX。
- 数据分析：Python 清洗、中文字体跑图、图表说明。
- 工程设计：系统架构、UML、流程图、状态图、时序图。
- 报告集成：LaTeX 模板、图片 PDF 化、三线表、公式、最终编译。

## 验收标准

1. User sidebar 只出现：个人首页、我的云盘、文件转换、PDF 工作台。
2. User 端没有系统监控、任务监控、端口健康、PM2/Docker/集群入口。
3. Admin 端仍可进入 Analytics、SystemStatus、TaskMonitor。
4. ConvertCenter 默认只展示 P0 高保真白名单。
5. 转换参数默认极简，Excel 只暴露 3 个预设。
6. 转换输出文件名继承用户可见命名。
7. PDF 工作台不重叠、不错位，拖拽排序有占位且不卡顿。
8. 未实现的 PDF 批注能力不得以可用按钮展示。
9. PRD、代码、测试、UI 文案保持同一事实口径。

## 测试计划

| 测试 | 覆盖 |
| --- | --- |
| `role-routing.spec.ts` | user/admin 路由隔离，旧 localStorage 自动回落 |
| `sidebar-user.spec.ts` | user sidebar 五项且无 admin 项 |
| `convert-capability-whitelist.spec.ts` | 默认只展示 P0 高保真白名单 |
| `convert-rename-memory.spec.ts` | displayName 传递、转换后下载名继承 |
| `convert-simple-options.spec.ts` | 普通转换无复杂参数，Excel 三预设 |
| `pdf-page-organizer.spec.ts` | 加载、删除、旋转、排序、导出 |
| `pdf-layout-stability.spec.ts` | 拖拽无重叠/错位，页面容器尺寸稳定 |
| `admin-routes.spec.ts` | admin 能进入 analytics/system/tasks |
