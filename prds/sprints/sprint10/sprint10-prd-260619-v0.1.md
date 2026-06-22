# Sprint 10 PRD — 答辩后用户端体验增强与闭环补齐

Last Updated: 2026-06-19 00:30

## Object

将散落在 Sprint 04-09 及 PRD08 中超出答辩基线的未完成任务统一收敛，集中补齐用户端体验缺口：云盘现代化、PDF 阅读器与批注、转换中心能力全暴露、预览系统后端基建。不扩张新场景，只兑现已承诺的交付。

## 来源交叉索引

本 Sprint 从以下 PRD 中抽取未完成/未交付的任务：

| 来源 | 未完成任务 |
|------|-----------|
| PRD08 `legacy/08-file-preview-conversion-folders` | T1-T11（全部未实施） |
| Sprint 06 `sprint06-prd-260615-v0.1` | 图片转换前端暴露、TXT/MD→PDF 前端暴露 |
| Sprint 07 `sprint07-prd-260615-v0.1` | S07-T03-STEP02 热键 1-7（标记 done 但未实现） |
| Sprint 09 `sprint09-prd-260615-v0.1` | P3 云盘现代化、P4 PDF 叠层编辑 |
| Sprint 04 `sprint04-prd-260614-v0.1` | S04-T04 证据链文档未完成项 |
| Sprint 08 `sprint08-prd-260615-v0.1` | S08-T01~T05 全部需迭代 2 轮至可交付状态 |

## Out Of Scope

- 不接入 Firebase/生产鉴权。
- 不引入 Celery/PostgreSQL。
- 不做 3D Globe/three.js。
- 不制作 PDF→Word/Excel 的高保真转换（标注为实验性）。
- 不涉及视频/音频处理。
- 不改造管理员端大数据舱。

## Task Map

### S10-T01: 后端预览服务 (preview service + router)

**来源**: PRD08-T2, PRD08-T3, PRD08 Phase 3

在 `backend/app/services/preview.py` 新增预览服务，`backend/app/routers/preview.py` 新增预览路由，注册到 `main.py`。

支持格式及预览策略：

| 格式 | 策略 |
|------|------|
| `.pdf` | 直接复用原文件 stream |
| `.txt` | 安全纯文本返回，限制 5MB |
| `.md` | 后端转安全 HTML |
| `.png/.jpg/.jpeg` | 直接 stream 图片内容 |
| `.svg` | 以 `image/svg+xml` 方式 stream（不 innerHTML） |
| `.docx/.xlsx/.xls/.pptx` | 经 converter/Gotenberg → PDF 缓存到 `previews/` |

**API 设计**:
```
GET /api/v1/preview/{object_name:path}     → preview metadata
GET /api/v1/preview/{object_name:path}/content → stream content
DELETE /api/v1/preview/{object_name:path}   → 清除缓存
```

预览响应含 `cached` 字段标识是否命中缓存。

**验收**:
- 以上 8 种格式均有可验证 preview metadata
- 重复预览命中 `cached: true`
- 大文件和不支持格式返回友好错误，不阻塞 API

---

### S10-T02: 后端文件夹系统

**来源**: PRD08-T5, PRD08 Phase 2

扩展 `backend/app/routers/files.py`：

| API | 功能 |
|-----|------|
| `POST /api/v1/files/folders` | 创建 `{prefix}/.keep` |
| `GET /api/v1/files?prefix=` | 返回当前目录下的 `folders[]` + `files[]` |
| `DELETE /api/v1/files/folders/{prefix:path}` | 递归删除 prefix + .keep |
| `POST /api/v1/files/upload` | 新增 `prefix`、`relative_path` 参数 |

路径规范化：去掉前导 `/`、压缩重复 `/`、禁止 `..`。
默认过滤 `previews/`、`conversions/`、`.keep`。

---

### S10-T03: 前端 API 封装

**来源**: PRD08-T6

在 `file-cloud-frontend/src/services/api.ts` 新增：

```
listFiles(prefix?: string)
uploadFile(file, { prefix?, relativePath? })
createFolder(path)
deleteFolder(prefix)
getPreview(objectName)
getPreviewContentUrl(objectName)
getConversionCapabilities()
```

---

### S10-T04: 云盘现代化改造 (MyFiles)

**来源**: Sprint09-P3, PRD08-T7, PRD08 Phase 4, Sprint06-T02

改造 `MyFiles.tsx`：

- **面包屑**: 动态目录导航，显示当前路径，每段可点击返回
- **文件夹**: 创建文件夹弹窗、文件夹图标、进入/返回上级
- **文件夹上传**: `<input webkitdirectory>` 支持，保留相对路径
- **文件类型分类**: MIME Tab（PDF / 图片 / 文档 / 其他）
- **搜索高亮**: 匹配文字在文件名中高亮
- **文件图标**: 按扩展名区分（PDF → FilePdf, 图片 → ImageIcon, 文件夹 → FolderIcon）
- **预览弹窗**: 接入 `getPreview` API，按 `preview_type` 渲染：
  - `pdf` → `<iframe>` 或 `<object>`
  - `html` → sandbox `<iframe>`
  - `text` → 等宽 `<pre>` 区域
  - `image` → `<img>`
- **空/错误/加载/生成中** 状态补齐

---

### S10-T05: 转换中心能力全暴露

**来源**: PRD08-T8, PRD08 Phase 5, Sprint06-T03

- 调用 `GET /api/v1/convert/capabilities` 动态渲染转换选项
- 根据选中文件扩展名筛选可用目标格式
- 补齐前端缺失的转换选项：
  - 图片转换: SVG↔PNG, PNG↔ICO, JPG/PNG→PDF, PNG→SVG
  - 文档转换: Markdown→PDF/HTML/Word, Word→Markdown
  - PDF 操作: PDF→Images, PDF split/merge（独立入口）
