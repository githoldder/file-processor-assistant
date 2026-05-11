# CulCloud Platform — 重构设计规格书

> **日期**: 2026-05-10  
> **状态**: 待确认  
> **分支**: `integration-mvp` → 将创建 `refactor/mvp-v2`

---

## 1. 项目定位

**CulCloud Platform** 是一个文件处理与云盘平台，提供文档格式转换和 MinIO 云存储服务。

### 1.1 MVP 目标

| 优先级 | 页面 | 功能 | 理由 |
|--------|------|------|------|
| **P0** | ConvertCenter | 上传→选格式→转换→下载 | 文件转换系统已做大半学期，代码成熟 |
| **P0** | MyFiles | 文件上传/浏览/删除/下载 | MinIO 可无缝适配，仅需 API 对接 |
| P2 | Dashboard | 统计面板 | Mock 数据展示即可，不阻塞 MVP |
| P2 | TaskMonitor | 任务监控 | 轻量实现 |
| P3 | PDFStudio | PDF 操作 | 后续迭代 |
| P3 | SystemStatus | 系统状态 | 后续迭代 |

### 1.2 核心约束

- **磁盘敏感**: 历史僵尸容器/镜像导致磁盘吃紧，Docker 镜像必须极度精简
- **轻量优先**: 用户体感流畅即可，不追求分布式高并发
- **快速跑通**: 前端已完成，重点是后端 API 跑通 + 前端对接

---

## 2. 架构设计

### 2.1 现状（废弃）

```
file-processor/ (❌ 全部废弃)
├── backend/          → 9 个 Docker 服务，重型分布式
│   ├── FastAPI + Celery (3 worker 队列) + Beat + Flower
│   ├── Redis + PostgreSQL + Gotenberg + Nginx
│   └── 文件通过 hex() 编码传递（性能瓶颈）
└── frontend/         → 旧前端，已被 file-cloud-frontend 取代
```

### 2.2 新架构

```
┌──────────────────────────────────────────────────┐
│              file-cloud-frontend                  │
│         React + Vite + TailwindCSS v4             │
│    (ConvertCenter / MyFiles / Dashboard ...)      │
└──────────┬───────────────────────────────────────┘
           │ REST API (fetch)
           ▼
┌──────────────────────────────────────────────────┐
│                   FastAPI                         │
│              (api container)                      │
│                                                   │
│  /api/v1/convert   → 文件转换（同步/异步）         │
│  /api/v1/files     → MinIO 文件 CRUD              │
│  /api/v1/tasks     → 任务状态查询                  │
│  /health           → 健康检查                      │
└──┬──────────┬──────────┬─────────────────────────┘
   │          │          │
   ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────────┐
│Redis │  │MinIO │  │Gotenberg │
│队列   │  │存储   │  │文档转换   │
│+缓存  │  │(S3)  │  │(Office)  │
└──────┘  └──────┘  └──────────┘
```

### 2.3 Docker Compose 服务清单（仅 4 个）

| 服务 | 镜像 | 端口 | 职责 | 磁盘预估 |
|------|------|------|------|---------|
| **api** | 自建 (python:3.11-slim) | 8000 | FastAPI 后端 | ~200MB |
| **redis** | redis:7-alpine | 内部 | 任务队列 + 缓存 | ~30MB |
| **minio** | minio/minio:latest | 9000/9001 | 对象存储 | ~100MB |
| **gotenberg** | gotenberg/gotenberg:8 | 内部 | 文档转换引擎 | ~700MB |
| | | | **总计** | **~1GB** |

> vs 旧方案 9 个服务 ~5GB+，精简 80%

---

## 3. 目录结构（重构后）

```
culcloud platform/
├── backend/                    # ✨ 新建 — 轻量后端
│   ├── app/
│   │   ├── main.py             # FastAPI 入口
│   │   ├── config.py           # 环境配置
│   │   ├── routers/
│   │   │   ├── convert.py      # 文件转换 API
│   │   │   ├── files.py        # MinIO 文件管理 API
│   │   │   └── tasks.py        # 任务查询 API
│   │   ├── services/
│   │   │   ├── converter.py    # 从旧代码提取的转换逻辑
│   │   │   ├── minio_client.py # MinIO S3 客户端
│   │   │   └── task_queue.py   # Redis 任务队列
│   │   └── models/
│   │       └── schemas.py      # Pydantic 数据模型
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── file-cloud-frontend/        # ✅ 保持现有 — 扩展 API 层
│   └── src/
│       └── services/
│           └── api.ts          # 扩展：添加转换、文件管理 API
│
├── docker-compose.yml          # ✨ 新建 — 4 服务编排
├── .env                        # 环境变量
│
├── context/                    # 保持 — 上下文管理
├── doc/superpowers/            # 保持 — 设计文档
│
└── file-processor/             # ⚠️ 移至 99-archive 或删除
```

---

## 4. API 设计

### 4.1 文件转换 API

```
POST   /api/v1/convert
  - multipart/form-data: file + target_format
  - 小文件同步返回转换结果
  - 大文件返回 task_id，异步处理

GET    /api/v1/convert/formats
  - 返回支持的转换格式矩阵
```

