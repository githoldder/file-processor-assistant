# Hadoop Docker 镜像工作流

本项目把 Hadoop / MapReduce 实验镜像当成可远程恢复的实验资产：平时本地不保留大镜像，需要实验或演示时从 Docker Hub 拉取；修改完成后再 commit 并 push 回 Docker Hub。

## 当前状态

已知 Docker Hub 用户名：

```text
chaoliu123
```

默认脚本配置为：

```text
REMOTE_IMAGE=chaoliu123/myubuntu
REMOTE_TAG=hadoop-mapreduce-lab-topn
LOCAL_IMAGE=myubuntu:hadoop-mapreduce-lab-topn
HADOOP_CONTAINER=hadoop-mapreduce-lab
```

2026-06-03 已重新构建并推送到 Docker Hub，远端 manifest 已验证：

```text
docker.io/chaoliu123/myubuntu:hadoop-mapreduce-lab-topn
digest: sha256:6552b3b4ec0a150195728741c97f086f4ac9e3086bfa20bc80a1965b9a25787d
platform: linux/arm64
```

本镜像包含 Hadoop 3.3.6、Hive 3.1.3、实验 5 TopN MapReduce 程序、实验 6 Hive 测试脚本。构建时 Hadoop 安装包默认从清华 TUNA 镜像站下载；Hive 安装包和 JDBC/commons jars 复用本机实验目录，减少外网下载。

## 初始化配置

```bash
cp .env.hadoop.example .env.hadoop
```

如果 Docker Hub 仓库不是 `chaoliu123/myubuntu`，编辑：

```bash
REMOTE_IMAGE=chaoliu123/真实仓库名
REMOTE_TAG=真实tag
```

如果仓库是 private，先登录：

```bash
docker login
```

## 一键拉取

```bash
scripts/hadoop-image.sh pull
```

脚本会执行：

```bash
docker pull "$REMOTE_IMAGE:$REMOTE_TAG"
docker tag "$REMOTE_IMAGE:$REMOTE_TAG" "$LOCAL_IMAGE"
```

远端校验：

```bash
scripts/hadoop-image.sh verify-remote
```

## 一键创建/启动容器

```bash
scripts/hadoop-image.sh run
```

默认容器名：

```text
hadoop-mapreduce-lab
```

默认端口：

```text
8088 -> YARN ResourceManager
9870 -> HDFS NameNode UI
```

进入容器：

```bash
scripts/hadoop-image.sh shell
```

容器启动后可直接运行实验验证：

```bash
docker exec hadoop-mapreduce-lab run-mapreduce-topn.sh
docker exec hadoop-mapreduce-lab run-hive-exam6.sh
```

停止容器：

```bash
scripts/hadoop-image.sh stop
```

删除容器但保留镜像：

```bash
scripts/hadoop-image.sh clean
```

## 修改镜像

进入容器后直接修改实验环境：

```bash
scripts/hadoop-image.sh shell
```

例如在容器内新增代码、安装依赖、跑 MapReduce 实验。修改完成后退出 shell。

## 一键 commit

使用默认时间戳 tag：

```bash
scripts/hadoop-image.sh commit
```

指定 tag：

```bash
scripts/hadoop-image.sh commit hadoop-mapreduce-lab-topn-v2
```

脚本会生成两个 tag：

```text
myubuntu:<tag>
chaoliu123/真实仓库名:<tag>
```

## 一键 push

推送默认 tag：

```bash
scripts/hadoop-image.sh push
```

推送指定 tag：

```bash
scripts/hadoop-image.sh push hadoop-mapreduce-lab-topn-v2
```

推送完成后务必校验远端 manifest：

```bash
scripts/hadoop-image.sh verify-remote
```

## 查看状态

```bash
scripts/hadoop-image.sh status
```

## 和 demo compose 配合

如果 `.env.hadoop` 中的镜像配置正确，也可以用演示栈启动 Hadoop：

```bash
source .env.hadoop
scripts/demo-up.sh hadoop
```

演示结束后清理 demo 栈：

```bash
scripts/demo-down.sh
```
