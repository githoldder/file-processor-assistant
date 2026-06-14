# PRD08 实施计划：文件预览、轻量转换集成与文件夹云盘能力

> 日期：2026-05-12  
> 来源 PRD：`prds/08-file-preview-conversion-folders/prd.md`  
> 建议分支：`feature/file-preview-conversion-folders`  
> 目标：在现有 FastAPI + React + MinIO + Redis + Gotenberg 轻量架构内，补齐真实文件预览、完整轻量转换矩阵、目录式云盘体验与自动化验收。

## 1. 当前基线

### 1.1 已具备能力

- 后端已有 FastAPI 路由：`/api/v1/files`、`/api/v1/convert`、`/api/v1/tasks`。
- MinIO 已作为真实云盘存储，上传、列表、下载、重命名、删除已跑通。
- `DocumentConverter` 已包含大部分 PRD08 所需转换方法。
- 前端已有 `MyFiles`、`ConvertCenter` 两个核心页面，并已接入云端文件选择和云端转换。
- 测试目录已有后端 unit/integration、blackbox、Playwright E2E 基础。

### 1.2 主要缺口

- `backend/app/routers/convert.py` 的 dispatch 当前只暴露 `pdf_to_word`、`word_to_pdf`、`excel_to_pdf`、`pptx_to_pdf`、`pdf_to_html`，未覆盖 PRD08 完整矩阵。
- `backend/app/models/schemas.py` 缺少 `jpg_to_pdf`、`jpeg_to_pdf`，且 capabilities API 尚未建立。
- `backend/app/routers/files.py` 是全量递归平铺列表，没有 prefix 浏览、逻辑文件夹、文件夹上传和递归删除。
- 预览 service 与 `/api/v1/preview` 路由尚未存在，MyFiles 预览弹窗仍是占位 UI。
- 前端 API service 尚无 preview、folder、capabilities 封装。
- E2E 尚未覆盖 PRD08 的文件夹、预览、完整云端转换路径。

## 2. 实施原则

- 继续保持轻量架构：同步/BackgroundTasks + Redis 状态，不引入 Celery、PostgreSQL 或权限体系。
- MinIO 中仍以对象名作为主标识；目录通过 prefix 和 `.keep` 对象表达。
- 预览与转换产物全部写回同一 bucket，分别使用 `previews/`、`conversions/` 前缀。
- 先保证日常文件的可用闭环，再处理高级质量问题，例如 Office 复杂版式还原。
- 安全边界前置：Markdown 不直接信任原始 HTML，SVG 不 innerHTML，大文件预览设置上限和友好失败状态。

## 3. 分阶段计划

### Phase 0：能力矩阵与接口契约

目标：先把“能做什么”固化成后端唯一事实来源，前端动态消费。

任务：

- 新增转换能力映射，例如 `backend/app/services/conversion_capabilities.py`。
- 给每个转换项定义：`id`、输入扩展名、输出扩展名、label、是否稳定、是否需要 Gotenberg、备注。
- 扩展 `ConversionType`：补齐 `JPG_TO_PDF`、`JPEG_TO_PDF`。
- 新增 `GET /api/v1/convert/capabilities`，返回前端可直接渲染的矩阵。
- 为本地文件和云端文件使用同一套 target_format 校验逻辑。

验收：

- capabilities 覆盖 PRD08 conversion_scope。
- 前端不再硬编码 5 个转换选项作为唯一来源。

### Phase 1：后端转换 dispatch 补齐

目标：让 `/api/v1/convert` 与 `/api/v1/convert/existing` 都覆盖 PRD08 轻量转换矩阵。

任务：

- 将 `async_convert_task` 中的 if/elif 改为结构化 dispatch 表。
- 支持 bytes 输出、字符串输出、多文件输出三种结果形态。
- 多文件输出先打包为 zip，例如 `pdf_to_images`、`pptx_to_images`。
- 本地上传转换保持当前逻辑：先上传到云盘，再从云端对象进入转换，结果写入 `conversions/`。
- 对 `pptx_to_images` 当前空实现做风险标记：优先通过 PPTX -> PDF -> images 生成 zip，避免返回空列表。
- 统一 content type 与输出文件名，例如 `conversions/{task_id}.{ext}`。

验收：

