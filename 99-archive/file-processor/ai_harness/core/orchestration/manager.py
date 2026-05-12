import os
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from abc import ABC, abstractmethod

from core.state.manager import (
    StateManager,
    GitManager,
    ToolExecutor,
    AgentType,
    TaskStatus,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Agent(ABC):
    """Base class for all agents"""

    def __init__(
        self,
        name: str,
        project_dir: str,
        model: str = "claude-sonnet-4-20250514",
        api_key: Optional[str] = None,
    ):
        self.name = name
        self.project_dir = Path(project_dir)
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.state = StateManager(project_dir)
        self.git = GitManager(project_dir)
        self.tools = ToolExecutor(project_dir)
        self.tools_list = self.get_tools()

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent"""
        pass

    @abstractmethod
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's task"""
        pass

    def get_tools(self) -> List[Dict]:
        """Return list of available tools"""
        return [
            {
                "name": "Bash",
                "description": "Run shell commands",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["command"],
                },
            },
            {
                "name": "Read",
                "description": "Read file contents",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string"},
                        "offset": {"type": "integer"},
                        "limit": {"type": "integer"},
                    },
                    "required": ["file_path"],
                },
            },
            {
                "name": "Write",
                "description": "Write content to a file",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["file_path", "content"],
                },
            },
            {
                "name": "Glob",
                "description": "List files matching pattern",
                "input_schema": {
                    "type": "object",
                    "properties": {"pattern": {"type": "string"}},
                    "required": ["pattern"],
                },
            },
            {
                "name": "Grep",
                "description": "Search file contents",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "pattern": {"type": "string"},
                        "path": {"type": "string"},
                    },
                    "required": ["pattern"],
                },
            },
        ]

    def call_api(self, messages: List[Dict], tools: bool = True) -> Dict:
        """Call Claude API"""
        if not self.api_key:
            raise ValueError("API key not set")

        import anthropic

        client = anthropic.Anthropic(api_key=self.api_key)

        response = client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=messages,
            tools=[
                {
                    "name": t["name"],
                    "description": t["description"],
                    "input_schema": t["input_schema"],
                }
                for t in self.tools_list
            ]
            if tools
            else [],
        )

        return {"content": response.content, "usage": response.usage}

    async def run_session(self, user_prompt: str) -> Dict[str, Any]:
        """Run a complete agent session"""
        session_id = self.state.get_session_id()

        messages = [
            {"role": "system", "content": self.get_system_prompt()},
            {"role": "user", "content": user_prompt},
        ]

        max_turns = 50
        turn = 0

        while turn < max_turns:
            turn += 1
            response = self.call_api(messages)

            # Check if we have text response
            text_content = [c for c in response["content"] if c.type == "text"]
            if text_content:
                messages.append({"role": "assistant", "content": text_content[0].text})

                # If no tool use, we're done
                tool_uses = [c for c in response["content"] if c.type == "tool_use"]
                if not tool_uses:
                    return {"status": "completed", "messages": messages}

                # Execute tools
                for tool_use in tool_uses:
                    result = self._execute_tool(tool_use)
                    messages.append(
                        {
                            "role": "user",
                            "content": f"<tool_result>{result}</tool_result>",
                        }
                    )
            else:
                break

        return {"status": "max_turns", "messages": messages}

    def _execute_tool(self, tool_use) -> str:
        """Execute a single tool"""
        tool_name = tool_use.name
        tool_input = tool_use.input

        try:
            if tool_name == "Bash":
                result = self.tools.run_bash(
                    tool_input.get("command", ""),
                    timeout=tool_input.get("timeout", 300),
                )
                return f"Exit code: {result.get('returncode')}\nStdout: {result.get('stdout')}\nStderr: {result.get('stderr')}"

            elif tool_name == "Read":
                content = self.tools.read_file(tool_input.get("file_path", ""))
                return content[:10000]  # Limit content size

            elif tool_name == "Write":
                self.tools.write_file(
                    tool_input.get("file_path", ""), tool_input.get("content", "")
                )
                return "File written successfully"

            elif tool_name == "Glob":
                files = self.tools.list_files(tool_input.get("pattern", "*"))
                return "\n".join(files[:100])

            elif tool_name == "Grep":
                # Simple grep implementation
                pattern = tool_input.get("pattern", "")
                path = tool_input.get("path", ".")
                results = []
                for f in self.tools.list_files("*"):
                    if path in str(f) or path == ".":
                        content = self.tools.read_file(f)
                        if pattern in content:
                            results.append(f"{f}: found '{pattern}'")
                return "\n".join(results[:50])

            return f"Unknown tool: {tool_name}"

        except Exception as e:
            return f"Error: {str(e)}"


class Orchestrator:
    """Coordinates multiple agents to complete complex tasks"""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.state = StateManager(project_dir)
        self.agents: Dict[str, Agent] = {}

    def register_agent(self, agent_type: str, agent: Agent):
        self.agents[agent_type] = agent

    async def run_workflow(self, workflow: List[Dict]) -> List[Dict]:
        """Run a predefined workflow"""
        results = []

        for step in workflow:
            agent_type = step["agent"]
            task_data = step["task"]

            if agent_type not in self.agents:
                results.append(
                    {
                        "step": step.get("name"),
                        "status": "failed",
                        "error": f"Unknown agent: {agent_type}",
                    }
                )
                continue

            agent = self.agents[agent_type]

            try:
                result = await agent.execute(task_data)
                results.append(
                    {"step": step.get("name"), "status": "success", "result": result}
                )
            except Exception as e:
                results.append(
                    {"step": step.get("name"), "status": "failed", "error": str(e)}
                )

        return results

    async def run_autonomous_session(self, project_spec: Dict) -> Dict:
        """Run an autonomous development session"""
        session_id = self.state.get_session_id()
        self.state.increment_session()

        logger.info(f"Starting autonomous session {session_id}")

        # Run initialize agent if this is first session
        if self.state._read_state().get("current_session", 0) == 1:
            init_agent = self.agents.get("initializer")
            if init_agent:
                await init_agent.execute({"action": "initialize", "spec": project_spec})

        # Run coding agent for incremental progress
        coding_agent = self.agents.get("coding")
        if coding_agent:
            result = await coding_agent.execute(
                {
                    "action": "develop",
                    "feature": self.state.get_remaining_features()[0]
                    if self.state.get_remaining_features()
                    else None,
                }
            )

        # Run test agent
        test_agent = self.agents.get("tester")
        if test_agent:
            await test_agent.execute({"action": "test"})

        # Commit progress
        self.git.commit(f"Session {session_id}: Progress update")

        return {"session_id": session_id, "status": "completed"}


class TaskQueue:
    """Manages task queue for agent execution"""

    def __init__(self):
        self.queue: List[Dict] = []
        self.results: Dict[str, Any] = {}

    def add_task(self, task: Dict):
        task["id"] = str(len(self.queue))
        task["status"] = "pending"
        self.queue.append(task)

    def get_task(self) -> Optional[Dict]:
        for task in self.queue:
            if task["status"] == "pending":
                task["status"] = "running"
                return task
        return None

    def complete_task(self, task_id: str, result: Any):
        for task in self.queue:
            if task["id"] == task_id:
                task["status"] = "completed"
                task["result"] = result
                break

    def get_status(self) -> Dict:
        return {
            "total": len(self.queue),
            "pending": len([t for t in self.queue if t["status"] == "pending"]),
            "running": len([t for t in self.queue if t["status"] == "running"]),
            "completed": len([t for t in self.queue if t["status"] == "completed"]),
        }
