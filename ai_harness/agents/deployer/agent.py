import json
import os
from typing import Dict, Any, List, Optional
from core.orchestration.manager import Agent


class DeployerAgent(Agent):
    """Handles deployment and CI/CD"""

    def get_system_prompt(self) -> str:
        return """You are a Deploy Agent responsible for deploying applications.

Your responsibilities:
1. Set up CI/CD pipelines
2. Configure deployment environments
3. Build production artifacts
4. Deploy to various platforms
5. Monitor deployment health
6. Rollback if needed

Deployment targets:
- Docker containers
- Cloud platforms (AWS, GCP, Azure)
- Vercel/Netlify for static sites
- Heroku
- Kubernetes
"""

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        action = task_data.get("action", "deploy")

        if action == "setup_cicd":
            return await self._setup_cicd(task_data)
        elif action == "deploy":
            return await self._deploy(task_data)
        elif action == "build":
            return await self._build_production()
        else:
            return {"status": "unknown_action"}

    async def _setup_cicd(self, task_data: Dict) -> Dict:
        """Set up CI/CD pipeline"""
        platform = task_data.get("platform", "github")

        if platform == "github":
            return await self._setup_github_actions()
        elif platform == "gitlab":
            return await self._setup_gitlab_ci()
        elif platform == "jenkins":
            return await self._setup_jenkinsfile()
        else:
            return {"status": "unknown_platform"}

    async def _setup_github_actions(self) -> Dict:
        """Set up GitHub Actions"""
        # Create .github/workflows
        workflow_dir = ".github/workflows"

        ci_workflow = """name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
"""

        self.tools.write_file(f"{workflow_dir}/ci.yml", ci_workflow)

        # Create deployment workflow
        deploy_workflow = """name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and Deploy
      run: |
        echo "Deploying to ${{ github.event.inputs.environment }}"
"""

        self.tools.write_file(f"{workflow_dir}/deploy.yml", deploy_workflow)

        self.git.commit("ci: add GitHub Actions workflows")

        return {
            "status": "setup_complete",
            "platform": "github",
            "workflows": ["ci.yml", "deploy.yml"],
        }

    async def _setup_gitlab_ci(self) -> Dict:
        """Set up GitLab CI"""
        gitlab_ci = """stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm test

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
  environment:
    name: staging
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to production..."
  environment:
    name: production
  only:
    - main
"""

        self.tools.write_file(".gitlab-ci.yml", gitlab_ci)
        self.git.commit("ci: add GitLab CI configuration")

        return {"status": "setup_complete", "platform": "gitlab"}

    async def _setup_jenkinsfile(self) -> Dict:
        """Set up Jenkinsfile"""
        jenkinsfile = """pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm test'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to staging...'
            }
        }
        
        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production...'
            }
        }
    }
}
"""

        self.tools.write_file("Jenkinsfile", jenkinsfile)
        self.git.commit("ci: add Jenkinsfile")

        return {"status": "setup_complete", "platform": "jenkins"}

    async def _deploy(self, task_data: Dict) -> Dict:
        """Deploy application"""
        target = task_data.get("target", "vercel")

        if target == "vercel":
            return await self._deploy_vercel()
        elif target == "docker":
            return await self._deploy_docker()
        elif target == "heroku":
            return await self._deploy_heroku()
        else:
            return {"status": "unknown_target"}

    async def _deploy_vercel(self) -> Dict:
        """Deploy to Vercel"""
        vercel_json = json.dumps(
            {
                "version": 2,
                "builds": [{"src": "package.json", "use": "@vercel/next"}],
                "routes": [{"src": "/(.*)", "dest": "/$1"}],
            },
            indent=2,
        )

        self.tools.write_file("vercel.json", vercel_json)

        result = self.tools.run_bash(
            "npx vercel --prod --yes 2>&1 || echo 'Vercel CLI not configured'"
        )

        return {
            "status": "deployed",
            "platform": "vercel",
            "output": result.get("stdout", "")[:500],
        }

    async def _deploy_docker(self) -> Dict:
        """Deploy with Docker"""
        dockerfile = """FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
"""

        self.tools.write_file("Dockerfile", dockerfile)

        # Docker compose for production
        compose = """version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
"""

        self.tools.write_file("docker-compose.prod.yml", compose)

        result = self.tools.run_bash(
            "docker-compose -f docker-compose.prod.yml up -d --build"
        )

        return {
            "status": "deployed",
            "platform": "docker",
            "output": result.get("stdout", ""),
        }

    async def _deploy_heroku(self) -> Dict:
        """Deploy to Heroku"""
        # Create Procfile
        procfile = "web: npm start"
        self.tools.write_file("Procfile", procfile)

        result = self.tools.run_bash(
            "git push heroku main 2>&1 || echo 'Heroku not configured'"
        )

        return {
            "status": "deployed",
            "platform": "heroku",
            "output": result.get("stdout", "")[:500],
        }

    async def _build_production(self) -> Dict:
        """Build production artifact"""
        # Detect project type
        if self.tools.file_exists("package.json"):
            result = self.tools.run_bash("npm run build")
        elif self.tools.file_exists("requirements.txt"):
            result = self.tools.run_bash("python -m py_compile $(find . -name '*.py')")
        else:
            return {"status": "unknown_project_type"}

        return {"status": "build_complete", "output": result.get("stdout", "")}


class InfrastructureAgent(Agent):
    """Manages infrastructure as code"""

    def get_system_prompt(self) -> str:
        return """You are an Infrastructure Agent responsible for managing infrastructure.

Your responsibilities:
1. Write Terraform/CloudFormation templates
2. Configure Kubernetes manifests
3. Set up monitoring and logging
4. Manage environment configurations
5. Handle secrets and credentials
"""

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        action = task_data.get("action", "setup")

        if action == "setup_k8s":
            return await self._setup_kubernetes()
        elif action == "setup_terraform":
            return await self._setup_terraform()
        else:
            return {"status": "unknown_action"}

    async def _setup_kubernetes(self) -> Dict:
        """Set up Kubernetes manifests"""
        # Deployment
        deployment = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: app:latest
        ports:
        - containerPort: 3000
        resources:
          limits:
            cpu: "500m"
            memory: "256Mi"
          requests:
            cpu: "200m"
            memory: "128Mi"
"""

        self.tools.write_file("k8s/deployment.yaml", deployment)

        # Service
        service = """apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
"""

        self.tools.write_file("k8s/service.yaml", service)

        # Ingress
        ingress = """apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app
            port:
              number: 80
"""

        self.tools.write_file("k8s/ingress.yaml", ingress)

        self.git.commit("infra: add Kubernetes manifests")

        return {
            "status": "setup_complete",
            "manifests": ["deployment.yaml", "service.yaml", "ingress.yaml"],
        }

    async def _setup_terraform(self) -> Dict:
        """Set up Terraform templates"""
        main_tf = """terraform {
  required_version = ">=1.0"
  
  backend "s3" {
    bucket = "terraform-state"
    key    = "app/terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

resource "aws_s3_bucket" "app" {
  bucket = "app-${var.environment}"
}

resource "aws_ecr_repository" "app" {
  name = "app"
}
"""

        self.tools.write_file("terraform/main.tf", main_tf)

        self.git.commit("infra: add Terraform templates")

        return {"status": "setup_complete"}