### 4.2 文件管理 API (MinIO)

```
POST   /api/v1/files/upload          # 上传文件到 MinIO
GET    /api/v1/files                  # 列出用户文件
GET    /api/v1/files/{file_id}        # 获取文件信息
GET    /api/v1/files/{file_id}/download  # 获取预签名下载 URL
DELETE /api/v1/files/{file_id}        # 删除文件
POST   /api/v1/files/folder           # 创建文件夹（MinIO 前缀）
```

### 4.3 任务 API

```
GET    /api/v1/tasks/{task_id}        # 查询转换任务状态
GET    /api/v1/tasks/{task_id}/download  # 下载转换结果
```

### 4.4 系统 API

```
GET    /health                        # 健康检查
GET    /api/v1/stats                  # Dashboard 统计数据
```

---

## 5. 技术选型

### 5.1 后端

| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | FastAPI | 异步高性能，自带 OpenAPI 文档 |
| 任务队列 | Redis + asyncio.create_task | 轻量级，无需 Celery 全家桶 |
| 文件存储 | MinIO (S3 兼容) | 前端已配置 endpoint，无缝对接 |
| 文档转换 | Gotenberg 8 + PyMuPDF | Office 格式走 Gotenberg，PDF 处理走 PyMuPDF |
| Python SDK | minio (官方) | S3 兼容 API |

### 5.2 从旧代码复用的部分

| 文件 | 复用内容 | 改造点 |
|------|---------|--------|
| converter.py (747行) | DocumentConverter 全部转换方法 | 去掉 hex 编码，直接传 bytes；去掉 MockCairoSVG hack |
| schemas.py (94行) | ConversionType 枚举、请求/响应模型 | 精简，去掉批处理相关 |

### 5.3 不复用的部分

| 文件 | 原因 |
|------|------|
| celery_config.py | 不再使用 Celery |
| convert_tasks.py / pdf_tasks.py | Celery task 包装，用 asyncio 替代 |
| main.py (旧) | 路由耦合严重，重写 |
| docker-compose.yml (旧) | 9 服务过重，重写 |

---

## 6. 数据流

### 6.1 文件转换流程

```
用户拖入文件 → ConvertCenter
        │
        ▼
POST /api/v1/convert (multipart)
        │
        ├─ 文件大小 < 10MB (同步)
        │   └─ DocumentConverter.xxx() → 直接返回转换结果
        │
        └─ 文件大小 >= 10MB (异步)
            ├─ 存入 MinIO temp bucket
            ├─ Redis 入队 task_id
            ├─ 返回 { task_id, status: "processing" }
            │
            └─ 后台 asyncio task
                ├─ 从 MinIO 取文件
                ├─ DocumentConverter.xxx()
                ├─ 结果存入 MinIO
                └─ Redis 更新状态 → SUCCESS
```

### 6.2 文件管理流程

```
MyFiles 页面
    │
    ├─ 上传: POST /api/v1/files/upload → MinIO put_object
    ├─ 列表: GET /api/v1/files → MinIO list_objects
    ├─ 下载: GET /api/v1/files/{id}/download → MinIO presigned_url
    └─ 删除: DELETE /api/v1/files/{id} → MinIO remove_object
```

---

## 7. 前端对接改造

### 7.1 api.ts 需扩展的函数

```typescript
// 现有 (3个)
uploadFile(file) → FileItem
getFileInfo(fileId) → FileItem
getHealth() → { status }

// 新增
convertFile(file, targetFormat) → { task_id } | Blob
getConvertFormats() → FormatMatrix
listFiles(prefix?) → FileItem[]
deleteFile(fileId) → void
getDownloadUrl(fileId) → string
getTaskStatus(taskId) → TaskStatus
downloadTaskResult(taskId) → Blob
getStats() → DashboardStats
```

### 7.2 ConvertCenter 改造点

| 现状 | 改造 |
|------|------|
| handleStartConversion: mock 定时器模拟进度 | 调用 convertFile() 真实 API |
| handleDownload: 生成假 Blob | 调用 downloadTaskResult() |
| 进度条: setInterval 每 50ms +2% | 小文件直接 100%，大文件轮询 getTaskStatus() |

### 7.3 MyFiles 改造点

| 现状 | 改造 |
|------|------|
| FILES 常量硬编码 5 条数据 | 调用 listFiles() 获取真实 MinIO 文件列表 |
| 上传按钮无功能 | 调用 uploadFile() → MinIO |
| 无删除/下载操作 | 调用 deleteFile() / getDownloadUrl() |

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Gotenberg 镜像大 (~700MB) | 磁盘占用 | 首次拉取后保留；若不需要 Office 转换可暂时去掉 |
| MinIO 首次配置 | 需创建 bucket | docker-compose entrypoint 自动初始化 |
| converter.py 依赖 CairoSVG | macOS 本地需要 cairo 库 | Docker 内已包含；本地开发可 skip SVG 转换 |
| 旧代码 hex 编码模式 | 性能差，大文件 OOM | 重构为直接 bytes/文件路径传递 |
| 前端 CORS | 开发环境跨域 | FastAPI CORS middleware 已配置 * |
