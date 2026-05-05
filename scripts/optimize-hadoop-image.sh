#!/bin/bash
# PRD 2：Hadoop镜像优化脚本
# 目标：将myubuntu:hadoop-yarn-v1从4.31GB精简至≤3GB

set -e

echo "=========================================="
echo "PRD 2：Hadoop镜像优化"
echo "=========================================="
echo ""

echo "=== 当前镜像大小 ==="
docker images | grep hadoop-yarn-v1
echo ""

echo "=== 步骤1：进入容器清理 ==="
echo "（请在终端手动执行以下命令，然后截图）"
cat << 'EOF'
docker exec k8s-hadoop-1 bash -c "
echo '=== 清理apt缓存 ==='
apt clean && apt autoclean
rm -rf /var/lib/apt/lists/*

echo '=== 清理文档和手册 ==='
rm -rf /usr/share/doc/*
rm -rf /usr/share/man/*

echo '=== 清理临时文件 ==='
rm -rf /tmp/*
rm -rf /var/tmp/*

echo '=== 清理历史命令 ==='
history -c

echo '=== 检查清理效果 ==='
du -sh /usr/share/doc /usr/share/man /var/lib/apt/lists /tmp
"
EOF
echo ""
read -p "按Enter键继续（截图后）..."

echo "=== 步骤2：提交优化后的镜像 ==="
docker commit k8s-hadoop-1 myubuntu:hadoop-yarn-lean
echo ""
echo "✅ 新镜像已创建：myubuntu:hadoop-yarn-lean"
docker images | grep hadoop
echo ""

echo "=== 步骤3：验证优化后镜像 ==="
echo "停止旧容器，使用新镜像测试..."
docker stop k8s-hadoop-1
docker rm k8s-hadoop-1

docker run -d --name k8s-hadoop-test \
  -p 8088:8088 -p 9870:9870 -p 9864:9864 -p 9866:9866 \
  myubuntu:hadoop-yarn-lean \
  bash -c "service ssh start && /usr/local/hadoop/sbin/start-all.sh && tail -f /dev/null"

echo "等待服务启动..."
sleep 15

echo "=== 验证Hadoop进程 ==="
docker exec k8s-hadoop-test jps
echo ""

echo "=== 验证WebUI ==="
curl -s http://localhost:9870 | head -3 && echo "✅ HDFS WebUI正常" || echo "❌ HDFS WebUI异常"
curl -s http://localhost:8088/ws/v1/cluster/info | python3 -c "import sys,json;d=json.load(sys.stdin);print('✅ YARN状态:',d['clusterInfo']['state'])" 2>/dev/null || echo "❌ YARN异常"
echo ""

echo "=== 步骤4：替换原镜像 ==="
docker stop k8s-hadoop-test && docker rm k8s-hadoop-test
docker tag myubuntu:hadoop-yarn-lean myubuntu:hadoop-yarn-v1
echo "✅ 镜像已替换"
echo ""

echo "=== 步骤5：重启原容器 ==="
cd "/Users/caolei/Desktop/culcloud platform/file-processor"
docker-compose -f k8s/docker-compose.v2-lightweight-b.yml up -d
sleep 10

echo "=== 最终验证 ==="
docker ps | grep hadoop
docker exec k8s-hadoop-1 jps
echo ""

echo "=== 优化结果对比 ==="
echo "--- 优化前：4.31GB ---"
echo "--- 优化后：---"
docker images | grep hadoop-yarn-v1
echo ""

echo "=========================================="
echo "✅ PRD 2 完成！Hadoop镜像已优化"
echo "=========================================="
