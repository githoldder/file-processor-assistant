# K3s 快速部署指南

## 前提条件

- macOS
- Docker Desktop 已安装并运行
- 已安装 k3d: `brew install k3d`
- 已安装 kubectl: `brew install kubectl`

---

## 快速启动

### 1. 创建集群

```bash
# 创建单节点集群 (推荐用于开发)
k3d cluster create my-projects \
  --k3s-arg "--disable=traefik@server:0" \
  --k3s-arg "--disable=servicelb@server:0"

# 等待集群启动
sleep 30
```

### 2. 配置 kubectl

```bash
# 修复 localhost 连接问题
k3d kubeconfig get my-projects | sed 's/host.docker.internal/localhost/g' > ~/.kube/config

# 验证连接
kubectl get nodes
```

### 3. 部署应用

```bash
# 进入项目目录
cd /path/to/project

# 部署所有资源
kubectl apply -f k8s/

# 检查部署状态
kubectl get pods -n file-processor -w

# 检查服务
kubectl get svc -n file-processor
```

---

## 常用命令

### 集群管理

```bash
# 启动集群
k3d cluster start my-projects

# 停止集群
k3d cluster stop my-projects

# 删除集群
k3d cluster delete my-projects

# 查看集群列表
k3d cluster list

# 查看 kubeconfig
k3d kubeconfig get my-projects
```

### 资源操作

```bash
# 查看所有命名空间
kubectl get ns

# 查看指定命名空间的 Pod
kubectl get pods -n file-processor

# 查看 Pod 日志
kubectl logs -f <pod-name> -n file-processor

# 进入 Pod 调试
kubectl exec -it <pod-name> -n file-processor -- /bin/sh

# 删除所有资源
kubectl delete -f k8s/

# 重启 Deployment
kubectl rollout restart deployment/<deployment-name> -n file-processor

# 扩缩容
kubectl scale deployment/<deployment-name> --replicas=3 -n file-processor
```

### 监控

```bash
# 查看节点资源
kubectl top nodes

# 查看 Pod 资源
kubectl top pods -n file-processor

# 查看 Events
kubectl get events -n file-processor --sort-by='.lastTimestamp'
```

---

## 部署文件说明

| 文件 | 用途 |
|------|------|
| `00-namespace.yaml` | 创建 file-processor 命名空间 |
| `01-configmap.yaml` | Nginx 配置文件 |
| `02-pvc.yaml` | 持久化存储卷声明 |
| `03-redis.yaml` | Redis Deployment + Service |
| `04-postgres.yaml` | PostgreSQL Deployment + Service |
| `05-gotenberg.yaml` | Gotenberg Deployment + Service |
| `06-api.yaml` | API Deployment + Service |
| `07-nginx.yaml` | Nginx Deployment + Service |
| `08-celery.yaml` | Celery Workers Deployment |

---

## 访问服务

| 服务 | 访问地址 |
|------|---------|
| 前端 | http://localhost:30080 |
| API | 集群内部: api:8000 |
| Redis | 集群内部: redis:6379 |
| PostgreSQL | 集群内部: postgres:5432 |
| Gotenberg | 集群内部: gotenberg:3000 |

---

## 多项目隔离示例

为其他项目创建独立的命名空间：

```bash
# 创建新命名空间
kubectl create namespace <project-name>

# 为项目创建独立的部署文件
# 在每个 Deployment 中指定:
namespace: <project-name>
```

---

## 清理

```bash
# 删除所有部署
kubectl delete -f k8s/

# 删除 PVC (会丢失数据!)
kubectl delete pvc -n file-processor --all

# 完全删除集群
k3d cluster delete my-projects
```
