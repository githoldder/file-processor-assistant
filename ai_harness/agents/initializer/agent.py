import json
from typing import Dict, Any, List
from core.orchestration.manager import Agent
from core.state.manager import StateManager


class InitializeAgent(Agent):
    """Initializes project environment and sets up foundation"""
    
    def get_system_prompt(self) -> str:
        return """You are an Initialize Agent responsible for setting up the project environment.
        
Your responsibilities:
1. Create a detailed SPEC.md based on user's requirements
2. Generate a comprehensive feature list in features.json
3. Set up initial project structure and dependencies
4. Create init.sh script for running the development server
5. Initialize git repository with proper commit history
6. Write claude-progress.txt with initial progress notes

Key principles:
- Be thorough - create a complete feature list (100+ features for complex projects)
- Each feature should have: category, description, steps, passes (default false), priority
- Write clear, descriptive commit messages
- Leave the environment in a clean, working state
- Document everything for future agents

Output format for features.json:
```json
[
  {
    "category": "functional|ui|performance|security",
    "description": "What this feature does",
    "steps": ["step1", "step2", "step3"],
    "passes": false,
    "priority": 1-5
  }
]
```"""
    
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        spec = task_data.get("spec", {})
        
        # Create SPEC.md
        spec_content = self._generate_spec(spec)
        self.tools.write_file("SPEC.md", spec_content)
        
        # Generate feature list
        features = self._generate_features(spec)
        self.state.write_feature_list(features)
        
        # Create project structure
        project_type = spec.get("type", "webapp")
        self._create_project_structure(project_type, spec)
        
        # Create init.sh
        init_sh = self._generate_init_script(project_type)
        self.tools.write_file("init.sh", init_sh)
        
        # Initialize git
        self.git.init_repo()
        
        # Write initial progress
        self.state.write_progress("Project initialized with {} features".format(len(features)))
        
        # Commit initial setup
        self.git.commit("Initialize: Project setup and feature list")
        
        return {
            "status": "completed",
            "features_count": len(features),
            "spec": spec_content
        }
    
    def _generate_spec(self, spec: Dict) -> str:
        name = spec.get("name", "AI Project")
        description = spec.get("description", "")
        tech_stack = spec.get("tech_stack", {})
        
        spec_content = f"""# {name}

## Description
{description}

## Tech Stack
"""
        for tech, version in tech_stack.items():
            spec_content += f"- {tech}: {version}\n"
        
        spec_content += """
## Project Structure
```
.
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── styles/
├── public/
├── tests/
└── config/
```

## Development Workflow
1. Run `bash init.sh` to start development server
2. Make incremental changes
3. Test thoroughly before committing
4. Update feature list when completing features

## Progress Tracking
- features.json: Complete list of features to implement
- claude-progress.txt: Session-by-session progress notes
- Git commit history: Detailed change log
"""
        return spec_content
    
    def _generate_features(self, spec: Dict) -> List[Dict]:
        features = []
        
        # Base web app features
        base_features = [
            {"category": "functional", "description": "Application loads without errors", 
             "steps": ["Open application", "Check console for errors"], "priority": 1},
            {"category": "functional", "description": "Home page displays correctly",
             "steps": ["Navigate to home", "Verify content renders"], "priority": 1},
            {"category": "functional", "description": "Navigation between pages works",
             "steps": ["Click nav links", "Verify page changes"], "priority": 1},
            {"category": "functional", "description": "Responsive design on mobile",
             "steps": ["Resize to mobile", "Verify layout"], "priority": 2},
            {"category": "functional", "description": "Error handling displays user-friendly messages",
             "steps": ["Trigger error", "Verify message"], "priority": 2},
            {"category": "performance", "description": "Initial page load under 3 seconds",
             "steps": ["Measure load time"], "priority": 2},
            {"category": "security", "description": "No XSS vulnerabilities",
             "steps": ["Test input sanitization"], "priority": 3},
            {"category": "ui", "description": "Loading states display during async operations",
             "steps": ["Trigger async action", "Check loader"], "priority": 2},
            {"category": "functional", "description": "Form validation works correctly",
             "steps": ["Submit invalid form", "Verify errors"], "priority": 2},
            {"category": "functional", "description": "Data persists across sessions",
             "steps": ["Save data", "Refresh page", "Verify data"], "priority": 2},
        ]
        
        # Add type-specific features
        project_type = spec.get("type", "webapp")
        if project_type == "api":
            features.extend([
                {"category": "functional", "description": "REST endpoints return correct status codes",
                 "steps": ["Test each endpoint", "Verify status"], "priority": 1},
                {"category": "functional", "description": "Authentication works correctly",
                 "steps": ["Login", "Verify token"], "priority": 1},
                {"category": "functional", "description": "Rate limiting protects API",
                 "steps": ["Send many requests", "Verify 429"], "priority": 2},
            ])
        
        features.extend(base_features)
        
        # Add custom features from spec
        custom_features = spec.get("features", [])
        for i, feature in enumerate(custom_features):
            features.append({
                "category": feature.get("category", "functional"),
                "description": feature.get("description", ""),
                "steps": feature.get("steps", []),
                "priority": feature.get("priority", 3)
            })
        
        # Mark all as not passing
        for feature in features:
            feature["passes"] = False
        
        return features
    
    def _create_project_structure(self, project_type: str, spec: Dict):
        tech_stack = spec.get("tech_stack", {})
        
        if "react" in tech_stack:
            self._create_react_project()
        elif "vue" in tech_stack:
            self._create_vue_project()
        elif "python" in tech_stack:
            self._create_python_project()
        else:
            self._create_basic_project()
    
    def _create_react_project(self):
        self.tools.write_file("package.json", json.dumps({
            "name": "ai-project",
            "version": "1.0.0",
            "private": true,
            "scripts": {
                "dev": "vite",
                "build": "tsc && vite build",
                "preview": "vite preview",
                "test": "vitest"
            },
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            "devDependencies": {
                "@types/react": "^18.2.0",
                "@types/react-dom": "^18.2.0",
                "@vitejs/plugin-react": "^4.2.0",
                "typescript": "^5.3.0",
                "vite": "^5.0.0",
                "vitest": "^1.0.0"
            }
        }, indent=2))
        
        self.tools.write_file("vite.config.ts", """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
""")
    
    def _create_vue_project(self):
        pass
    
    def _create_python_project(self):
        self.tools.write_file("requirements.txt", "")
        self.tools.write_file("main.py", "# Main application file\n")
    
    def _create_basic_project(self):
        self.tools.write_file("index.html", "<!DOCTYPE html>\n<html>\n<head>\n  <title>AI Project</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>")
    
    def _generate_init_script(self, project_type: str) -> str:
        if "react" in str(self.tools.list_files("package.json")):
            return """#!/bin/bash
echo "Starting development server..."
npm install
npm run dev
"""
        elif "python" in str(self.tools.list_files("requirements.txt"))):
            return """#!/bin/bash
echo "Installing dependencies..."
pip install -r requirements.txt
echo "Starting application..."
python main.py
"""
        else:
            return """#!/bin/bash
echo "Starting development server..."
python -m http.server 3000
"""