- 分组归类：Office2PDF / ImageFactory / PDF Utils / Document

---

### S10-T06: PDF 阅读器与批注系统改造

**来源**: Sprint09-P4

用前端方案彻底改造 PDF Studio：

**PDF 阅读器** (pdfjs-dist):
- 惰性加载 `pdfjs-dist`（参考 LingoBridge 方案）
- Vite worker URL import（`?url` suffix）
- CDN CMap 加载（中文字体支持）
- 页面缓存（LRU，最多 5 页）
- 缩放适配、翻页、页码跳转

**批注叠层** (Fabric.js):
- 透明 `fabric.Canvas` 覆盖在 PDF Canvas 上方
- 工具：文本高亮（矩形/自由）、箭头、矩形/椭圆、文本框
- 选中/拖拽/缩放/删除批注元素
- 每页独立批注状态

**导出合成** (pdf-lib):
- 将批注坐标映射回 PDF 页面坐标
- 用 pdf-lib 在浏览器端将批注绘制到 PDF 上
- 导出含批注的新 PDF

**约束**: 不改后端，全部浏览器端完成。

---

### S10-T07: 管理员热键补齐

**来源**: Sprint07-T03-STEP02

- 在 `App.tsx` 或 `Analytics.tsx` 中增加全局 `keydown` 监听
- 热键映射：`1` Dashboard、`2` MyFiles、`3` ConvertCenter、`4` PDF Studio、`5` SystemStatus、`6` Health、`7` Analytics
- 仅在管理员角色下生效
- 不与其他浏览器快捷键冲突

---

### S10-T08: Mock 数据清理与 i18n 补齐

**来源**: 代码审计发现的跨 Sprint 缺口

- `Navbar.tsx`: 搜索按钮接入 `/api/v1/files` 搜索或本地 filter；通知按钮显示真实日志或移除红点
- `Dashboard.tsx`: 头像从 DiceBear 替换为可配置或用户首字母；用户名从硬编码改为从 context/API 获取
- `Navbar.tsx`: "Active Tasks: 24" 改为真实 `getQueueLength()` 调用
- 删除 `constants.ts`（已无引用）
- `SystemStatus.tsx` + `TaskMonitor.tsx` + `Analytics.tsx` 接入 `useLanguage()` i18n
- `MyFiles.tsx` 硬编码字符串翻译化（"Rename File"、"Cloud Preview Mode"、"File Metadata"、"Size"、"Last Modified"、"Save Changes"、"Cancel"）

---

### S10-T09: PRD08 遗留测试与文档

**来源**: PRD08-T9, PRD08-T10, PRD08-T11, PRD08 Phase 6-7

- 后端测试：capabilities 完整性、conversion dispatch 映射、prefix normalize、folder CRUD、preview type 识别
- Playwright E2E：文件夹创建/上传、图片/PDF/MD/TXT/Office 预览、云端文件转换
- 文档更新：README 补充 preview/folder/capabilities API

---

### S10-T10: 文档工程迭代优化（2 轮）

**来源**: Sprint08-T01~T05

Sprint 08 已跑通基线流程，但距离可交付仍有质量差距。需进行两轮迭代：

**第 1 轮 — 内容与结构对齐**:
- txt 章节：按证据链定稿，补充缺少的章节段落，对齐代码/接口/截图事实
- UML 工程图：修正冗余/不精确的图，补充缺失的视图（架构图、数据流、部署关系、核心流程）
- 技术栈 logo：确认 logo 齐全，替换低分辨率图
- UI 截图：补拍 Sprint 09 大屏和 Sprint 10 新功能的截图，确保全部来自真实运行页面
- LaTeX：对齐章节结构，修复缺图、Markdown 泄漏、引用错误

**第 2 轮 — 格式与交付审计**:
- LaTeX 编译审计：无 fatal error、overfull box、undefined reference
- PDF 视觉检查：截图检查每页排版、图片位置、表格越界、空白页
- 交叉引用完整性：所有 `\ref{}`、`\cite{}`、`\includegraphics{}` 路径正确
- Walkthrough 终审：文档来源、图表来源、截图来源、编译命令、PDF 路径、未解决风险
- 最终 PDF 放入 `docs/03-reports/`

**验收**:
- 两轮后 PDF 无排版问题、无缺图、无内容与事实不符
- LaTeX 编译 0 error, 0 warning（允许少量 overfull box）
- walkthrough 完成所有检查项

---

## Acceptance

- MyFiles 可完成目录浏览、文件夹上传、真实预览
- ConvertCenter 基于 capabilities 动态渲染所有可用转换
- PDF Studio 具备 pdf.js 阅读器 + Fabric.js 批注 + pdf-lib 导出
- 所有用户端页面 i18n 全覆盖
- mock 数据全部替换为真实接口或产品态空状态

## Implementation Notes

1. 开发顺序：后端基建优先（T01 preview → T02 folder → T03 API）→ 前端功能（T04 MyFiles → T05 ConvertCenter → T06 PDF Studio）→ 小修补（T07 hotkeys → T08 i18n/mock）→ 测试文档（T09）→ 文档迭代（T10 最后做）
2. PDF Studio 是工作量最大的单项，可拆为子阶段：先 pdf.js 阅读器（独立可用）→ 再加 Fabric.js 批注 → 最后 pdf-lib 导出
3. preview service 的 Office 预览依赖 Gotenberg，需确保 Docker Compose 环境
4. 所有预览内容输出走 API proxy（`/api/v1/preview/.../content`），不直接暴露 MinIO 内网地址
