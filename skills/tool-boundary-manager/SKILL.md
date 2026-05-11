---
name: tool-boundary-manager
description: "Guidelines for managing process and environment tool boundaries (PM2 vs Docker) and configuring automation testing pipelines."
---

# 工具边界管理

根据架构和流程规范，针对环境与进程的管理，提供以下工具边界的划分和最佳实践：

## PM2 (Process Manager 2)
**定位**：Node.js 世界的“管家”和“保镖”，负责本地进程生命周期管理。
**核心边界**：
- **适用场景**：轻量级本地后台运行（如脚本、Agent）、本地多项目极速调试（降低 CPU 和内存压力）、非容器化轻量部署（资源有限情况）。
- **不适用场景**：需要完全隔离的运行环境（如容器化、跨环境交付）。
- **本地开发建议**：单项目可用 `npm run dev`；处理 3 个以上项目时，使用 PM2 解决找 PID、杀进程的低级体力活。
- **最佳实践**：配合 `ecosystem.config.js` 文件实现一键启动、环境变量管理和多进程监控（`pm2 monit`）。

## Docker
**定位**：运行环境的“集装箱”，负责跨环境一致性。
**核心边界**：
- **适用场景**：多组件协作（如 MySQL+Redis+Python+Node）、跨环境交付（上云或交付甲方）、隔离性要求高的场景。
- **最佳实践**：
  1. 不要把标准数据库（如 MySQL/Redis）封入自己的业务镜像，应通过 docker-compose 调用官方标准镜像并配置 `volumes`（数据卷）以防数据丢失。
  2. 针对纯前端/静态项目，可以直接在 Docker 镜像内包含 Nginx 配置，挂载打包好的 `dist` 目录进行开箱即用的交付。
  3. **测试态**：使用 Docker Compose 在本地拉起与生产环境 100% 一致的沙箱环境。

## 自动化测试推荐流程 (Vibe Coding SOP)
- **开发态（单元测试/逻辑微调）**：在 `npm run dev` 阶段运行，配合 AI 快速验证。注意 dev 模式有 HMR 开销及路径差异，不适合跑 E2E。
- **测试态（冒烟测试/黑盒测试/UI 交互）**：**必须在 `npm run build && npm run preview` 下进行。**
  - **原因**：这能 100% 还原线上生产环境（含代码压缩和 Tree Shaking），不产生脏数据，并且执行速度最快。
  - **SOP 联动**：
    1. 构建并预览：执行 `npm run build && npm run preview`。
    2. 沙箱环境：配合 Docker 启动本地沙箱测试数据库，以防污染真实数据。
    3. 运行 E2E（如 `npx playwright test`），指向 `preview` 提供的 URL（如 http://localhost:4173）。
- **交付态**：
  - 商业/甲方项目：打包 Docker 镜像，一次构建到处运行。
  - 个人/轻量项目：Vercel / Cloudflare Pages 走 Serverless，免运维。
