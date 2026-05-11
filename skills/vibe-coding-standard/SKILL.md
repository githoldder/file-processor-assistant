---
name: vibe-coding-standard
description: "AI-driven development standards focusing on Git SOP, Skill distillation, and Harness atomic task execution."
---

# Vibe Coding 标准规范

## 1. Git 版本管理 SOP
- **原子化存档**：每次完成一个“原子化任务”并通过测试后，必须进行 Git Commit。
- **分支管理**：
  - `main`: 始终保持稳定。
  - `feature/*`: 新功能开发。
  - `bug/*`: 紧急修复。
- **回档机制**：AI 写崩代码时，立即使用 `git reset --hard` 回退。

## 2. 流水线构建与 Skill 蒸馏
- **边际成本趋零**：AI 的价值在于“生成”而非“重复执行”。
- **Skill 固化原则**：如果一个任务需要重复 3 次以上（如爬虫、测试、部署），必须将其蒸馏为确定性的脚本（Bash/Playwright CLI）。
- **Skill 目录结构**：存放于 `skills/` 目录下，包含 `SKILL.md` 指南及相关脚本。

## 3. Harness 工程规范 (Ralph 原理)
- **原子化拆分**：将 User Story 拆分为单轮迭代（最多 25 轮循环）可完成的小任务。
- **三件套记忆**：
  - `prd.json`: 结构化任务清单，跟踪进度。
  - `progress.txt`: 经验日志，记录踩坑及解决方案。
  - **Git 提交**: 每轮迭代的物理成果记录。
- **验收标准**：任务验收标准必须量化且明确，减少 AI 钻空子的空间。
- **全新上下文**：每轮迭代应尽量保持上下文清醒，完成任务后标记 `done`。

## 4. 开发回避准则
- **严禁 TODO**：禁止生成 `//TODO` 等占位符，必须实现或明确标记为原子任务。
- **环境对齐**：所有测试必须在与生产环境一致的沙箱（如 `docker-compose` 或 `npm run preview`）中进行。
