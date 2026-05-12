#!/bin/bash

echo "========================================"
echo "  文件处理全能助手 - 分布式系统"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[错误] Docker未安装，请先安装Docker"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "[错误] Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# Start services
echo "[信息] 启动Docker服务..."
docker-compose up -d

echo ""
echo "[信息] 服务启动完成！"
echo ""
echo "  - API服务:     http://localhost:8000"
echo "  - API文档:    http://localhost:8000/docs"
echo "  - 前端界面:   http://localhost:80"
echo "  - 任务监控:   http://localhost:5555"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo ""
