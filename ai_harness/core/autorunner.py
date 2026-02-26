import os
import json
import asyncio
import logging
import signal
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import uuid
import hashlib

from core.state.manager import StateManager, GitManager, ToolExecutor
from core.orchestration.manager import Agent
from agents.initializer.agent import InitializeAgent
from agents.coding.agent import CodingAgent
from agents.tester.agent import TestAgent
from agents.deployer.agent import DeployerAgent


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ProjectStatus(Enum):
    PENDING = "pending"
    INITIALIZING = "initializing"
    DEVELOPING = "developing"
    TESTING = "testing"
    DEPLOYING = "deploying"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING_APPROVAL = "waiting_approval"


@dataclass
class Requirement:
    id: str
    name: str
    description: str
    priority: int = 1
    status: str = "pending"
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Project:
    id: str
    name: str
    requirements: str
    spec: Dict[str, Any]
    status: ProjectStatus
    progress: float = 0.0
    features_total: int = 0
    features_completed: int = 0
    current_session: int = 0
    max_sessions: int = 100
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    deployed_url: Optional[str] = None
    approval_required: bool = True
    approved: bool = False


class AutoRunner:
    """
    完全自主运行的AI开发系统

    特性:
    - 自动接收需求并开始开发
    - 循环执行直到完成或达到最大会话数
    - 每次功能完成后自动测试
    - 完成后请求用户验收
    - 验收通过后自动部署
    """

    def __init__(
        self,
        workspace_dir: str,
        api_key: Optional[str] = None,
        max_sessions_per_project: int = 100,
        auto_approve: bool = False,
        auto_deploy: bool = True,
    ):
        self.workspace = Path(workspace_dir)
        self.workspace.mkdir(parents=True, exist_ok=True)

        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.max_sessions = max_sessions_per_project
        self.auto_approve = auto_approve
        self.auto_deploy = auto_deploy

        self.projects: Dict[str, Project] = {}
        self.requirements_queue: List[Requirement] = []

        self.running = False
        self.current_project_id: Optional[str] = None

        # Initialize agents
        self._init_agents()

        logger.info(f"AutoRunner initialized at {workspace_dir}")
        logger.info(f"Max sessions per project: {max_sessions_per_project}")
        logger.info(f"Auto approve: {auto_approve}, Auto deploy: {auto_deploy}")

    def _init_agents(self):
        """Initialize all agents"""
        self.init_agent = InitializeAgent(
            name="initializer", project_dir=str(self.workspace), api_key=self.api_key
        )

        self.coding_agent = CodingAgent(
            name="coding", project_dir=str(self.workspace), api_key=self.api_key
        )

        self.test_agent = TestAgent(
            name="tester", project_dir=str(self.workspace), api_key=self.api_key
        )

        self.deploy_agent = DeployerAgent(
            name="deployer", project_dir=str(self.workspace), api_key=self.api_key
        )

    def submit_requirement(self, name: str, description: str, priority: int = 1) -> str:
        """提交一个新的开发需求"""
        req_id = str(uuid.uuid4())[:8]

        requirement = Requirement(
            id=req_id, name=name, description=description, priority=priority
        )

        self.requirements_queue.append(requirement)

        # Sort by priority (higher first)
        self.requirements_queue.sort(key=lambda x: -x.priority)

        logger.info(f"Requirement submitted: {name} (ID: {req_id})")

        return req_id

    def submit_from_file(self, file_path: str) -> List[str]:
        """从文件批量提交需求"""
        path = Path(file_path)

        if not path.exists():
            logger.error(f"File not found: {file_path}")
            return []

        content = path.read_text()

        # Try to parse as JSON
        try:
            data = json.loads(content)
            if isinstance(data, list):
                requirements = data
            else:
                requirements = [data]
        except json.JSONDecodeError:
            # Treat as plain text - one requirement
            requirements = [{"name": path.stem, "description": content}]

        ids = []
        for req in requirements:
            priority_val = req.get("priority", 1)
            try:
                priority_int = int(priority_val)
            except (ValueError, TypeError):
                priority_int = 1

            req_id = self.submit_requirement(
                name=req.get("name", "Unnamed Project"),
                description=req.get("description", req.get("name", "")),
                priority=priority_int,
            )
            ids.append(req_id)

        logger.info(f"Submitted {len(ids)} requirements from {file_path}")
        return ids

    def start(self):
        """启动自主运行循环"""
        self.running = True

        logger.info("=" * 60)
        logger.info("AutoRunner Started - Fully Autonomous Mode")
        logger.info("=" * 60)

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Run the main loop
        asyncio.run(self._run_loop())

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info("Received shutdown signal, stopping...")
        self.running = False

    async def _run_loop(self):
        """Main execution loop"""
        while self.running:
            try:
                # Check if there's a project to work on
                if not self.current_project_id:
                    # Get next pending requirement
                    req = self._get_next_requirement()

                    if req:
                        # Create new project
                        project = self._create_project(req)
                        self.current_project_id = project.id
                        await self._process_project(project)
                    else:
                        # No work to do, wait
                        logger.info("No pending requirements, waiting...")
                        await asyncio.sleep(30)
                else:
                    # Continue current project
                    project = self.projects.get(self.current_project_id)
                    if project and project.status not in [
                        ProjectStatus.COMPLETED,
                        ProjectStatus.FAILED,
                    ]:
                        await self._process_project(project)
                    else:
                        self.current_project_id = None

                # Small delay between iterations
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)
                await asyncio.sleep(5)

    def _get_next_requirement(self) -> Optional[Requirement]:
        """Get next requirement to process"""
        for req in self.requirements_queue:
            if req.status == "pending":
                return req
        return None

    def _create_project(self, requirement: Requirement) -> Project:
        """Create a new project from requirement"""
        project_id = str(uuid.uuid4())[:12]

        # Generate spec from requirement
        spec = self._generate_spec(requirement)

        project = Project(
            id=project_id,
            name=requirement.name,
            requirements=requirement.description,
            spec=spec,
            status=ProjectStatus.INITIALIZING,
            max_sessions=self.max_sessions,
        )

        self.projects[project_id] = project

        # Create project directory
        project_dir = self.workspace / project_id
        project_dir.mkdir(parents=True, exist_ok=True)

        # Update requirement status
        requirement.status = "processing"

        logger.info(f"Created project: {project.name} (ID: {project_id})")

        return project

    def _generate_spec(self, requirement: Requirement) -> Dict:
        """Generate project specification from requirement"""
        return {
            "name": requirement.name,
            "description": requirement.description,
            "type": "webapp",
            "tech_stack": {
                "react": "^18.2.0",
                "typescript": "^5.3.0",
                "vite": "^5.0.0",
            },
            "features": [
                {
                    "category": "functional",
                    "description": req_feature.strip(),
                    "priority": 1,
                }
                for req_feature in requirement.description.split("\n")
                if req_feature.strip()
            ][:50],  # Limit to 50 features
        }

    async def _process_project(self, project: Project):
        """Process a single project through the full pipeline"""
        project_dir = self.workspace / project.id

        try:
            # Initialize agents with project directory
            state = StateManager(str(project_dir))
            git = GitManager(str(project_dir))
            tools = ToolExecutor(str(project_dir))

            # Update state
            project.current_session += 1
            project.updated_at = datetime.now()

            logger.info(
                f"[{project.id}] Session {project.current_session}/{project.max_sessions}"
            )

            # Phase 1: Initialize (only on first session)
            if project.current_session == 1:
                project.status = ProjectStatus.INITIALIZING
                logger.info(f"[{project.id}] Initializing project...")

                await self._run_initialize(project, project_dir)

                project.status = ProjectStatus.DEVELOPING

            # Phase 2: Development (loop until complete or max sessions)
            remaining_features = state.get_remaining_features()

            if remaining_features and project.current_session < project.max_sessions:
                project.status = ProjectStatus.DEVELOPING

                # Run coding session
                await self._run_coding(project, project_dir, state, git)

                # Run tests
                await self._run_testing(project, project_dir, state)

            # Check if done
            remaining_features = state.get_remaining_features()

            if not remaining_features:
                # All features complete!
                project.status = ProjectStatus.COMPLETED
                project.completed_at = datetime.now()
                project.progress = 100.0

                logger.info(f"[{project.id}] All features completed!")

                # Request approval (or auto-approve)
                if self.auto_approve:
                    project.approved = True
                    await self._deploy_project(project, project_dir)
                else:
                    project.status = ProjectStatus.WAITING_APPROVAL
                    logger.info(f"[{project.id}] Waiting for user approval...")

            elif project.current_session >= project.max_sessions:
                project.status = ProjectStatus.FAILED
                project.error = f"Max sessions ({project.max_sessions}) reached"
                logger.warning(f"[{project.id}] Max sessions reached")

        except Exception as e:
            logger.error(f"[{project.id}] Error processing project: {e}", exc_info=True)
            project.status = ProjectStatus.FAILED
            project.error = str(e)
            self.current_project_id = None

    async def _run_initialize(self, project: Project, project_dir: Path):
        """Run initialization phase"""
        logger.info(f"[{project.id}] Running initializer...")

        # Initialize agent
        init_agent = InitializeAgent(
            name="initializer", project_dir=str(project_dir), api_key=self.api_key
        )

        result = await init_agent.execute({"spec": project.spec})

        project.features_total = result.get("features_count", 0)

        logger.info(
            f"[{project.id}] Initialized with {project.features_total} features"
        )

    async def _run_coding(
        self, project: Project, project_dir: Path, state: StateManager, git: GitManager
    ):
        """Run coding session"""
        logger.info(f"[{project.id}] Running coding session...")

        coding_agent = CodingAgent(
            name="coding", project_dir=str(project_dir), api_key=self.api_key
        )

        # Get remaining features
        remaining = state.get_remaining_features()

        if not remaining:
            return

        # Run coding session
        result = await coding_agent.execute(
            {"action": "develop", "feature": remaining[0]}
        )

        # Update progress
        features_completed = state._read_state().get("features_completed", 0)
        project.features_completed = features_completed

        if project.features_total > 0:
            project.progress = (features_completed / project.features_total) * 100

        logger.info(
            f"[{project.id}] Progress: {project.progress:.1f}% ({features_completed}/{project.features_total})"
        )

    async def _run_testing(
        self, project: Project, project_dir: Path, state: StateManager
    ):
        """Run testing phase"""
        logger.info(f"[{project.id}] Running tests...")

        test_agent = TestAgent(
            name="tester", project_dir=str(project_dir), api_key=self.api_key
        )

        result = await test_agent.execute({"action": "test"})

        passed = result.get("passed", 0)
        failed = result.get("failed", 0)

        logger.info(f"[{project.id}] Tests: {passed} passed, {failed} failed")

    async def _deploy_project(self, project: Project, project_dir: Path):
        """Deploy completed project"""
        logger.info(f"[{project.id}] Deploying project...")

        project.status = ProjectStatus.DEPLOYING

        deploy_agent = DeployerAgent(
            name="deployer", project_dir=str(project_dir), api_key=self.api_key
        )

        # Setup CI/CD first
        await deploy_agent.execute({"action": "setup_cicd", "platform": "github"})

        # Try to build
        build_result = await deploy_agent.execute({"action": "build"})

        # Try deployment
        deploy_result = await deploy_agent.execute(
            {"action": "deploy", "target": "docker"}
        )

        project.deployed_url = "docker://localhost"

        logger.info(f"[{project.id}] Deployment complete!")

    def approve_project(self, project_id: str) -> bool:
        """Approve a project for deployment"""
        project = self.projects.get(project_id)

        if not project:
            logger.error(f"Project not found: {project_id}")
            return False

        if project.status != ProjectStatus.WAITING_APPROVAL:
            logger.warning(f"Project {project_id} not waiting approval")
            return False

        project.approved = True

        # Trigger deployment
        asyncio.create_task(self._deploy_project(project, self.workspace / project.id))

        return True

    def reject_project(self, project_id: str, reason: str) -> bool:
        """Reject a project"""
        project = self.projects.get(project_id)

        if not project:
            return False

        project.error = f"Rejected: {reason}"
        project.status = ProjectStatus.FAILED

        self.current_project_id = None

        return True

    def get_status(self) -> Dict:
        """Get system status"""
        return {
            "running": self.running,
            "current_project": self.current_project_id,
            "pending_requirements": len(
                [r for r in self.requirements_queue if r.status == "pending"]
            ),
            "projects": {
                "total": len(self.projects),
                "completed": len(
                    [
                        p
                        for p in self.projects.values()
                        if p.status == ProjectStatus.COMPLETED
                    ]
                ),
                "failed": len(
                    [
                        p
                        for p in self.projects.values()
                        if p.status == ProjectStatus.FAILED
                    ]
                ),
                "in_progress": len(
                    [
                        p
                        for p in self.projects.values()
                        if p.status in [ProjectStatus.DEVELOPING, ProjectStatus.TESTING]
                    ]
                ),
                "waiting_approval": len(
                    [
                        p
                        for p in self.projects.values()
                        if p.status == ProjectStatus.WAITING_APPROVAL
                    ]
                ),
            },
        }

    def list_projects(self) -> List[Dict]:
        """List all projects with status"""
        return [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status.value,
                "progress": p.progress,
                "features_completed": p.features_completed,
                "features_total": p.features_total,
                "current_session": p.current_session,
                "created_at": p.created_at.isoformat(),
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                "error": p.error,
                "deployed_url": p.deployed_url,
                "approved": p.approved,
            }
            for p in self.projects.values()
        ]

    def get_project_details(self, project_id: str) -> Optional[Dict]:
        """Get detailed project information"""
        project = self.projects.get(project_id)

        if not project:
            return None

        project_dir = self.workspace / project_id

        # Get git log
        git = GitManager(str(project_dir))
        git_log = git.get_log(10)

        # Get state
        state = StateManager(str(project_dir))
        state_data = state._read_state()

        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "requirements": project.requirements,
                "status": project.status.value,
                "progress": project.progress,
                "features_completed": project.features_completed,
                "features_total": project.features_total,
                "current_session": project.current_session,
                "max_sessions": project.max_sessions,
                "created_at": project.created_at.isoformat(),
                "completed_at": project.completed_at.isoformat()
                if project.completed_at
                else None,
                "error": project.error,
                "deployed_url": project.deployed_url,
                "approved": project.approved,
            },
            "git_log": git_log,
            "state": state_data,
        }

    def wait_for_completion(self, project_id: str, timeout: int = 3600) -> Dict:
        """Wait for project to complete (blocking)"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            project = self.projects.get(project_id)

            if not project:
                return {"status": "not_found"}

            if project.status in [ProjectStatus.COMPLETED, ProjectStatus.FAILED]:
                return {
                    "status": project.status.value,
                    "project": self.get_project_details(project_id),
                }

            time.sleep(5)

        return {"status": "timeout"}
