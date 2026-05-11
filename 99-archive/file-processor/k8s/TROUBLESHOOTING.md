# K3s 常见问题与修复方案

## 问题 1: kubectl 连接超时 (EOF)

### 症状
```
Unable to connect to the server: EOF
```

### 原因
kubeconfig 中使用 `host.docker.internal` 连接，但 macOS 环境下连接不稳定。

### 修复方案
```bash
# 方案1: 修改 kubeconfig 使用 localhost
k3d kubeconfig get my-projects | sed 's/host.docker.internal/localhost/g' > ~/.kube/config

# 方案2: 重新生成 kubeconfig
k3d kubeconfig get my-projects > ~/.kube/config

# 验证连接
kubectl get nodes
```

---

## 问题 2: 集群无法启动

### 症状
集群创建后节点 NotReady

### 修复方案
```bash
# 停止并重新启动集群
k3d cluster stop my-projects
k3d cluster start my-projects

# 等待 30 秒后检查
sleep 30
kubectl get nodes
```

---

## 问题 3: Pod 一直处于 Pending 状态

### 症状
Pod 状态为 Pending，无法启动

### 原因
可能是存储卷或资源不足

### 修复方案
```bash
# 检查 PVC 状态
kubectl get pvc -n file-processor

# 检查 Events
kubectl describe pod <pod-name> -n file-processor

# 检查节点资源
kubectl describe nodes
```

---

## 问题 4: 镜像拉取失败

### 症状
Pod 报 ImagePullBackOff

### 修复方案
```bash
# 对于本地镜像，使用 IfNotPresent 策略
# 在 Deployment 中设置:
imagePullPolicy: IfNotPresent

# 或手动导入镜像到 k3d
k3d image import my-image:tag -c my-projects

# 列出已导入的镜像
k3d image list
```

---

## 问题 5: 服务无法访问

### 症状
外部无法访问 NodePort 服务

### 修复方案
```bash
# 检查服务状态
kubectl get svc -n file-processor

# 检查端点
kubectl get endpoints -n file-processor

# 检查 Pod 状态
kubectl get pods -n file-processor

# 查看服务日志
kubectl logs <pod-name> -n file-processor
```

---

## 问题 6: 内存不足导致节点宕机

### 症状
Docker 容器崩溃，k3s 节点不可用

### 修复方案
```bash
# 1. 清理未使用的 Docker 资源
docker system prune -a

# 2. 限制 k3d 容器内存
k3d cluster delete my-projects
k3d cluster create my-projects \
  --k3s-arg "--disable=traefik@server:0" \
  --k3s-arg "--disable=servicelb@server:0" \
  --memory 4g

# 3. 检查当前内存使用
docker stats
```

---

## 问题 7: CoreDNS 无法解析服务

### 症状
服务间无法通过服务名通信

### 修复方案
```bash
# 重启 CoreDNS
kubectl rollout restart deployment/coredns -n kube-system

# 检查 CoreDNS 日志
kubectl logs -l k8s-app=kube-dns -n kube-system
```

---

## 问题 8: PersistentVolumeClaim 一直 Pending

### 症状
PVC 状态为 Pending

### 修复方案
```bash
# 使用 Local Path Provisioner
# 确保 Local Path Provisioner 运行正常
kubectl get pods -n kube-system | grep local-path

# 检查 StorageClass
kubectl get sc

# 如果没有默认 StorageClass，指定
storageClassName: local-path
```
