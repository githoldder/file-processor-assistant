import os
import json
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import uuid


class AgentType(Enum):
    INITIALIZER = "initializer"
    CODING = "coding"
    TESTER = "tester"
    DEPLOYER = "deployer"


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"


@dataclass
class ProjectSpec:
    name: str
    description: str
    requirements: List[str]
    tech_stack: Dict[str, str]
    features: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class FeatureItem:
    category: str
    description: str
    steps: List[str]
    passes: bool = False
    priority: int = 1


@dataclass
class Task:
    id: str
    name: str
    agent_type: AgentType
    status: TaskStatus
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    session_id: Optional[str] = None


@dataclass
class Session:
    id: str
    project_name: str
    status: str
    current_agent: Optional[AgentType] = None
    features_completed: int = 0
    total_features: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)


class StateManager:
    """Manages project state across multiple context windows"""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.state_file = self.project_dir / ".ai_harness" / "state.json"
        self.progress_file = self.project_dir / "claude-progress.txt"
        self.features_file = self.project_dir / "features.json"
        self.init()

    def init(self):
        self.project_dir.mkdir(parents=True, exist_ok=True)
        (self.project_dir / ".ai_harness").mkdir(exist_ok=True)

        if not self.state_file.exists():
            self._write_state(
                {
                    "session_id": str(uuid.uuid4()),
                    "current_session": 0,
                    "features_completed": 0,
                    "last_feature": None,
                    "project_status": "initialized",
                }
            )

    def _read_state(self) -> Dict:
        if self.state_file.exists():
            with open(self.state_file) as f:
                return json.load(f)
        return {}

    def _write_state(self, state: Dict):
        with open(self.state_file, "w") as f:
            json.dump(state, f, indent=2)

    def get_session_id(self) -> str:
        return self._read_state().get("session_id", str(uuid.uuid4()))

    def increment_session(self):
        state = self._read_state()
        state["current_session"] = state.get("current_session", 0) + 1
        state["session_id"] = str(uuid.uuid4())
        self._write_state(state)

    def update_progress(self, feature: str, status: str):
        state = self._read_state()
        state["last_feature"] = feature
        state["last_status"] = status
        state["last_activity"] = datetime.now().isoformat()
        self._write_state(state)

    def increment_features_completed(self):
        state = self._read_state()
        state["features_completed"] = state.get("features_completed", 0) + 1
        self._write_state(state)

    def write_progress(self, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self.progress_file, "a") as f:
            f.write(f"[{timestamp}] {message}\n")

    def write_feature_list(self, features: List[Dict]):
        with open(self.features_file, "w") as f:
            json.dump(features, f, indent=2)

    def read_features(self) -> List[Dict]:
        if self.features_file.exists():
            with open(self.features_file) as f:
                return json.load(f)
        return []

    def get_remaining_features(self) -> List[Dict]:
        features = self.read_features()
        return [f for f in features if not f.get("passes", False)]


class GitManager:
    """Manages git operations for the project"""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)

    def init_repo(self):
        if not (self.project_dir / ".git").exists():
            subprocess.run(["git", "init"], cwd=self.project_dir, check=True)
            subprocess.run(
                ["git", "commit", "--allow-empty", "-m", "Initial commit"],
                cwd=self.project_dir,
                check=True,
            )

    def commit(self, message: str):
        subprocess.run(["git", "add", "-A"], cwd=self.project_dir, check=True)
        subprocess.run(
            ["git", "commit", "-m", message], cwd=self.project_dir, check=True
        )

    def get_log(self, count: int = 20) -> List[str]:
        result = subprocess.run(
            ["git", "log", f"--oneline", f"-{count}"],
            cwd=self.project_dir,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip().split("\n") if result.stdout else []

    def get_status(self) -> Dict:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=self.project_dir,
            capture_output=True,
            text=True,
        )
        return {
            "clean": len(result.stdout.strip()) == 0,
            "files": result.stdout.strip().split("\n") if result.stdout else [],
        }

    def create_branch(self, branch_name: str):
        subprocess.run(
            ["git", "checkout", "-b", branch_name], cwd=self.project_dir, check=True
        )

    def checkout_main(self):
        subprocess.run(["git", "checkout", "main"], cwd=self.project_dir, check=True)

    def merge(self, branch_name: str):
        subprocess.run(["git", "merge", branch_name], cwd=self.project_dir, check=True)


class ToolExecutor:
    """Executes tools for agents"""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)

    def run_bash(self, command: str, timeout: int = 300) -> Dict[str, Any]:
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.project_dir,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Command timed out",
                "stdout": "",
                "stderr": "Timeout",
            }
        except Exception as e:
            return {"success": False, "error": str(e), "stdout": "", "stderr": str(e)}

    def read_file(self, file_path: str) -> str:
        full_path = self.project_dir / file_path
        if full_path.exists():
            with open(full_path) as f:
                return f.read()
        return ""

    def write_file(self, file_path: str, content: str):
        full_path = self.project_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)

    def file_exists(self, file_path: str) -> bool:
        return (self.project_dir / file_path).exists()

    def list_files(self, pattern: str = "*") -> List[str]:
        return [
            str(p.relative_to(self.project_dir))
            for p in self.project_dir.rglob(pattern)
        ]
