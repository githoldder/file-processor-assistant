# Docker API 调用说明

Docker CLI 本质上也是 Docker Engine API 的客户端。macOS Docker Desktop 默认通过 Unix socket 暴露本机 Docker API，当前环境里 socket 路径通常是：

```text
unix:///Users/caolei/.docker/run/docker.sock
```

## 1. 本机直接调用 Docker Engine API

使用 `curl` 通过 Unix socket 调用：

```bash
curl --unix-socket /Users/caolei/.docker/run/docker.sock http://localhost/version
curl --unix-socket /Users/caolei/.docker/run/docker.sock http://localhost/images/json
curl --unix-socket /Users/caolei/.docker/run/docker.sock http://localhost/containers/json?all=1
```

创建并启动容器示例：

```bash
curl --unix-socket /Users/caolei/.docker/run/docker.sock \
  -H 'Content-Type: application/json' \
  -d '{"Image":"hello-world"}' \
  http://localhost/containers/create?name=api-test

curl --unix-socket /Users/caolei/.docker/run/docker.sock \
  -X POST \
  http://localhost/containers/api-test/start
```

## 2. 从 Python/FastAPI 调用

项目后端已安装 `httpx`，可以使用 Unix socket transport：

```python
import httpx

transport = httpx.AsyncHTTPTransport(uds="/Users/caolei/.docker/run/docker.sock")

async with httpx.AsyncClient(transport=transport, base_url="http://docker") as client:
    version = await client.get("/version")
    images = await client.get("/images/json")
```

如果后端运行在容器里，需要把宿主机 socket 挂载进去，例如：

```yaml
services:
  api:
    volumes:
      - /Users/caolei/.docker/run/docker.sock:/var/run/docker.sock
    environment:
      - DOCKER_SOCKET=/var/run/docker.sock
```

然后在容器内用 `/var/run/docker.sock` 调用。

## 3. 安全边界

Docker socket 等同于宿主机 root 级控制权。只要一个服务能访问 Docker API，它就可以创建特权容器、挂载宿主机目录、读取敏感文件。因此建议：

1. 默认只开放只读查询接口，例如 `version`、`images/json`、`containers/json`。
2. 启动、停止、删除、构建镜像等写操作必须做鉴权和白名单。
3. 不要把 Docker API 直接暴露到公网端口。
4. 如果要给前端使用，建议由 FastAPI 做受控代理，而不是让浏览器直接访问 Docker socket。
