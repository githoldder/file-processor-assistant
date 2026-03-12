# 文件处理全能助手 (File Processing All-in-One Helper)

<p align="center">
  <img src="https://img.shields.io/badge/version-v1.0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.11+-green" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18+-green" alt="React">
  <img src="https://img.shields.io/badge/Docker-24.0+-green" alt="Docker">
</p>

> 分布式文档处理系统 - 支持 PDF、Word、Excel、PPTX、Markdown、SVG、PNG 等格式转换

## 金字塔结构

```
文件处理全能助手 (v1.0.1)
├── 📦 核心应用 (Core Application)
│   ├── backend/          # FastAPI 后端服务
│   └── frontend/         # React 前端界面
│
├── 🐳 容器编排 (Container Orchestration)
│   ├── docker-compose.yml
│   ├── nginx.conf
│   ├── docker-config/
│   └── k8s/             # Kubernetes 部署配置
│
├── 🧪 测试 (Testing)
│   ├── tests/            # 测试套件
│   │   ├── e2e/         # 端到端测试
│   │   ├── integration/  # 集成测试
│   │   ├── unit/         # 单元测试
│   │   └── smoke/        # 冒烟测试
│   ├── test_samples/     # 测试样例文件
│   └── test_screenshots/ # 测试截图
│
├── 📚 文档 (Documentation)
│   ├── README.md         # 本文件
│   ├── CHANGELOG.md      # 更新日志
│   ├── SPEC.md          # 技术规格
│   ├── AGENTS.md        # Agent 配置
│   ├── 用户操作手册.md   # 用户使用指南
│   ├── 测试方案.md       # 测试方案
│   └── 回归测试计划-集成.md # 回归测试计划
│
└── 🔧 工具 (Tools)
    ├── tools/           # 辅助工具
    ├── ai_harness/       # AI 测试工具
    ├── reports/          # 测试报告
    └── logs/             # 日志目录
```

## 功能特性

### ✅ 已完成 (v1.0.0)

| 功能 | 状态 | 说明 |
|------|------|------|
| PDF → Word | ✅ | PDF 转 Word 文档 |
| PDF → 图片 | ✅ | PDF 转 PNG 图片 |
| Word → PDF | ✅ | Word 转 PDF |
| Excel → PDF | ✅ | Excel 转 PDF |
| PPTX → PDF | ✅ | PowerPoint 转 PDF |
| Markdown → PDF | ✅ | Markdown 转 PDF |
| 批量转换 | ✅ | 多文件批量处理 |
| 前端界面 | ✅ | React + TypeScript |
| API 接口 | ✅ | FastAPI REST API |
| 任务队列 | ✅ | Celery + Redis |
| 容器部署 | ✅ | Docker Compose |

### 🔄 转换支持矩阵

| 源格式 | 目标格式 | 状态 |
|--------|----------|------|
| PDF | Word | ✅ |
| PDF | 图片 (PNG) | ✅ |
| PDF | HTML | ✅ |
| Word | PDF | ✅ |
| Word | Markdown | ✅ |
| Excel | PDF | ✅ |
| Excel | CSV | ✅ |
| PPTX | PDF | ✅ |
| Markdown | PDF | ✅ |
| Markdown | HTML | ✅ |
| Markdown | Word | ✅ |
| PNG | PDF | ✅ |
| SVG | PNG | ✅ |
| SVG | PDF | ✅ |

## 快速开始

### 前置要求

- Docker 24.0+
- Docker Compose 2.0+
- Python 3.11+ (本地开发)
- Node.js 18+ (本地开发)

### 启动服务

```bash
# 1. 克隆项目
git clone https://github.com/githoldder/file-processor-assistant.git
cd file-processor-assistant

# 2. 启动所有服务
docker compose up -d

# 3. 访问前端
# 浏览器打开: http://localhost
```

### 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/convert` | POST | 单文件转换 |
| `/api/v1/convert/batch` | POST | 批量转换 |
| `/api/v1/tasks/{task_id}` | GET | 查询任务状态 |
| `/api/v1/tasks/{task_id}/download` | GET | 下载转换结果 |
| `/health` | GET | 健康检查 |

### 使用示例

```bash
# 转换 Word 为 PDF
curl -X POST "http://localhost/api/v1/convert?conversion_type=word_to_pdf" \
  -F "file=@/path/to/document.docx"

# 查询任务状态
curl http://localhost/api/v1/tasks/{task_id}

# 下载结果
curl http://localhost/api/v1/tasks/{task_id}/download -o output.pdf
```

## 测试

```bash
# 运行回归测试
python tests/e2e/test_regression_integration.py

# 快速测试
./run_quick_tests.sh

# 单元测试
pytest tests/unit/
```

## 技术栈

### 后端
- **FastAPI** - 现代 Python Web 框架
- **Celery** - 分布式任务队列
- **Redis** - 消息队列与缓存
- **PostgreSQL** - 数据库
- **Gotenberg** - 文档转换服务
- **PyMuPDF** - PDF 处理
- **python-docx** - Word 文档处理
- **openpyxl** - Excel 文档处理

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Framer Motion** - 动画
- **Lucide React** - 图标

### 基础设施
- **Docker** - 容器化
- **Nginx** - 反向代理
- **Kubernetes** - 容器编排 (可选)

## 项目结构

```
file-processor-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── models/          # 数据模型
│   │   ├── services/        # 业务逻辑
│   │   └── tasks/           # Celery 任务
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # 主应用组件
│   │   └── main.tsx        # 入口文件
│   ├── package.json
│   └── vite.config.ts
│
├── tests/
│   ├── e2e/               # 端到端测试
│   ├── integration/        # 集成测试
│   ├── unit/               # 单元测试
│   └── smoke/              # 冒烟测试
│
├── k8s/                    # Kubernetes 配置
│   ├── 00-namespace.yaml
│   ├── 01-configmap.yaml
│   ├── 02-pvc.yaml
│   └── ...
│
├── docker-compose.yml      # Docker Compose 配置
├── nginx.conf              # Nginx 配置
└── README.md               # 本文件
```

## 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_URL` | `redis://redis:6379/0` | Redis 连接地址 |
| `DATABASE_URL` | PostgreSQL 连接字符串 | 数据库地址 |
| `GOTENBERG_URL` | `http://gotenberg:3000` | Gotenberg 服务地址 |
| `UPLOAD_DIR` | `/app/uploads` | 文件上传目录 |

### 端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 80 | Nginx HTTP |
| API | 8000 | FastAPI |
| Gotenberg | 3001 | 文档转换服务 |
| Flower | 5555 | Celery 监控 |

## 常见问题

### Q: 转换失败怎么办？
A: 检查日志 `docker compose logs celery_conversion`

### Q: 如何查看任务状态？
A: 访问 Flower: http://localhost:5555

### Q: 支持大文件转换吗？
A: 当前配置支持最大 100MB 文件

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 版本历史

- **v1.0.0** (2026-03-11) - 初始版本
  - 核心转换功能
  - 前端界面
  - Docker 部署
  - E2E 测试

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件

---

<p align="center">
  Made with ❤️ by 文件处理全能助手
</p>