- PRD08 conversion_scope 中每项都有明确 dispatch。
- 失败时 Redis task 状态能返回可读 error。

### Phase 2：后端文件夹与 prefix 浏览

目标：让云盘从平铺对象列表升级为目录式浏览。

任务：

- 扩展 `POST /api/v1/files/upload`：支持 `relative_path` 和 `prefix`。
- 新增 `POST /api/v1/files/folders`：创建 `normalized_prefix/.keep`。
- 扩展 `GET /api/v1/files?prefix=`：返回当前目录下的 `folders` 与 `files`，默认兼容旧 `files` 字段。
- 新增 `DELETE /api/v1/files/folders/{prefix:path}`：递归删除 prefix 下所有对象，含 `.keep`。
- 统一路径规范化：去掉前导 `/`、压缩重复 `/`、禁止 `..`。
- 文件列表默认过滤 `previews/`、`conversions/`、`.keep`，避免系统产物污染“我的文件”。

验收：

- 能创建文件夹、进入文件夹、返回上级、刷新当前目录。
- 上传文件夹时保留 `webkitRelativePath`。
- 删除文件夹能删除目录内对象并刷新列表。

### Phase 3：后端预览 service 与 preview 路由

目标：为 MyFiles 提供真实预览，不再只显示元信息。

任务：

- 新增 `backend/app/services/preview.py`。
- 新增 `backend/app/routers/preview.py` 并在 `main.py` 注册。
- `GET /api/v1/preview/{object_name:path}`：返回 preview metadata。
- `GET /api/v1/preview/{object_name:path}/content`：流式返回预览内容。
- `DELETE /api/v1/preview/{object_name:path}`：清理预览缓存。
- PDF：直接复用原文件作为 preview content。
- TXT：按纯文本返回，可限制最大读取大小。
- Markdown：转换为安全 HTML，禁用或转义原始 HTML。
- 图片：使用 `<img>` 可加载的 API content URL；SVG 以 image content 方式呈现。
- Office：优先调用现有 converter/Gotenberg 生成 PDF，缓存到 `previews/{object_name}.pdf`。
- 预览缓存命名中保留 object path，并考虑 object etag 或 last_modified，避免重命名/覆盖后的旧缓存误用。

验收：

- `.pdf`、`.md`、`.txt`、`.png`、`.jpg`、`.jpeg`、`.svg`、`.docx`、`.xlsx/.xls`、`.pptx` 均有 preview metadata。
- 重复预览命中 `cached: true`。
- 大文件和不支持格式返回友好错误，不阻塞 API。

### Phase 4：前端 API 与 MyFiles 体验

目标：MyFiles 具备接近日常网盘的目录管理和真实预览体验。

任务：

- 在 `file-cloud-frontend/src/services/api.ts` 增加：
  - `listFiles(prefix?: string)`
  - `uploadFile(file, { prefix, relativePath })`
  - `createFolder(path)`
  - `deleteFolder(prefix)`
  - `getPreview(objectName)`
  - `getPreviewContentUrl(objectName)`
  - `getConversionCapabilities()`
- `MyFiles.tsx` 增加当前目录状态、面包屑、进入文件夹、返回上级。
- 增加创建文件夹弹窗。
- 增加文件夹上传 input：`webkitdirectory`。
- 文件卡片区分 folder/file，文件夹使用 Folder 图标，文件使用按扩展名区分的图标。
- 预览弹窗按 preview_type 渲染：
  - `pdf`：`iframe` 或 `object`
  - `html`：安全 sandbox iframe
  - `text`：等宽文本区域
  - `image`：`img`
- 对预览生成中、失败、不支持格式提供明确状态。

验收：

- MyFiles 可以完成 PRD08 文件夹与预览全部用户路径。
- 文本不溢出按钮/卡片，移动端弹窗可滚动且不遮挡主要操作。

### Phase 5：ConvertCenter 动态转换矩阵

目标：转换中心根据文件类型呈现可用转换项，避免用户选到无效目标。

任务：

- 启动时拉取 `/api/v1/convert/capabilities`。
- 选择本地或云端文件后，根据扩展名筛选目标转换。
- 默认目标格式由 capabilities 的 priority 或第一个稳定项决定。
- 云端文件选择列表支持当前目录或全局搜索时，至少不显示 folder。
- 转换失败时显示 task error，不只显示“转换失败”。

