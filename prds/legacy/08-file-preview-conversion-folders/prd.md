# PRD: 文件预览、轻量转换集成与文件夹云盘能力

## 1. User Story

作为一名平台用户，我希望上传到云盘的常见文件可以直接在线预览，并且文件转换中心能够覆盖旧版文件处理系统中已经验证过的日常转换能力。同时，我希望云盘支持创建文件夹和上传文件夹，让文件管理逻辑更接近日常网盘体验。

## 2. 背景与现状

当前 `feature/minio-s3-integration` 已合并到 `master`，项目具备真实 MinIO/S3 云盘存储能力：

- 文件上传、列表、下载、重命名、删除已接入 `culcloud-bucket`
- 转换中心可从 MinIO bucket 读取文件，也可从本地上传文件
- 转换结果会写回 `culcloud-bucket/conversions/`
- PM2 已管理前端 dev/build/preview

当前缺口：

- “我的文件”只有元信息弹窗，没有真正文件预览
- 后端 `DocumentConverter` 已包含旧系统大部分转换方法，但 API dispatch 只暴露少量格式
- 云盘缺少创建文件夹和文件夹上传能力
- 前端文件列表仍偏平铺，缺少目录前缀导航

旧系统参考路径：

- `99-archive/file-processor/README.md`
- `99-archive/file-processor/SPEC.md`
- `99-archive/file-processor/backend/app/services/converter.py`
- `99-archive/file-processor/backend/app/tasks/convert_tasks.py`

## 3. 核心目标

### 3.1 文件预览

支持以下日常文件预览：

| 类型 | 格式 | 预览策略 |
|------|------|----------|
| Office | `.pptx`, `.xlsx`, `.xls`, `.docx` | 后端生成 PDF 或 HTML 预览，再由前端 iframe/object 展示 |
| 文档 | `.pdf`, `.md`, `.txt` | PDF 直接流式展示；Markdown 渲染为安全 HTML；TXT 以纯文本方式展示 |
| 图片 | `.png`, `.jpg`, `.jpeg`, `.svg` | 直接使用安全 API URL 预览；SVG 需以 image 或 sanitized text 方式处理 |

### 3.2 轻量转换集成

参考旧版 `file-processor-assistant`，在当前轻量架构里暴露已存在的转换能力，优先保持同步任务 + Redis 状态模型，不引入 Celery 重队列：

- PDF → Word, Images, HTML
- Word → PDF, Markdown
- Excel → PDF, CSV
- PPTX → PDF, Images
- Markdown → PDF, HTML, Word
- SVG → PNG, PDF
- PNG/JPG/JPEG → PDF
- PNG → SVG, ICO

### 3.3 文件夹能力

- 支持创建逻辑文件夹，即在 MinIO 中创建 `prefix/.keep`
- 支持前端文件夹上传，保留 `webkitRelativePath`
- 支持按目录前缀浏览、返回上级目录、文件夹删除
- 上传到文件夹时对象名应保持目录结构，例如 `documents/reports/a.docx`

## 4. 非目标

- 本阶段不引入 PostgreSQL 元数据库
- 本阶段不恢复旧系统 Celery + Worker 分布式架构
- 本阶段不做复杂 Office 在线编辑
- 本阶段不做权限/分享/多人协作
- 本阶段不做视频、音频、压缩包预览

## 5. 验收标准

- [ ] 在“我的文件”中点击 `.pdf` 可直接预览 PDF
- [ ] `.md` 可渲染为 HTML 预览，`.txt` 可显示纯文本
- [ ] `.png`, `.jpg`, `.jpeg`, `.svg` 可在预览弹窗中显示
- [ ] `.docx`, `.xlsx/.xls`, `.pptx` 可生成并展示 PDF 或 HTML 预览
- [ ] 预览产物缓存到 MinIO `previews/` 前缀，重复预览优先复用缓存
- [ ] 转换中心前端可选择旧系统支持的轻量转换类型
- [ ] 后端 `/api/v1/convert` 和 `/api/v1/convert/existing` 覆盖 PRD 中列出的轻量转换矩阵
- [ ] 本地文件转换后，原文件进入云盘，转换结果进入 `conversions/`
- [ ] 支持创建文件夹，并在文件列表中显示为目录
- [ ] 支持上传整个文件夹，并保持相对路径
- [ ] 支持进入文件夹、返回上级和按当前目录刷新
- [ ] E2E 覆盖：文件夹创建、文件夹上传、图片预览、PDF 预览、Markdown/TXT 预览、Office 预览、云端文件转换
- [ ] PM2 dev/preview 与 Docker Compose API/MinIO 环境可完整跑通

## 6. API 设计草案

### 6.1 文件夹与目录

```text
POST /api/v1/files/folders
Form: path=<folder/path>

GET /api/v1/files?prefix=<folder/path>

DELETE /api/v1/files/folders/{prefix:path}
```

### 6.2 文件夹上传

```text
POST /api/v1/files/upload
Form:
  file=<binary>
  relative_path=<optional folder/name.ext>
  prefix=<optional destination folder>
```

### 6.3 文件预览

```text
GET /api/v1/preview/{object_name:path}
GET /api/v1/preview/{object_name:path}/content
DELETE /api/v1/preview/{object_name:path}
```

预览响应示例：

```json
{
  "status": "success",
  "object_name": "docs/demo.docx",
  "preview_type": "pdf",
  "preview_object_name": "previews/docs/demo.docx.pdf",
  "content_url": "/api/v1/preview/docs/demo.docx/content",
  "cached": true
}
```

### 6.4 转换能力

```text
GET /api/v1/convert/capabilities
POST /api/v1/convert
POST /api/v1/convert/existing
```

## 7. 任务地图

见 `prd.json`。

## 8. 风险与实现建议

- Office 预览优先走 Gotenberg 转 PDF；失败时再走纯文本/HTML fallback
- Markdown 渲染要避免直接插入不受控 HTML，可使用后端转义或前端安全渲染策略
- SVG 预览要避免脚本执行，优先通过 `<img src="/api/.../content">` 展示，不直接 innerHTML
- 大文件预览应限制大小并给出友好提示，避免阻塞 API
- MinIO prefix 不是物理目录，文件夹删除需要确认是否递归删除
- 转换矩阵先暴露 `DocumentConverter` 已存在方法，避免把旧系统 Celery 复杂度搬回来
