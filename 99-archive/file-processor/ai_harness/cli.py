#!/usr/bin/env python3
"""
AI Auto Development System - CLI Tool

Usage:
    python cli.py start                          # Start the auto runner
    python cli.py submit "Project Name" "Desc"   # Submit a requirement
    python cli.py submit-file requirements.json  # Submit from file
    python cli.py status                         # Show system status
    python cli.py projects                       # List all projects
    python cli.py project <id>                   # Show project details
    python cli.py approve <id>                   # Approve project
    python cli.py files <id>                     # List project files
"""

import os
import sys
import json
import argparse
from pathlib import Path


API_URL = os.getenv("API_URL", "http://localhost:8002")


def api_call(endpoint: str, method: str = "GET", data: dict = None):
    """Make API call"""
    import requests

    url = f"{API_URL}{endpoint}"

    try:
        if method == "GET":
            resp = requests.get(url, timeout=10)
        elif method == "POST":
            resp = requests.post(url, json=data, timeout=30)
        else:
            raise ValueError(f"Unknown method: {method}")

        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        print(f"Error: Cannot connect to API at {API_URL}")
        print("Make sure the server is running: python cli.py start-server")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"API Error: {e}")
        if e.response.text:
            try:
                print(json.dumps(e.response.json(), indent=2))
            except:
                print(e.response.text)
        sys.exit(1)


def cmd_start(args):
    """Start the auto runner"""
    print("Starting AI Auto Development System...")
    result = api_call("/api/start", method="POST")
    print(result.get("message", "Started"))
    print(f"\nAPI: {API_URL}")
    print("Monitor: Check /api/status or /api/projects")


def cmd_start_server(args):
    """Start the API server"""
    from web.autorunner_api import app
    import uvicorn

    print("Starting API Server...")
    uvicorn.run(app, host="0.0.0.0", port=int(args.port))


def cmd_submit(args):
    """Submit a requirement"""
    if not args.name:
        print("Error: Please provide a project name")
        sys.exit(1)

    data = {
        "name": args.name,
        "description": args.description or args.name,
        "priority": args.priority,
    }

    result = api_call("/api/requirements", method="POST", data=data)

    print(f"✓ Requirement submitted!")
    print(f"  ID: {result.get('requirement_id')}")
    print(f"  Name: {result.get('name')}")
    print(f"\nTrack progress: {API_URL}/api/projects")


def cmd_submit_file(args):
    """Submit requirements from file"""
    path = Path(args.file)

    if not path.exists():
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    result = api_call(
        "/api/requirements/from-file", method="POST", data={"file_path": str(path)}
    )

    print(f"✓ Submitted {result.get('requirements_count')} requirements")
    print(f"  IDs: {', '.join(result.get('requirement_ids', []))}")


def cmd_status(args):
    """Show system status"""
    result = api_call("/api/status")

    print("=" * 50)
    print("AI Auto Development System Status")
    print("=" * 50)
    print(f"Running: {'Yes' if result.get('running') else 'No'}")
    print(f"Current Project: {result.get('current_project', 'None')}")
    print(f"Pending Requirements: {result.get('pending_requirements')}")
    print()
    print("Projects:")
    projects = result.get("projects", {})
    print(f"  Total: {projects.get('total')}")
    print(f"  Completed: {projects.get('completed')}")
    print(f"  In Progress: {projects.get('in_progress')}")
    print(f"  Waiting Approval: {projects.get('waiting_approval')}")
    print(f"  Failed: {projects.get('failed')}")


def cmd_projects(args):
    """List all projects"""
    result = api_call("/api/projects")
    projects = result.get("projects", [])

    if not projects:
        print("No projects yet. Submit a requirement to get started!")
        return

    print("=" * 80)
    print(f"{'ID':<14} {'Name':<25} {'Status':<15} {'Progress':<10} {'Created'}")
    print("=" * 80)

    for p in projects:
        print(
            f"{p['id']:<14} {p['name'][:23]:<25} {p['status']:<15} {p['progress']:.1f}%      {p['created_at'][:10]}"
        )


