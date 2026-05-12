# PRD 5：MVP验证

## 阶段目标
验证轻量化MVP所有服务健康运行，使用Playwright有头模式测试前端界面，完成全流程验证。

## 成功标准
- [ ] docker-compose.v2-lightweight-b.yml所有服务启动成功
- [ ] curl验证API健康：http://localhost:8000/health → {"status":"healthy"}
- [ ] curl验证MinIO健康：http://localhost:9000/minio/health/live → 响应
- [ ] curl验证Hadoop YARN：http://localhost:8088/ws/v1/cluster/info → STARTED
- [ ] curl验证HDFS WebUI：http://localhost:9870 → 响应
- [ ] Playwright有头模式测试前端界面成功
- [ ] 验证文件上传→转换→存储全流程

## 执行清单

### 1. 终端执行：启动轻量化服务（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-processor"
echo "=== 启动轻量化MVP服务 ==="
docker-compose -f k8s/docker-compose.v2-lightweight-b.yml up -d

echo "=== 等待服务启动 ==="
sleep 10

echo "=== 检查服务状态 ==="
docker-compose -f k8s/docker-compose.v2-lightweight-b.yml ps
```

### 2. 终端执行：验证服务健康状态（截图）
```bash
echo "=== 验证API健康 ==="
curl -s http://localhost:8000/health | python3 -m json.tool

echo "=== 验证MinIO健康 ==="
curl -s http://localhost:9000/minio/health/live && echo " MinIO健康"

echo "=== 验证YARN状态 ==="
curl -s http://localhost:8088/ws/v1/cluster/info | python3 -c "import sys,json; d=json.load(sys.stdin); print('YARN状态:', d['clusterInfo']['state'])"

echo "=== 验证HDFS WebUI ==="
curl -s http://localhost:9870 | head -5
```

### 3. 终端执行：检查资源占用（截图）
```bash
echo "=== Docker容器资源占用 ==="
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"

echo "=== 系统磁盘空间 ==="
df -h /
```

### 4. Playwright有头模式测试（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"

echo "=== 创建Playwright测试脚本 ==="
cat > scripts/test-mvp-headed.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. 访问前端界面...');
  await page.goto('http://localhost:80');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/02-process/screenshots/mvp-1-frontend.png' });

  console.log('2. 访问API文档...');
  await page.goto('http://localhost:8000/docs');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/02-process/screenshots/mvp-2-api-docs.png' });

  console.log('3. 访问MinIO控制台...');
  await page.goto('http://localhost:9001');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/02-process/screenshots/mvp-3-minio-console.png' });

  console.log('4. 访问YARN WebUI...');
  await page.goto('http://localhost:8088');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/02-process/screenshots/mvp-4-yarn-ui.png' });

  console.log('5. 访问HDFS WebUI...');
  await page.goto('http://localhost:9870');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/02-process/screenshots/mvp-5-hdfs-ui.png' });

  console.log('✅ MVP验证截图完成！');
  await browser.close();
})();
EOF

cat scripts/test-mvp-headed.js
```

### 5. 终端执行：运行Playwright有头测试（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"
npx playwright install chromium 2>/dev/null || true
node scripts/test-mvp-headed.js
```

## 测试验证
- 所有服务健康状态返回正常
- Playwright有头模式成功访问5个界面并截图
- 资源占用合理（内存≤12GB，磁盘≤15GB）

## 截图要求
1. docker-compose up启动过程
2. 服务状态：docker-compose ps
3. 4个健康验证curl命令输出
4. docker stats资源占用
5. Playwright有头测试过程（录屏或连续截图）
6. 5个界面截图（frontend, API docs, MinIO, YARN, HDFS）

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 5为完成
- 记录MVP验证结果
- 更新资源占用数据
