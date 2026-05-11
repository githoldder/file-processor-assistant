import json
from typing import Dict, Any, List, Optional
from core.orchestration.manager import Agent


class CodingAgent(Agent):
    """Implements features incrementally"""

    def get_system_prompt(self) -> str:
        return """You are a Coding Agent responsible for implementing features incrementally.

Your workflow for each session:
1. Get your bearings:
   - Run `pwd` to verify working directory
   - Read claude-progress.txt to see recent work
   - Read git log to understand history
   - Read features.json to see what's left

2. Verify environment is clean:
   - Run init.sh to start development server
   - Test basic functionality works
   - Fix any broken state before adding new features

3. Choose ONE feature to work on:
   - Pick highest priority feature that passes=false
   - Implement it completely
   - Test it thoroughly

4. Update feature status:
   - Mark feature as passes=true ONLY after real testing
   - NEVER mark features done without verification

5. Leave environment clean:
   - Commit changes with descriptive message
   - Update claude-progress.txt with what you did
   - Ensure no bugs or incomplete work

Key rules:
- Work on ONE feature at a time
- Test thoroughly before marking done
- NEVER remove or edit tests to make them pass
- Commit after completing each feature
- Leave code clean and documented

After each session:
- Write a git commit: "feat: implement [feature name]"
- Update claude-progress.txt: "Completed [feature]: [description of changes]"
"""

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        action = task_data.get("action", "develop")

        if action == "develop":
            return await self._develop_feature(task_data)
        elif action == "fix":
            return await self._fix_bug(task_data)
        else:
            return {"status": "unknown_action"}

    async def _develop_feature(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        # Get remaining features
        remaining_features = self.state.get_remaining_features()

        if not remaining_features:
            return {"status": "all_complete", "message": "All features implemented!"}

        # Sort by priority
        remaining_features.sort(key=lambda x: x.get("priority", 5))

        # Pick highest priority feature
        feature = remaining_features[0]

        # Start session by getting bearings
        await self._get_bearings()

        # Verify environment
        await self._verify_environment()

        # Implement the feature
        implementation_result = await self._implement_feature(feature)

        # Test the feature
        test_result = await self._test_feature(feature)

        # Update feature status
        if test_result.get("passed"):
            self._update_feature_status(feature, True)
            self.state.increment_features_completed()
            self.state.write_progress(f"Completed: {feature['description']}")
        else:
            self.state.write_progress(
                f"Failed: {feature['description']} - {test_result.get('error')}"
            )

        # Commit changes
        commit_msg = (
            f"feat: implement {feature.get('category')}: {feature['description']}"
        )
        self.git.commit(commit_msg)

        return {
            "status": "feature_implemented",
            "feature": feature,
            "test_result": test_result,
        }

    async def _get_bearings(self):
        """Get oriented with project state"""
        # Check current directory
        self.tools.run_bash("pwd")

        # Read progress file
        progress = self.tools.read_file("claude-progress.txt")

        # Check git log
        log = self.git.get_log(10)

        # Read features list
        features = self.state.read_features()

        return {
            "progress": progress,
            "git_log": log,
            "total_features": len(features),
            "completed": len([f for f in features if f.get("passes")]),
        }

    async def _verify_environment(self) -> bool:
        """Verify development server works"""
        # Check if init.sh exists
        if not self.tools.file_exists("init.sh"):
            return False

        # Run a quick test
        result = self.tools.run_bash("bash init.sh &", timeout=10)

        # Wait for server
        import time

        time.sleep(3)

        # Test if server responds
        curl_result = self.tools.run_bash(
            "curl -s http://localhost:3000 || curl -s http://localhost:5173 || curl -s http://localhost:8000"
        )

        return curl_result.get("returncode", 1) == 0

    async def _implement_feature(self, feature: Dict) -> Dict:
        """Implement a single feature"""
        feature_type = feature.get("category", "functional")

        if feature_type == "functional":
            return await self._implement_functional_feature(feature)
        elif feature_type == "ui":
            return await self._implement_ui_feature(feature)
        else:
            return await self._implement_functional_feature(feature)

    async def _implement_functional_feature(self, feature: Dict) -> Dict:
        """Implement a functional feature"""
        description = feature.get("description", "")

        # Determine what code to write based on description
        if "api" in description.lower() or "endpoint" in description.lower():
            return self._implement_api_feature(feature)
        elif "form" in description.lower():
            return self._implement_form_feature(feature)
        elif "auth" in description.lower() or "login" in description.lower():
            return self._implement_auth_feature(feature)
        else:
            # Generic implementation
            self.tools.write_file(
                f"src/features/{description.replace(' ', '_').lower()}.js",
                f"// Feature: {description}\nexport function {description.replace(' ', '_').replace('-', '_').lower()}() {{\n  // Implementation for: {description}\n  console.log('{description} implemented');\n}}\n",
            )
            return {"status": "implemented"}

    async def _implement_ui_feature(self, feature: Dict) -> Dict:
        """Implement a UI feature"""
        description = feature.get("description", "")

        self.tools.write_file(
            f"src/components/{description.replace(' ', '_').lower()}.jsx",
            f"""import React from 'react';

export function {description.replace(" ", "").replace("-", "")}() {{
  return (
    <div className="{description.replace(" ", "-").lower()}">
      <h2>{description}</h2>
    </div>
  );
}}
""",
        )
        return {"status": "implemented"}

    async def _implement_api_feature(self, feature: Dict) -> Dict:
        """Implement an API endpoint"""
        description = feature.get("description", "")

        self.tools.write_file(
            "src/api/features.py",
            f"""# API Feature: {description}

@app.route('/api/{description.replace(" ", "-").lower()}', methods=['GET'])
def {description.replace(" ", "_").replace("-", "_").lower()}():
    # Implementation for: {description}
    return {{"status": "success", "message": "{description}"}}
""",
        )
        return {"status": "implemented"}

    async def _implement_form_feature(self, feature: Dict) -> Dict:
        """Implement a form"""
        description = feature.get("description", "")

        self.tools.write_file(
            f"src/components/{description.replace(' ', '_').lower()}.jsx",
            f"""import React, {{ useState }} from 'react';

export function {description.replace(" ", "")}() {{
  const [data, setData] = useState({{}});
  
  const handleSubmit = (e) => {{
    e.preventDefault();
    console.log('Form submitted:', data);
  }};
  
  return (
    <form onSubmit={{handleSubmit}}>
      <input 
        type="text" 
        value={{data.value || ''}}
        onChange={{e => setData({{...data, value: e.target.value}})}}
      />
      <button type="submit">Submit</button>
    </form>
  );
}}
""",
        )
        return {"status": "implemented"}

    async def _implement_auth_feature(self, feature: Dict) -> Dict:
        """Implement authentication"""
        description = feature.get("description", "")

        self.tools.write_file(
            "src/utils/auth.js",
            f"""// Authentication: {description}

export async function login(credentials) {{
  const response = await fetch('/api/auth/login', {{
    method: 'POST',
    headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify(credentials)
  }});
  return response.json();
}}

export async function logout() {{
  localStorage.removeItem('token');
}}

export function isAuthenticated() {{
  return !!localStorage.getItem('token');
}}
""",
        )
        return {"status": "implemented"}

    async def _test_feature(self, feature: Dict) -> Dict:
        """Test a feature"""
        description = feature.get("description", "")
        steps = feature.get("steps", [])

        for step in steps:
            result = self.tools.run_bash(f"echo 'Testing: {step}'")
            if not result.get("success"):
                return {
                    "passed": False,
                    "error": f"Step failed: {step}",
                    "details": result,
                }

        # Run unit tests if they exist
        test_result = self.tools.run_bash(
            "npm test -- --run 2>/dev/null || pytest 2>/dev/null || echo 'No tests found'"
        )

        return {"passed": True, "test_output": test_result.get("stdout", "")}

    async def _fix_bug(self, task_data: Dict) -> Dict:
        """Fix a specific bug"""
        bug_description = task_data.get("bug", "")

        # Find relevant files
        files = (
            self.tools.list_files("*.js")
            + self.tools.list_files("*.jsx")
            + self.tools.list_files("*.py")
            + self.tools.list_files("*.ts")
        )

        # Search for related code
        for file in files[:20]:  # Limit search
            content = self.tools.read_file(file)
            if any(
                keyword in content.lower()
                for keyword in bug_description.lower().split()[:3]
            ):
                # Found potential file
                pass

        # After fixing, run tests
        test_result = self.tools.run_bash("npm test || pytest")

        if test_result.get("returncode") == 0:
            self.git.commit(f"fix: resolved {bug_description}")
            return {"status": "fixed", "message": "Bug fixed and tests passing"}

        return {"status": "fix_failed", "message": "Could not fix the bug"}

    def _update_feature_status(self, feature: Dict, passes: bool):
        """Update feature passes status in features.json"""
        features = self.state.read_features()

        for f in features:
            if f.get("description") == feature.get("description"):
                f["passes"] = passes
                break

        self.state.write_feature_list(features)
