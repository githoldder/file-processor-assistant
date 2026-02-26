# AI Agent Harness - 自主运行AI开发系统

基于 Anthropic 的 [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 研究实现。

## 系统架构

```
AI Harness/
├── core/
│   ├── state/           # 状态管理 (跨会话持久化)
│   │   └── manager.py   # 状态、Git、工具执行器
│   └── orchestration/   # 任务编排
│       └── manager.py   # Agent基类、编排器
├── agents/
│   ├── initializer/     # 初始化Agent
│   │   └── agent.py     # 设置环境、生成feature列表
│   ├── coding/          # 编码Agent
│   │   └── agent.py     # 增量开发、提交代码
│   ├── tester/          # 测试Agent
│   │   └── agent.py     # 端到端测试、QA检查
│   └── deployer/        # 部署Agent
│       └── agent.py     # CI/CD配置、部署
└── web/
    └── main.py          # FastAPI Web界面
```

## 核心特性

### 1. 长时间运行支持
- **会话管理**: 每个新会话从上一个会话的进度继续
- **状态持久化**: 通过 `.ai_harness/state.json` 追踪进度
- **Feature列表**: `features.json` 记录所有功能及状态

### 2. Agent分工
| Agent | 职责 |
|-------|------|
| Initializer | 创建SPEC.md、生成feature列表、初始化git |
| Coding | 增量开发、一次实现一个功能、提交代码 |
| Tester | 单元测试、E2E测试、QA检查 |
| Deployer | CI/CD配置、构建部署 |

### 3. 工作流

```
用户输入需求
    ↓
Initializer Agent (第1次会话)
    - 生成 SPEC.md
    - 生成 features.json (100+ 功能)
    - 创建项目结构
    ↓
Coding Agent (循环)
    - 读取进度文件
    - 选择最高优先级功能
    - 实现并测试
    - 提交代码
    ↓
Test Agent
    - 运行测试
    - 验证功能
    ↓
Deploy Agent
    - 配置 CI/CD
    - 部署上线
```

## 启动方式

```bash
# 1. 安装依赖
cd ai_harness
pip install -r requirements.txt

# 2. 设置API Key (可选，用于真实AI调用)
export ANTHROPIC_API_KEY="your-api-key"

# 3. 启动Web API
python web/main.py
# 访问 http://localhost:8001

# 4. 或直接使用Python API
python main.py
```

## API 接口

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/projects | 创建项目 |
| GET | /api/projects | 列出项目 |
| GET | /api/projects/{id} | 项目状态 |
| POST | /api/projects/{id}/start | 启动开发 |
| POST | /api/projects/{id}/session | 运行单次会话 |
| POST | /api/projects/{id}/test | 运行测试 |
| POST | /api/projects/{id}/deploy | 部署项目 |
| POST | /api/projects/{id}/cicd | 配置CI/CD |

## 使用示例

```python
from ai_harness.main import AIHarness

# 创建harness
harness = AIHarness(workspace_dir="/path/to/workspace")

# 创建项目
project = harness.create_project(
    name="My Web App",
    description="A modern web application",
    spec={
        "type": "webapp",
        "tech_stack": {"react": "^18.2.0"},
        "features": [...]
    }
)

# 启动开发
await harness.start_project(project.id)
```

## 核心文件

- `SPEC.md` - 项目规格说明
- `features.json` - 功能列表及状态
- `claude-progress.txt` - 会话进度日志
- `.ai_harness/state.json` - 项目状态

## 技术亮点

1. **增量开发**: 一次只做一个功能，避免"一下做太多"
2. **状态追踪**: 每次会话结束提交代码，记录进度
3. **自动测试**: 端到端测试验证功能正确性
4. **CI/CD集成**: 自动配置GitHub Actions等
