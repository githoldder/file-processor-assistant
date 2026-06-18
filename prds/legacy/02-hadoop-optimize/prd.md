# PRD 2：Hadoop镜像优化

## 阶段目标
精简myubuntu:hadoop-yarn-v1镜像，从4.31GB压缩至≤3GB，保留实验所需最小集（Hadoop HDFS+YARN, JDK8, SSH）。

## 成功标准
- [ ] 镜像大小从4.31GB降至≤3GB
- [ ] 保留：Hadoop HDFS + YARN完整功能
- [ ] 保留：JDK 1.8.0_482
- [ ] 保留：SSH免密登录配置
- [ ] 清理：apt缓存、/usr/share/doc、/usr/share/man、/tmp/*
- [ ] 验证：容器启动后 `jps` 显示5个进程（NameNode, DataNode, SecondaryNameNode, ResourceManager, NodeManager）

## 执行清单

### 1. 终端执行：进入容器清理（截图）
```bash
docker exec -it k8s-hadoop-1 bash -c "
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
_history -c

echo '=== 检查清理效果 ==='
du -sh /usr/share/doc /usr/share/man /var/lib/apt/lists
"
```

### 2. 终端执行：提交优化后的镜像（截图）
```bash
docker commit k8s-hadoop-1 myubuntu:hadoop-yarn-lean
docker images | grep hadoop
```

### 3. 终端执行：验证优化后镜像（截图）
```bash
# 停止原容器，使用新镜像启动测试
docker stop k8s-hadoop-1
docker rm k8s-hadoop-1
docker run -d --name k8s-hadoop-test \
  -p 8088:8088 -p 9870:9870 -p 9864:9864 -p 9866:9866 \
  myubuntu:hadoop-yarn-lean \
  bash -c "service ssh start && /usr/local/hadoop/sbin/start-all.sh && tail -f /dev/null"

sleep 10
docker exec k8s-hadoop-test jps
```

### 4. 终端执行：确认功能正常后替换（截图）
```bash
docker stop k8s-hadoop-test && docker rm k8s-hadoop-test
docker tag myubuntu:hadoop-yarn-lean myubuntu:hadoop-yarn-v1
docker images | grep hadoop
```

## 测试验证
- `jps` 显示5个Hadoop进程
- `curl http://localhost:9870` 能访问HDFS WebUI
- `curl http://localhost:8088` 能访问YARN WebUI
- SSH免密登录正常：`ssh localhost` 无需密码

## 截图要求
1. 容器内清理命令执行过程
2. `docker commit` 创建新镜像
3. 新镜像启动后 `jps` 输出
4. WebUI访问成功截图
5. 最终镜像大小对比

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 2为完成
- 记录优化后的镜像大小
- 更新环境信息中的镜像版本
