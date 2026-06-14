# CulCloud Platform 熵减诊断报告

Last Updated: 2026-06-14 22:10

## 当前状态

- 分支：`v2-platform`
- 项目类型：长期课程工程项目，不是一次性轻任务。
- 已存在核心工程目录：`backend/`、`file-cloud-frontend/`、`flask-analytics/`、`docker/`、`scripts/`、`tests/`、`docs/`、`prds/`、`context/`、`.agent/`。
- 根目录存在过程文档、运行产物和本地缓存混杂，Git 状态被 `.DS_Store`、`__pycache__`、`node_modules`、`venv`、Playwright 报告、Hadoop target 等噪声放大。

## 熵值等级

中熵。

代码主干的模块边界清楚，但治理入口、忽略规则和过程文档归档不够稳定；如果直接 `git add .`，会把大量本地运行产物和潜在私有配置混入提交。

## 主要问题

- 根目录课程阶段快照未归档，降低入口可读性。
- 根仓库缺少 `.gitignore`，导致缓存、报告、虚拟环境和本地环境文件持续进入 Git 状态。
- `.env` 和 `.DS_Store` 已被历史跟踪，需要从索引移除并保留本地文件。
- `Agent.md` 仍停留在早期 Spark+Flask 方案说明，未同步 2026-06-14 的 Sprint 总体规划和治理规范。
- `README.md` 链接里仍有旧的带空格路径，和实际仓库路径不一致。

## 本次整理方案

- 新增根 `.gitignore`，隔离本地环境、缓存、依赖、测试报告和构建产物。
- 将根目录课程阶段快照移动到 `docs/02-process/archive-snapshots/`。
- 将 Obsidian 中的项目进度总结吸收到项目治理入口，形成 repo 内可追踪版本。
- 更新 `Agent.md`，把它定义为本项目 Agent spec 入口。
- 更新 `README.md`，让人类入口和目录说明与当前结构一致。
- 更新 `context/context.txt`，记录本次治理决策和下一步工作重点。

## 后续维护触发条件

- 根目录新增非代码文档超过 3 个时，立即归档到 `docs/02-process/` 或 `prds/`。
- Sprint 结束时更新 `prds/md`、`prds/json` 和 `context/context.txt`。
- commit 前必须执行 `git status --short`，并只 add 本次相关路径。
- push 前需要确认没有 `.env`、缓存、测试报告或本地构建产物进入暂存区。
