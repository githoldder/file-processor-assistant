# CulCloud Platform MVP-v2

A lightweight document conversion and file storage platform.

## Architecture
- **Frontend**: React + Vite + TailwindCSS (`file-cloud-frontend`)
- **Backend API**: FastAPI (`backend`)
- **Task Queue**: Redis
- **Storage**: MinIO
- **Converter Engine**: Gotenberg

## Directory Structure
```text
.
├── backend/                  # FastAPI lightweight backend
├── file-cloud-frontend/      # React frontend
├── tests/                    # 测试体系 (Unit, Integration, Blackbox, E2E)
├── scripts/                  # 辅助脚本 (run_tests.sh)
├── docker-compose.yml        # Compose stack
├── 99-archive/               # Archived legacy code
└── context/                  # Agent context memory
```

## Quick Start
```bash
docker-compose up -d --build
```
