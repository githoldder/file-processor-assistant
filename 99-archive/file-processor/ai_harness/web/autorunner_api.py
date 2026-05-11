import os
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn


app = FastAPI(
    title="AI Auto Development System",
    description="Fully autonomous AI development pipeline - just submit requirements and wait for completion",
    version="1.0.0",
)

# Global runner instance
runner = None


def get_runner():
    """Get or create runner instance"""
    global runner
    if runner is None:
        from core.autorunner import AutoRunner

        runner = AutoRunner(
            workspace_dir="/tmp/ai_development_workspace",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            max_sessions_per_project=int(os.getenv("MAX_SESSIONS", "100")),
            auto_approve=os.getenv("AUTO_APPROVE", "false").lower() == "true",
            auto_deploy=os.getenv("AUTO_DEPLOY", "true").lower() == "true",
        )
    return runner


class RequirementSubmit(BaseModel):
    name: str
    description: str
    priority: int = 1


class RequirementSubmitFromFile(BaseModel):
    file_path: str


class ApprovalRequest(BaseModel):
    approved: bool
    reason: Optional[str] = None


@app.get("/")
async def root():
    return {
        "name": "AI Auto Development System",
        "version": "1.0.0",
        "description": "Fully autonomous AI development - submit requirements, get code",
        "endpoints": {
            "submit": "/api/requirements (POST)",
            "status": "/api/status (GET)",
            "projects": "/api/projects (GET)",
            "approve": "/api/projects/{id}/approve (POST)",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "runner": "running"}


# ============== Requirements ==============


@app.post("/api/requirements")
async def submit_requirement(req: RequirementSubmit):
    """Submit a new development requirement"""
    runner = get_runner()

    req_id = runner.submit_requirement(
        name=req.name, description=req.description, priority=req.priority
    )

    return {
        "requirement_id": req_id,
        "name": req.name,
        "status": "submitted",
        "message": "Requirement submitted. Use /api/projects to track progress.",
    }


@app.post("/api/requirements/from-file")
async def submit_from_file(
    req: RequirementSubmitFromFile, background_tasks: BackgroundTasks
):
    """Submit requirements from a file"""
    runner = get_runner()

    ids = runner.submit_from_file(req.file_path)

    return {
        "requirements_count": len(ids),
        "requirement_ids": ids,
        "message": "Requirements loaded. System will start processing.",
    }


@app.get("/api/requirements")
async def list_requirements():
    """List all requirements"""
    runner = get_runner()

    return {
        "requirements": [
            {
                "id": r.id,
                "name": r.name,
                "status": r.status,
                "priority": r.priority,
                "created_at": r.created_at.isoformat(),
            }
            for r in runner.requirements_queue
        ]
    }


# ============== Status ==============


@app.get("/api/status")
async def get_status():
    """Get system status"""
    runner = get_runner()
    return runner.get_status()


# ============== Projects ==============


@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    runner = get_runner()
    return {"projects": runner.list_projects()}


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details"""
    runner = get_runner()
    details = runner.get_project_details(project_id)

    if details is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return details


@app.get("/api/projects/{project_id}/files")
async def list_project_files(project_id: str):
    """List project files"""
    runner = get_runner()
    project_dir = Path(runner.workspace) / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    files = []
    for f in project_dir.rglob("*"):
        if f.is_file() and not str(f).startswith(str(project_dir / ".ai_harness")):
            files.append(str(f.relative_to(project_dir)))

    return {"files": files}


@app.get("/api/projects/{project_id}/files/{file_path:path}")
async def read_project_file(project_id: str, file_path: str):
    """Read a project file"""
    runner = get_runner()
    project_dir = Path(runner.workspace) / project_id
    full_path = project_dir / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        content = full_path.read_text()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read file: {e}")


# ============== Approval ==============


@app.post("/api/projects/{project_id}/approve")
async def approve_project(project_id: str, request: ApprovalRequest):
    """Approve or reject a project"""
    runner = get_runner()

    if request.approved:
        success = runner.approve_project(project_id)
        if success:
            return {"message": "Project approved and deploying..."}
        else:
            raise HTTPException(status_code=400, detail="Cannot approve project")
    else:
        success = runner.reject_project(
            project_id, request.reason or "Rejected by user"
        )
        if success:
            return {"message": "Project rejected"}
        else:
            raise HTTPException(status_code=400, detail="Cannot reject project")


# ============== Actions ==============


@app.post("/api/start")
async def start_runner(background_tasks: BackgroundTasks):
    """Start the auto runner"""
    runner = get_runner()

    if runner.running:
        return {"message": "Runner already running"}

    def run():
        runner.start()

    background_tasks.add_task(run)

    return {"message": "Runner started"}


@app.post("/api/stop")
async def stop_runner():
    """Stop the auto runner"""
    runner = get_runner()
    runner.running = False

    return {"message": "Runner stopping..."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
