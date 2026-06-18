# PRD 3：实验三 - Hadoop分布式集群

## 阶段目标
搭建3节点Hadoop完全分布式集群，所有操作在终端执行并截图，完成实验三要求的所有步骤。

## 成功标准
- [ ] 创建3个容器：k8s-hadoop-1 (master), hadoop-slave1, hadoop-slave2
- [ ] 配置/etc/hosts实现3节点互相识别
- [ ] 配置workers文件包含slave1和slave2
- [ ] 编写xsync.sh配置同步脚本
- [ ] 格式化NameNode并启动HDFS+YARN
- [ ] WebUI验证：http://localhost:9870 显示3个DataNode
- [ ] WebUI验证：http://localhost:8088 显示3个NodeManager

## 执行清单

### 1. 终端执行：创建hadoop-template镜像（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"
echo "=== 提交master容器为模板 ==="
docker commit k8s-hadoop-1 hadoop-template:latest
docker images | grep hadoop
```

### 2. 终端执行：创建slave节点（截图）
```bash
echo "=== 创建slave1和slave2 ==="
docker run -itd --name hadoop-slave1 \
  --network k8s_file_processor_network \
  hadoop-template

docker run -itd --name hadoop-slave2 \
  --network k8s_file_processor_network \
  hadoop-template

docker ps | grep hadoop
```

### 3. 终端执行：查看容器IP并配置/etc/hosts（截图）
```bash
echo "=== 获取容器IP ==="
docker inspect hadoop-slave1 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
docker inspect hadoop-slave2 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
docker inspect k8s-hadoop-1 -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

echo "=== 在各容器配置/etc/hosts ==="
# 在3个容器中都执行
for container in k8s-hadoop-1 hadoop-slave1 hadoop-slave2; do
  echo "--- $container ---"
  docker exec $container bash -c "echo '172.28.0.6 master' >> /etc/hosts"
  docker exec $container bash -c "echo '172.28.0.7 slave1' >> /etc/hosts"  
  docker exec $container bash -c "echo '172.28.0.8 slave2' >> /etc/hosts"
  docker exec $container cat /etc/hosts | tail -3
done
```

### 4. 终端执行：配置hostname（截图）
```bash
docker exec k8s-hadoop-1 hostnamectl set-hostname master
docker exec hadoop-slave1 hostnamectl set-hostname slave1
docker exec hadoop-slave2 hostnamectl set-hostname slave2

docker exec k8s-hadoop-1 hostname
docker exec hadoop-slave1 hostname
docker exec hadoop-slave2 hostname
```

### 5. 终端执行：配置workers文件（截图）
```bash
echo "=== 配置master的workers文件 ==="
docker exec k8s-hadoop-1 bash -c "echo 'slave1' > \$HADOOP_HOME/etc/hadoop/workers"
docker exec k8s-hadoop-1 bash -c "echo 'slave2' >> \$HADOOP_HOME/etc/hadoop/workers"
docker exec k8s-hadoop-1 cat \$HADOOP_HOME/etc/hadoop/workers
```

### 6. 终端创建：xsync.sh配置同步脚本（截图）
```bash
echo "=== 创建配置同步脚本 ==="
cat > scripts/xsync.sh << 'EOF'
#!/bin/bash
# Hadoop集群配置同步脚本

MASTER="k8s-hadoop-1"
SLAVES=("hadoop-slave1" "hadoop-slave2")
HADOOP_CONF="\$HADOOP_HOME/etc/hadoop"

echo "开始同步配置到slave节点..."

for slave in "${SLAVES[@]}"; do
  echo "=== 同步到 $slave ==="
  docker cp ${MASTER}:${HADOOP_CONF} ${slave}:${HADOOP_CONF}
  echo "✓ $slave 同步完成"
done

echo "配置同步完成！"
EOF

chmod +x scripts/xsync.sh
cat scripts/xsync.sh
```

### 7. 终端执行：格式化NameNode并启动集群（截图）
```bash
echo "=== 格式化NameNode（只执行一次）==="
docker exec k8s-hadoop-1 bash -c "echo 'y' | \$HADOOP_HOME/bin/hdfs namenode -format"

echo "=== 启动HDFS ==="
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/sbin/start-dfs.sh"
sleep 5

echo "=== 启动YARN ==="
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/sbin/start-yarn.sh"
sleep 5

echo "=== 验证进程 ==="
docker exec k8s-hadoop-1 jps
docker exec hadoop-slave1 jps
docker exec hadoop-slave2 jps
```

### 8. WebUI验证（浏览器截图）
```bash
# 在浏览器中访问并截图：
# http://localhost:9870/dfshealth.html#LiveNodes （应显示3个DataNode）
# http://localhost:8088/cluster/nodes （应显示3个NodeManager）
```

## 测试验证
- `hdfs dfsadmin -report` 显示3个Live datanodes
- YARN WebUI显示3个Active NodeManager
- SSH免密登录：`docker exec k8s-hadoop-1 ssh slave1` 无需密码

## 截图要求
1. docker commit创建模板镜像
2. docker run创建slave容器
3. /etc/hosts配置内容
4. workers文件内容
5. xsync.sh脚本内容
6. jps进程列表（3个容器）
7. HDFS WebUI - Live Nodes（3个DataNode）
8. YARN WebUI - Nodes（3个NodeManager）

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 3为完成
- 记录3节点集群状态
