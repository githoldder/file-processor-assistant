import os
import json
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field
import uuid

from core.state.manager import StateManager, GitManager
from core.orchestration.manager import Agent, Orchestrator, TaskQueue
from agents.initializer.agent import InitializeAgent
from agents.coding.agent import CodingAgent
from agents.tester.agent import TestAgent, QAEngineer
from agents.deployer.agent import DeployerAgent, InfrastructureAgent


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Project:
    id: str
    name: str
    description: str
    spec: Dict[str, Any]
    status: str = "created"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    features_total: int = 0
    features_completed: int = 0


class AIHarness:
    """
    Main AI Agent Harness System

    Implements the long-running agent pattern from Anthropic's research:
    - Initializer Agent: Sets up project environment
    - Coding Agent: Implements features incrementally
    - Test Agent: Verifies implementations
    - Deploy Agent: Handles deployment

    Key features:
    - Multi-session support with state persistence
    - Feature list tracking
    - Git-based progress tracking
    - Automated CI/CD setup
    """

    def __init__(self, workspace_dir: str, api_key: Optional[str] = None):
        self.workspace = Path(workspace_dir)
        self.workspace.mkdir(parents=True, exist_ok=True)

        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            logger.warning("No API key provided - running in mock mode")

        self.projects: Dict[str, Project] = {}
        self.task_queue = TaskQueue()

        # Initialize orchestrator
        self.orchestrator = Orchestrator(str(self.workspace))

        # Register agents
        self._init_agents()

    def _init_agents(self):
        """Initialize all agents"""
        # Initialize agent
        self.init_agent = InitializeAgent(
            name="initializer", project_dir=str(self.workspace), api_key=self.api_key
        )

        # Coding agent
        self.coding_agent = CodingAgent(
            name="coding", project_dir=str(self.workspace), api_key=self.api_key
        )

        # Test agent
        self.test_agent = TestAgent(
            name="tester", project_dir=str(self.workspace), api_key=self.api_key
        )

        # Deploy agent
        self.deploy_agent = DeployerAgent(
            name="deployer", project_dir=str(self.workspace), api_key=self.api_key
        )

        # Register with orchestrator
        self.orchestrator.register_agent("initializer", self.init_agent)
        self.orchestrator.register_agent("coding", self.coding_agent)
        self.orchestrator.register_agent("tester", self.test_agent)
        self.orchestrator.register_agent("deployer", self.deploy_agent)

    def create_project(self, name: str, description: str, spec: Dict) -> Project:
        """Create a new project"""
        project_id = str(uuid.uuid4())

        project = Project(id=project_id, name=name, description=description, spec=spec)

        self.projects[project_id] = project

        # Create project directory
        project_dir = self.workspace / name.lower().replace(" ", "_")
        project_dir.mkdir(parents=True, exist_ok=True)

        return project

    async def start_project(self, project_id: str) -> Dict:
        """Start developing a project"""
        project = self.projects.get(project_id)
        if not project:
            return {"error": "Project not found"}

        # Update project directory
        project_dir = self.workspace / project.name.lower().replace(" ", "_")

        # Update state manager
        state = StateManager(str(project_dir))
        git = GitManager(str(project_dir))

        # Step 1: Initialize project
        logger.info(f"[{project.name}] Initializing project...")
        init_result = await self.init_agent.execute({"spec": project.spec})

        project.features_total = init_result.get("features_count", 0)
        project.status = "initialized"

        # Step 2: Development loop
        logger.info(f"[{project.name}] Starting development...")

        while True:
            remaining = state.get_remaining_features()

            if not remaining:
                logger.info(f"[{project.name}] All features implemented!")
                break

            # Run coding session
            coding_result = await self.coding_agent.execute({"action": "develop"})

            if coding_result.get("status") == "all_complete":
                break

            # Run tests
            test_result = await self.test_agent.execute({"action": "test"})

            project.features_completed = state._read_state().get(
                "features_completed", 0
            )
            project.updated_at = datetime.now()

        project.status = "development_complete"

        return {
            "project_id": project_id,
            "status": "completed",
            "features_total": project.features_total,
            "features_completed": project.features_completed,
        }

    async def run_autonomous_session(self, project_id: str) -> Dict:
        """Run a single autonomous session"""
        project = self.projects.get(project_id)
        if not project:
            return {"error": "Project not found"}

        project_dir = self.workspace / project.name.lower().replace(" ", "_")

        # Run through orchestrator
        result = await self.orchestrator.run_autonomous_session(project.spec)

        return {"session_id": result.get("session_id"), "status": result.get("status")}

    def get_project_status(self, project_id: str) -> Dict:
        """Get project status"""
        project = self.projects.get(project_id)
        if not project:
            return {"error": "Project not found"}

        project_dir = self.workspace / project.name.lower().replace(" ", "_")

        # Read state
        state = StateManager(str(project_dir))
        state_data = state._read_state()

        # Get git log
        git = GitManager(str(project_dir))
        git_log = git.get_log(5)

        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "features_total": project.features_total,
                "features_completed": project.features_completed,
            },
            "state": state_data,
            "recent_commits": git_log,
        }

    def list_projects(self) -> List[Dict]:
        """List all projects"""
        return [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "features_completed": p.features_completed,
                "features_total": p.features_total,
                "created_at": p.created_at.isoformat(),
            }
            for p in self.projects.values()
        ]


async def demo():
    """Demo the AI Harness"""
    harness = AIHarness("/tmp/ai_harness_demo")

    # Create a project spec
    spec = {
        "name": "AI Task Manager",
        "description": "A modern task management application",
        "type": "webapp",
        "tech_stack": {"react": "^18.2.0", "typescript": "^5.3.0", "vite": "^5.0.0"},
        "features": [
            {
                "category": "functional",
                "description": "User can create new tasks",
                "priority": 1,
            },
            {
                "category": "functional",
                "description": "User can mark tasks as complete",
                "priority": 1,
            },
            {
                "category": "functional",
                "description": "Tasks persist in localStorage",
                "priority": 2,
            },
        ],
    }

    # Create project
    project = harness.create_project(
        name="Task Manager", description="AI-powered task management", spec=spec
    )

    print(f"Created project: {project.name} ({project.id})")

    # Note: This would run actual AI agents in production
    # await harness.start_project(project.id)

    print("Project created successfully!")
    print("To run full development, provide ANTHROPIC_API_KEY")


if __name__ == "__main__":
    asyncio.run(demo())
