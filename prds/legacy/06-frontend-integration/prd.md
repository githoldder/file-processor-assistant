# PRD 6：前端集成

## 阶段目标
将file-cloud-frontend对接file-processor后端服务，实现文件上传、下载、预览功能，使用Playwright有头模式测试。

## 成功标准
- [ ] 修改前端API端点指向http://localhost:8000
- [ ] 前端能访问file-processor的API文档
- [ ] 利用MinIO作为存储后端（通过API中转）
- [ ] Playwright有头测试文件上传功能
- [ ] Playwright有头测试文件下载功能
- [ ] Playwright有头测试文件预览功能
- [ ] 验证前端与后端协同工作

## 执行清单

### 1. 检查前端配置（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-cloud-frontend"
echo "=== 检查前端配置文件 ==="
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "API\|endpoint\|url" 2>/dev/null | head -5

echo "=== 检查package.json依赖 ==="
cat package.json | python3 -c "import sys,json;d=json.load(sys.stdin);print('依赖:',list(d.get('dependencies',{}).keys())[:10])"
```

### 2. 创建前端环境配置（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-cloud-frontend"
echo "=== 创建.env配置文件 ==="
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000
VITE_MINIO_ENDPOINT=http://localhost:9000
VITE_APP_NAME=文件处理与云盘系统
EOF

cat .env
```

### 3. 创建API服务层（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-cloud-frontend"
mkdir -p src/services

cat > src/services/api.ts << 'EOF'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface FileItem {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  upload_time: string;
}

export async function uploadFile(file: File): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}

export async function getFileInfo(fileId: string): Promise<FileItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/${fileId}`);

  if (!response.ok) {
    throw new Error('File not found');
  }

  return response.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
EOF

cat src/services/api.ts
```

### 4. 构建并测试前端（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-cloud-frontend"
echo "=== 安装依赖 ==="
npm install

echo "=== 构建前端 ==="
npm run build 2>&1 | tail -10

echo "=== 检查构建结果 ==="
ls -la dist/ 2>/dev/null || echo "dist目录不存在"
```

### 5. Playwright有头测试集成功能（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"

cat > scripts/test-integration-headed.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. 访问集成后的前端界面...');
    await page.goto('http://localhost:80');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/integration-1-frontend-home.png' });

    console.log('2. 测试API健康状态...');
    const health = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8000/health');
      return res.json();
    });
    console.log('API健康状态:', health);

    console.log('3. 测试文件上传...');
    // 创建测试文件
    await page.evaluate(() => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });
      const input = document.createElement('input');
      input.type = 'file';
      input.files = [file];
      input.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/02-process/screenshots/integration-2-upload.png' });

    console.log('4. 访问MinIO控制台...');
    await page.goto('http://localhost:9001');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/integration-3-minio.png' });

    console.log('✅ 前端集成测试完成！');
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
  }

  await browser.close();
})();
EOF

node scripts/test-integration-headed.js
```

## 测试验证
- 前端能成功连接后端API
- 文件上传功能正常工作
- MinIO存储后端可用
- Playwright有头测试通过

## 截图要求
1. 前端配置文件.env
2. api.ts服务层代码
3. npm install和构建过程
4. Playwright有头测试过程
5. 集成后界面截图（3-5张）
6. 文件上传功能演示截图

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 6为完成
- 记录前端集成状态
- 更新最终交付状态
