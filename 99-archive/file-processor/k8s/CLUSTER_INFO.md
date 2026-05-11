# K3s 集群配置信息

## 集群详情

| 项目 | 值 |
|------|-----|
| 集群名称 | my-projects |
| K3s 版本 | v1.33.6+k3s1 |
| API Server | https://localhost:6443 |
| Kubeconfig | ~/.kube/config |
| 节点数量 | 1 (server-0) |

## 端口映射

| 服务 | NodePort | 集群内部端口 |
|------|----------|-------------|
| Nginx HTTP | 30080 | 80 |
| Nginx HTTPS | 30443 | 443 |
| API | - | 8000 |
| Redis | - | 6379 |
| PostgreSQL | - | 5432 |
| Gotenberg | - | 3000 |

## 命名空间

- `file-processor`: 文件处理全能助手项目专用命名空间

## 存储卷

| PVC 名称 | 存储大小 | 用途 |
|----------|---------|------|
| redis-data | 1Gi | Redis 数据持久化 |
| postgres-data | 5Gi | PostgreSQL 数据持久化 |
| upload-data | 10Gi | 上传文件存储 |

## 核心组件

- CoreDNS: kube-system 命名空间
- Metrics Server: kube-system 命名空间
- Local Path Provisioner: kube-system 命名空间

## 服务发现

在 file-processor 命名空间内，服务可通过服务名直接访问：
- `redis` -> redis:6379
- `postgres` -> postgres:5432
- `gotenberg` -> gotenberg:3000
- `api` -> api:8000
- `nginx` -> nginx:80
