# CulCloud 手动终端验证清单

说明：建议每执行完一个小节后保存一张终端结果图。终端窗口建议调整到约 120 列，字体稍大，保证命令和返回结果都清晰可读。

## A. 服务运行边界

### A1 Docker Compose 服务状态

```bash
cd /Users/caolei/Desktop/culcloud-platform
docker compose ps
```

验证重点：Redis、MinIO、Gotenberg 等基础依赖是否处于运行状态。

### A2 PM2 进程状态

```bash
cd /Users/caolei/Desktop/culcloud-platform
pm2 status
```

验证重点：前端、后端、分析服务等本地进程是否由 PM2 正常守护。

### A3 服务健康接口

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/health
curl --noproxy "*" -sS http://127.0.0.1:5050/health
```

验证重点：FastAPI 与 Flask Analytics 是否可访问。

## B. FastAPI 实时运行数据

### B1 文件对象接口

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files | python3 -m json.tool
```

验证重点：后端能否读取当前文件对象列表。

### B2 任务、日志与队列统计

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/logs/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/queue-length | python3 -m json.tool
```

验证重点：管理端第一屏实时指标是否有真实 API 来源。

## C. 文件上传与日志闭环

### C1 上传验证文件

```bash
cd /Users/caolei/Desktop/culcloud-platform
printf "CulCloud verification file\n" > /tmp/culcloud-verification.txt
curl --noproxy "*" -sS -X POST \
  -F "file=@/tmp/culcloud-verification.txt" \
  http://127.0.0.1:8000/api/v1/files/upload | python3 -m json.tool
```

验证重点：文件上传接口是否返回结构化结果。

### C2 上传后的文件列表与近期日志

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files | python3 -m json.tool
curl --noproxy "*" -sS "http://127.0.0.1:8000/api/v1/logs/recent?limit=10" | python3 -m json.tool
```

验证重点：上传动作是否进入文件列表和事件日志。

## D. 用户端到管理端联动

在用户端完成一次上传、转换或 PDF 导出后，立即执行：

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/stats | python3 -m json.tool
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/logs/stats | python3 -m json.tool
```

验证重点：用户端业务操作是否带来任务统计和日志统计变化。随后可切到管理端第一屏，保存实时指标区域图像。

## E. 自动化测试与脚本确认

### E1 查看可用 npm 脚本

```bash
cd /Users/caolei/Desktop/culcloud-platform
cat package.json
cat file-cloud-frontend/package.json
```

验证重点：确认当前仓库真实可用的测试脚本名称。

### E2 端到端测试

```bash
cd /Users/caolei/Desktop/culcloud-platform
npm run test:e2e
```

如果脚本名不同，以 `package.json` 中实际脚本为准。

## F. 异常边界验证

### F1 不存在任务

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/tasks/not-exist-task-id | python3 -m json.tool
```

验证重点：不存在任务是否返回结构化错误。

### F2 不存在文件

```bash
curl --noproxy "*" -sS http://127.0.0.1:8000/api/v1/files/not-exist-file-id | python3 -m json.tool
```

验证重点：不存在文件是否返回结构化错误。

## 建议保存图像顺序

1. Docker Compose 服务状态
2. PM2 进程状态
3. 健康接口与实时统计接口
4. 文件上传返回结果
5. 上传后的文件列表与日志
6. 用户端操作后的任务/日志统计变化
7. 端到端测试结果
8. 异常边界返回结果
