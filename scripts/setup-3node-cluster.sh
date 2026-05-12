#!/bin/bash
# PRD 3：实验三 - Hadoop分布式集群搭建脚本
# 目标：创建3节点Hadoop集群，终端执行并截图

set -e

echo "=========================================="
echo "PRD 3：实验三 - Hadoop分布式集群"
echo "=========================================="
echo ""

echo "=== 步骤1：创建hadoop-template镜像 ==="
docker commit k8s-hadoop-1 hadoop-template:latest
echo "✅ 模板镜像已创建"
docker images | grep hadoop-template
echo ""

echo "=== 步骤2：创建slave节点 ==="
docker run -itd --name hadoop-slave1 \
  --network k8s_file_processor_network \
  hadoop-template

docker run -itd --name hadoop-slave2 \
  --network k8s_file_processor_network \
  hadoop-template

echo "✅ slave节点已创建"
docker ps | grep hadoop
echo ""

echo "=== 步骤3：获取容器IP ==="
echo "（请截图以下IP信息）"
MASTER_IP=$(docker inspect k8s-hadoop-1 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
SLAVE1_IP=$(docker inspect hadoop-slave1 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
SLAVE2_IP=$(docker inspect hadoop-slave2 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "master IP: $MASTER_IP"
echo "slave1 IP: $SLAVE1_IP"
echo "slave2 IP: $SLAVE2_IP"
echo ""

echo "=== 步骤4：配置/etc/hosts（3个容器都执行）==="
for container in k8s-hadoop-1 hadoop-slave1 hadoop-slave2; do
  echo "--- 配置 $container ---"
  docker exec $container bash -c "echo '$MASTER_IP master' >> /etc/hosts"
  docker exec $container bash -c "echo '$SLAVE1_IP slave1' >> /etc/hosts"
  docker exec $container bash -c "echo '$SLAVE2_IP slave2' >> /etc/hosts"
  docker exec $container cat /etc/hosts | tail -3
done
echo ""

echo "=== 步骤5：配置hostname ==="
docker exec k8s-hadoop-1 hostnamectl set-hostname master
docker exec hadoop-slave1 hostnamectl set-hostname slave1
docker exec hadoop-slave2 hostnamectl set-hostname slave2

echo "✅ hostname已配置"
docker exec k8s-hadoop-1 hostname
docker exec hadoop-slave1 hostname
docker exec hadoop-slave2 hostname
echo ""

echo "=== 步骤6：配置workers文件 ==="
docker exec k8s-hadoop-1 bash -c "echo 'slave1' > \$HADOOP_HOME/etc/hadoop/workers"
docker exec k8s-hadoop-1 bash -c "echo 'slave2' >> \$HADOOP_HOME/etc/hadoop/workers"
echo "✅ workers文件已配置"
docker exec k8s-hadoop-1 cat \$HADOOP_HOME/etc/hadoop/workers
echo ""

echo "=== 步骤7：创建xsync.sh配置同步脚本 ==="
cat > xsync.sh << 'EOF'
#!/bin/bash
# Hadoop集群配置同步脚本

MASTER="k8s-hadoop-1"
SLAVES=("hadoop-slave1" "hadoop-slave2")
HADOOP_CONF="$HADOOP_HOME/etc/hadoop"

echo "开始同步配置到slave节点..."

for slave in "${SLAVES[@]}"; do
  echo "=== 同步到 $slave ==="
  docker cp ${MASTER}:${HADOOP_CONF} ${slave}:${HADOOP_CONF}
  echo "✓ $slave 同步完成"
done

echo "配置同步完成！"
EOF

chmod +x xsync.sh
echo "✅ xsync.sh已创建"
cat xsync.sh
echo ""

echo "=== 步骤8：停止所有Hadoop服务 ==="
docker exec k8s-hadoop-1 bash -c "$HADOOP_HOME/sbin/stop-all.sh" 2>/dev/null || true
sleep 3
echo ""

echo "=== 步骤9：格式化NameNode（只执行一次）==="
docker exec k8s-hadoop-1 bash -c "echo 'y' | \$HADOOP_HOME/bin/hdfs namenode -format"
echo ""

echo "=== 步骤10：启动HDFS ==="
docker exec k8s-hadoop-1 bash -c "$HADOOP_HOME/sbin/start-dfs.sh"
sleep 5
echo ""

echo "=== 步骤11：启动YARN ==="
docker exec k8s-hadoop-1 bash -c "$HADOOP_HOME/sbin/start-yarn.sh"
sleep 5
echo ""

echo "=== 步骤12：验证进程（3个容器）==="
echo "--- master进程 ---"
docker exec k8s-hadoop-1 jps
echo ""
echo "--- slave1进程 ---"
docker exec hadoop-slave1 jps
echo ""
echo "--- slave2进程 ---"
docker exec hadoop-slave2 jps
echo ""

echo "=== 步骤13：验证HDFS报告 ==="
docker exec k8s-hadoop-1 bash -c "$HADOOP_HOME/bin/hdfs dfsadmin -report" | head -20
echo ""

echo "=========================================="
echo "✅ PRD 3 完成！3节点Hadoop集群已启动"
echo "=========================================="
echo ""
echo "请在浏览器中访问并截图："
echo "  HDFS WebUI: http://localhost:9870/dfshealth.html#LiveNodes"
echo "  YARN WebUI: http://localhost:8088/cluster/nodes"
