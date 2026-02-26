import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import asyncio


app = FastAPI(title="AI Agent Harness API", version="1.0.0")

# In-memory storage (replace with database in production)
harness_instance = None
projects_storage = {}


class ProjectSpec(BaseModel):
    name: str
    description: str
    type: str = "webapp"
    tech_stack: Dict[str, str] = {}
    features: List[Dict[str, Any]] = []


class TaskRequest(BaseModel):
    project_id: str
    action: str
    data: Dict[str, Any] = {}


def get_harness():
    """Get or create harness instance"""
    global harness_instance
    if harness_instance is None:
        from main import AIHarness

        api_key = os.getenv("ANTHROPIC_API_KEY")
        harness_instance = AIHarness(
            workspace_dir="/tmp/ai_harness_workspace", api_key=api_key
        )
    return harness_instance


@app.get("/")
async def root():
    return {
        "name": "AI Agent Harness System",
        "version": "1.0.0",
        "description": "Autonomous AI development pipeline",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/projects")
async def create_project(spec: ProjectSpec):
    """Create a new project"""
    harness = get_harness()

    project = harness.create_project(
        name=spec.name, description=spec.description, spec=spec.dict()
    )

    projects_storage[project.id] = project

    return {"project_id": project.id, "name": project.name, "status": project.status}


@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    harness = get_harness()
    return harness.list_projects()


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details"""
    harness = get_harness()
    status = harness.get_project_status(project_id)

    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])

    return status


@app.post("/api/projects/{project_id}/start")
async def start_project(project_id: str, background_tasks: BackgroundTasks):
    """Start autonomous development"""
    harness = get_harness()

    if project_id not in projects_storage:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run in background
    async def run_dev():
        await harness.start_project(project_id)

    background_tasks.add_task(run_dev)

    return {"message": "Development started", "project_id": project_id}


@app.post("/api/projects/{project_id}/session")
async def run_session(project_id: str):
    """Run a single autonomous session"""
    harness = get_harness()

    result = await harness.run_autonomous_session(project_id)

    return result


@app.post("/api/projects/{project_id}/test")
async def run_tests(project_id: str):
    """Run tests on project"""
    harness = get_harness()
    project_dir = Path("/tmp/ai_harness_workspace") / project_id.lower().replace(
        " ", "_"
    )

    # Import test agent
    from agents.tester.agent import TestAgent

    test_agent = TestAgent(name="tester", project_dir=str(project_dir))

    result = await test_agent.execute({"action": "test"})

    return result


@app.post("/api/projects/{project_id}/deploy")
async def deploy_project(project_id: str, target: str = "docker"):
    """Deploy project"""
    harness = get_harness()
    project_dir = Path("/tmp/ai_harness_workspace") / project_id.lower().replace(
        " ", "_"
    )

    from agents.deployer.agent import DeployerAgent

    deploy_agent = DeployerAgent(name="deployer", project_dir=str(project_dir))

    result = await deploy_agent.execute({"action": "deploy", "target": target})

    return result


@app.post("/api/projects/{project_id}/cicd")
async def setup_cicd(project_id: str, platform: str = "github"):
    """Set up CI/CD"""
    harness = get_harness()
    project_dir = Path("/tmp/ai_harness_workspace") / project_id.lower().replace(
        " ", "_"
    )

    from agents.deployer.agent import DeployerAgent

    deploy_agent = DeployerAgent(name="deployer", project_dir=str(project_dir))

    result = await deploy_agent.execute({"action": "setup_cicd", "platform": platform})

    return result


@app.get("/api/projects/{project_id}/files")
async def list_project_files(project_id: str):
    """List project files"""
    project_dir = Path("/tmp/ai_harness_workspace") / project_id.lower().replace(
        " ", "_"
    )

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    files = []
    for f in project_dir.rglob("*"):
        if f.is_file():
            files.append(str(f.relative_to(project_dir)))

    return {"files": files}


@app.get("/api/projects/{project_id}/files/{file_path:path}")
async def read_project_file(project_id: str, file_path: str):
    """Read a project file"""
    project_dir = Path("/tmp/ai_harness_workspace") / project_id.lower().replace(
        " ", "_"
    )
    full_path = project_dir / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    with open(full_path) as f:
        content = f.read()

    return {"content": content}


@app.post("/api/tasks")
async def create_task(request: TaskRequest):
    """Create a task"""
    harness = get_harness()
    harness.task_queue.add_task(
        {
            "project_id": request.project_id,
            "action": request.action,
            "data": request.data,
        }
    )

    return {"status": "task_created"}


@app.get("/api/tasks/status")
async def get_task_status():
    """Get task queue status"""
    harness = get_harness()
    return harness.task_queue.get_status()


@app.get("/api/features")
async def get_supported_features():
    """Get supported agent features"""
    return {
        "agents": [
            {
                "name": "initializer",
                "description": "Sets up project environment and creates feature list",
                "capabilities": [
                    "Create SPEC.md",
                    "Generate feature list",
                    "Set up project structure",
                    "Initialize git repository",
                ],
            },
            {
                "name": "coding",
                "description": "Implements features incrementally",
                "capabilities": [
                    "Develop features one at a time",
                    "Fix bugs",
                    "Write clean, documented code",
                    "Commit with descriptive messages",
                ],
            },
            {
                "name": "tester",
                "description": "Verifies implementations",
                "capabilities": [
                    "Run unit tests",
                    "Run E2E tests",
                    "Generate QA reports",
                    "Verify feature functionality",
                ],
            },
            {
                "name": "deployer",
                "description": "Handles deployment and CI/CD",
                "capabilities": [
                    "Set up GitHub Actions",
                    "Set up GitLab CI",
                    "Deploy to Vercel",
                    "Deploy with Docker",
                    "Deploy to Kubernetes",
                ],
            },
        ],
        "deployment_targets": [
            "vercel",
            "docker",
            "heroku",
            "kubernetes",
            "aws",
            "gcp",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