def cmd_project(args):
    """Show project details"""
    result = api_call(f"/api/projects/{args.project_id}")

    project = result.get("project", {})

    print("=" * 60)
    print(f"Project: {project.get('name')}")
    print("=" * 60)
    print(f"ID: {project.get('id')}")
    print(f"Status: {project.get('status')}")
    print(f"Progress: {project.get('progress'):.1f}%")
    print(
        f"Features: {project.get('features_completed')}/{project.get('features_total')}"
    )
    print(f"Sessions: {project.get('current_session')}/{project.get('max_sessions')}")
    print(f"Created: {project.get('created_at')}")
    print(f"Deployed: {project.get('deployed_url')}")

    if project.get("error"):
        print(f"Error: {project.get('error')}")

    print("\nRequirements:")
    print(
        project.get("requirements", "N/A")[:200] + "..."
        if len(project.get("requirements", "")) > 200
        else project.get("requirements", "N/A")
    )

    print("\nGit Log:")
    git_log = result.get("git_log", [])
    for log in git_log[:5]:
        print(f"  {log}")


def cmd_approve(args):
    """Approve or reject a project"""
    data = {"approved": not args.reject, "reason": args.reason}

    result = api_call(
        f"/api/projects/{args.project_id}/approve", method="POST", data=data
    )
    print(result.get("message"))


def cmd_files(args):
    """List project files"""
    result = api_call(f"/api/projects/{args.project_id}/files")
    files = result.get("files", [])

    print(f"Project files ({len(files)}):")
    for f in files[:50]:
        print(f"  {f}")

    if len(files) > 50:
        print(f"  ... and {len(files) - 50} more")


def cmd_read(args):
    """Read a project file"""
    path = f"/api/projects/{args.project_id}/files/{args.file_path}"
    result = api_call(path)

    print(result.get("content", ""))


def main():
    parser = argparse.ArgumentParser(
        description="AI Auto Development System CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # start
    start_parser = subparsers.add_parser("start", help="Start the auto runner")
    start_parser.set_defaults(func=cmd_start)

    # start-server
    server_parser = subparsers.add_parser("start-server", help="Start API server")
    server_parser.add_argument("--port", default="8002", help="Port to run on")
    server_parser.set_defaults(func=cmd_start_server)

    # submit
    submit_parser = subparsers.add_parser("submit", help="Submit a requirement")
    submit_parser.add_argument("name", help="Project name")
    submit_parser.add_argument("description", nargs="?", help="Project description")
    submit_parser.add_argument(
        "-p", "--priority", type=int, default=1, help="Priority (1-5)"
    )
    submit_parser.set_defaults(func=cmd_submit)

    # submit-file
    file_parser = subparsers.add_parser(
        "submit-file", help="Submit requirements from file"
    )
    file_parser.add_argument("file", help="JSON file with requirements")
    file_parser.set_defaults(func=cmd_submit_file)

    # status
    status_parser = subparsers.add_parser("status", help="Show system status")
    status_parser.set_defaults(func=cmd_status)

    # projects
    projects_parser = subparsers.add_parser("projects", help="List all projects")
    projects_parser.set_defaults(func=cmd_projects)

    # project
    project_parser = subparsers.add_parser("project", help="Show project details")
    project_parser.add_argument("project_id", help="Project ID")
    project_parser.set_defaults(func=cmd_project)

    # approve
    approve_parser = subparsers.add_parser("approve", help="Approve a project")
    approve_parser.add_argument("project_id", help="Project ID")
    approve_parser.add_argument("-r", "--reason", help="Rejection reason")
    approve_parser.add_argument(
        "--reject", action="store_true", help="Reject instead of approve"
    )
    approve_parser.set_defaults(func=cmd_approve)

    # files
    files_parser = subparsers.add_parser("files", help="List project files")
    files_parser.add_argument("project_id", help="Project ID")
    files_parser.set_defaults(func=cmd_files)

    # read
    read_parser = subparsers.add_parser("read", help="Read a project file")
    read_parser.add_argument("project_id", help="Project ID")
    read_parser.add_argument("file_path", help="File path")
    read_parser.set_defaults(func=cmd_read)

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