验收：

- PDF、Word、Excel、PPTX、Markdown、SVG、PNG、JPG/JPEG 选择后均能看到对应可用转换项。
- 前端无法提交 capabilities 不支持的 target_format。

### Phase 6：测试与验证

目标：用低成本测试覆盖高风险行为，再用 E2E 验证完整用户路径。

后端测试：

- capabilities 覆盖完整矩阵。
- conversion dispatch 对每个 `ConversionType` 有映射。
- prefix normalize 拒绝 `..`、绝对路径和空非法名称。
- folder create/list/delete 行为可用 MinIO mock 或测试 bucket 覆盖。
- preview type 识别、缓存命中、content type 正确。

E2E 测试：

- 创建文件夹并进入。
- 上传单文件到当前文件夹。
- 上传文件夹并保留相对路径。
- 图片预览。
- PDF 预览。
- Markdown/TXT 预览。
- Office 预览。
- 云端文件转换并下载结果。

建议命令：

```bash
pytest tests/backend
pytest tests/blackbox
cd tests/e2e && npm test
```

### Phase 7：文档与收尾

目标：让 PRD08 的交付边界可复盘。

任务：

- 更新 `README.md`：补充 preview、folder、capabilities API。
- 更新 `docs/02-process/进度总结.md`：记录 PRD08 已完成项、测试结果、已知限制。
- 如 Office 复杂预览存在限制，写入“已知限制”，避免验收时误判。
- 保留 PRD08 与本计划文档的引用关系。

## 4. 建议开发顺序

1. 后端 capabilities + dispatch 表。
2. 后端 folder/prefix API。
3. 后端 preview service + preview router。
4. 前端 api.ts 封装。
5. MyFiles 目录导航、文件夹上传、真实预览。
6. ConvertCenter 动态 capabilities。
7. 后端测试、E2E、文档收尾。

这个顺序的好处是先稳定服务端契约，再改前端交互；MyFiles 的工作量最大，应在接口稳定后集中处理。

## 5. 关键风险与处理策略

| 风险 | 影响 | 处理策略 |
|------|------|----------|
| Office -> PDF 依赖 Gotenberg 稳定性 | 预览和转换失败 | 保留 fallback；失败时返回明确状态；E2E 在 Docker Compose 环境跑 |
| `pptx_to_images` 当前实现为空 | 验收失败 | 改为 PPTX -> PDF -> images -> zip |
| Markdown/SVG XSS | 安全风险 | Markdown 转义或 sanitize；SVG 只以 img/content URL 展示 |
| MinIO prefix 不是物理目录 | 文件夹删除/列表易错 | 统一 `.keep` 约定和 prefix normalize |
| 预览缓存与源文件更新不一致 | 用户看到旧预览 | preview key 加 etag/last_modified，或源对象变动时删除旧缓存 |
| 大文件预览阻塞 API | 体感差、超时 | 设置大小上限；异步生成；返回 processing/failed 状态 |
| 前端 object_name URL 编码 | 路径含 `/` 时接口 404 | 统一用 `encodeURIComponent(objectName)`，后端 path 参数解析 |

## 6. 最小可交付切片

如需先交一个可演示版本，建议范围如下：

- 文件夹：创建、进入、返回上级、单文件上传到当前目录。
- 预览：PDF、TXT、Markdown、图片先完整闭环。
- 转换：补齐 dispatch 表中已有稳定方法，不稳定项显示明确失败原因。
- 前端：MyFiles 真实预览弹窗 + ConvertCenter capabilities 动态选项。

Office 预览、文件夹上传、完整 E2E 可作为第二切片，但最终 PRD08 验收必须补齐。

## 7. Definition of Done

- PRD08 所有验收项有实现或明确限制说明。
- `/api/v1/convert/capabilities` 覆盖完整转换矩阵。
- `/api/v1/preview` 支持 PRD08 预览格式并有 MinIO 缓存。
- `/api/v1/files` 支持 prefix、folder、relative_path。
- MyFiles 可完成目录浏览、文件夹上传、真实预览。
- ConvertCenter 基于 capabilities 动态渲染转换选项。
- 后端测试和 Playwright E2E 覆盖 PRD08 主路径。
- README/进度总结更新完成。
