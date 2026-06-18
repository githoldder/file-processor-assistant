# 架构决策记录 (ADR)：分层服务治理方案 (PM2 + Docker Compose)

**日期**：2026-06-14  
**状态**：已批准 (Approved)  

---

## 1. 背景与上下文 (Context)

CulCloud 平台是一个面向学术演示与大数据分析的分布式文件处理平台，集成了 React 前端、FastAPI 后端、Flask 分析 API、Redis 缓存、MinIO 对象存储、Gotenberg PDF 转换引擎以及 Hadoop/Spark 计算架构。

在本地开发与答辩演示环境下，我们面临以下挑战：
1. **容器化开销**：像 Spark、Hadoop、MinIO 这类有状态、多实例的基础设施如果脱离容器运行，本地环境配置极其繁琐（涉及 JVM 依赖、路径变量、网络冲突）。
2. **快速热更新**：前端界面（React）和 Flask 分析服务是演示的核心交互点。如果在答辩前需要微调 CSS 或修改分析逻辑，全量 Docker 镜像构建、重启耗时过长，影响开发调试效率。
3. **资源隔离与状态管理**：Redis 和 Gotenberg 需要完全一致的隔离环境与网络端口映射。

---

## 2. 决策：分层服务治理 (Decoupled Governance)

我们决定采用 **混合服务管理器模式**，将系统分为 **基础设施层 (Infrastructure Layer)** 与 **应用演示层 (Application/Demo Layer)**：

```
┌─────────────────────────────────────────────────────────┐
│              应用演示层 (Application Layer)              │
│  使用 PM2 管理进程，保证热重载和极速调试体验。                 │
│  - React (Vite Dev Server)   → http://localhost:5173     │
│  - Flask (Analytics API)     → http://localhost:5050     │
└────────────────────────────────────────────┬────────────┘
                                             │ 端口通信
┌────────────────────────────────────────────▼────────────┐
│            基础设施层 (Infrastructure Layer)            │
│  使用 Docker Compose 管理有状态容器，保证一致性。            │
│  - FastAPI (Platform API)    → http://localhost:8000     │
│  - Redis                     → redis:6379 / localhost:6379
│  - MinIO (Object Storage)    → minio:9000 / localhost:9010
│  - Gotenberg (PDF Engine)    → gotenberg:3000 / localhost:3000
│  - Spark & Hadoop Cluster    → (Containerized Yarn)      │
└─────────────────────────────────────────────────────────┘
```

### 详细分工：
1. **Docker Compose** 管理：
   - `FastAPI`: 后端核心，容器内部运行，暴露端口 8000。
   - `Redis`: 缓存和任务队列服务，暴露端口 6379。
   - `MinIO`: 对象存储，API 暴露 9000，Console 暴露 9010。
   - `Gotenberg`: PDF/Office 转换容器，暴露端口 3000。
2. **PM2** 管理：
   - `frontend-dev`: Vite 驱动的前端应用，监听端口 5173，支持保存自动刷新。
   - `flask-analytics`: 大屏数据分析层，监听端口 5050，便于实时修改数据提取脚本和分析口径。

---

## 3. 答辩核心逻辑与 Q&A 口径 (Defense Oral logic)

### Q1: 为什么不把所有组件都容器化到 Docker Compose 里部署？
> **标准回答**：  
> “在生产环境中，我们确实会使用 K8s 或全 Docker Compose 进行统一编排。但在本系统的**演示与开发模式**下，前端 UI 以及 Flask 分析层是演示中迭代最频繁的模块（例如答辩前的图表微调、演示数据修正）。PM2 提供了秒级的热重载能力，而不需要每次修改一行 CSS 都要重新 build 几百兆的 Docker 镜像。这是一种**‘基础设施强一致，应用迭代高敏捷’的分层治理策略**。”

### Q2: 前后端以及分析服务是如何跨环境通信的？
> **标准回答**：  
> “Docker 容器内的服务通过桥接网络（Bridge Network）互相发现。宿主机上的 PM2 应用通过本机 localhost 端口映射直接与 Docker 容器通信（例如 React 前端调用 localhost:8000，Flask 调用 localhost:6379 并通过 localhost:5050 响应前端大屏）。网络拓扑清晰，接口边界明确。”

---

## 4. 后果与验收 (Consequences)
- 架构图口径与项目 `README.md`、`Agent.md` 保持完全一致。
- 提高了开发效率，前端和 Flask 代码改动可在 1 秒内生效，而无需进行 Docker 镜像重建。
