# PRD 4：实验四 - WebHDFS编程

## 阶段目标
开启WebHDFS，使用Node.js通过WebHDFS API操作HDFS，完成文件上传、下载、删除、重命名等操作，终端执行并截图。

## 成功标准
- [ ] hdfs-site.xml配置dfs.webhdfs.enabled=true
- [ ] 重启HDFS使配置生效
- [ ] curl测试WebHDFS API正常响应
- [ ] Node.js脚本实现文件上传到HDFS
- [ ] Node.js脚本实现文件从HDFS下载
- [ ] Node.js脚本实现文件删除
- [ ] Node.js脚本实现文件重命名
- [ ] 验证HDFS文件操作成功

## 执行清单

### 1. 终端执行：检查和配置WebHDFS（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform"
echo "=== 检查当前WebHDFS配置 ==="
docker exec k8s-hadoop-1 bash -c "cat \$HADOOP_HOME/etc/hadoop/hdfs-site.xml"

echo "=== 添加WebHDFS配置 ==="
docker exec k8s-hadoop-1 bash -c "sed -i '/<\/configuration>/d' \$HADOOP_HOME/etc/hadoop/hdfs-site.xml"
docker exec k8s-hadoop-1 bash -c "echo '<property><name>dfs.webhdfs.enabled</name><value>true</value></property>' >> \$HADOOP_HOME/etc/hadoop/hdfs-site.xml"
docker exec k8s-hadoop-1 bash -c "echo '</configuration>' >> \$HADOOP_HOME/etc/hadoop/hdfs-site.xml"

echo "=== 验证配置 ==="
docker exec k8s-hadoop-1 bash -c "cat \$HADOOP_HOME/etc/hadoop/hdfs-site.xml | grep webhdfs"
```

### 2. 终端执行：重启HDFS使配置生效（截图）
```bash
echo "=== 重启HDFS ==="
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/sbin/stop-dfs.sh"
sleep 3
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/sbin/start-dfs.sh"
sleep 5

echo "=== 验证HDFS状态 ==="
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/bin/hdfs dfsadmin -report" | head -10
```

### 3. 终端执行：curl测试WebHDFS API（截图）
```bash
echo "=== 测试WebHDFS API ==="
curl -s "http://localhost:9870/webhdfs/v1/?op=LISTSTATUS" | python3 -m json.tool

echo "=== 测试创建目录 ==="
curl -s -X PUT "http://localhost:9870/webhdfs/v1/testdir?op=MKDIRS"

echo "=== 验证目录创建 ==="
curl -s "http://localhost:9870/webhdfs/v1/?op=LISTSTATUS" | python3 -m json.tool
```

### 4. 终端创建：完整的Node.js测试脚本（截图）
```bash
mkdir -p file-processor/test-hdfs
cat > file-processor/test-hdfs/full-test.js << 'EOF'
const WebHDFS = require('webhdfs');
const fs = require('fs');
const path = require('path');

const hdfs = WebHDFS.createClient({
  user: 'root',
  host: 'localhost',
  port: 9870,
  path: '/webhdfs/v1'
});

// 测试文件
const testFile = 'test.txt';
const hdfsPath = '/test.txt';
const downloadPath = 'downloaded.txt';

// 1. 上传文件
function uploadFile() {
  return new Promise((resolve, reject) => {
    console.log('1. 上传文件到HDFS...');
    const local = fs.createReadStream(testFile);
    const remote = hdfs.createWriteStream(hdfsPath);
    
    local.pipe(remote);
    
    remote.on('finish', () => {
      console.log('✅ 上传成功：' + hdfsPath);
      resolve();
    });
    
    remote.on('error', reject);
  });
}

// 2. 下载文件
function downloadFile() {
  return new Promise((resolve, reject) => {
    console.log('2. 从HDFS下载文件...');
    const remote = hdfs.createReadStream(hdfsPath);
    const local = fs.createWriteStream(downloadPath);
    
    remote.pipe(local);
    
    remote.on('end', () => {
      const content = fs.readFileSync(downloadPath, 'utf8');
      console.log('✅ 下载成功，内容：' + content.trim());
      resolve();
    });
    
    remote.on('error', reject);
  });
}

// 3. 重命名文件
function renameFile() {
  return new Promise((resolve, reject) => {
    console.log('3. 重命名文件...');
    hdfs.rename(hdfsPath, '/test_renamed.txt', (err) => {
      if (err) return reject(err);
      console.log('✅ 重命名成功：/test.txt → /test_renamed.txt');
      resolve();
    });
  });
}

// 4. 删除文件
function deleteFile() {
  return new Promise((resolve, reject) => {
    console.log('4. 删除文件...');
    hdfs.unlink('/test_renamed.txt', (err) => {
      if (err) return reject(err);
      console.log('✅ 删除成功：/test_renamed.txt');
      resolve();
    });
  });
}

// 5. 查看文件详情
function statFile() {
  return new Promise((resolve, reject) => {
    console.log('5. 查看文件详情...');
    hdfs.stat('/', (err, stats) => {
      if (err) return reject(err);
      console.log('✅ 根目录信息：', JSON.stringify(stats, null, 2));
      resolve();
    });
  });
}

// 执行所有测试
async function runAllTests() {
  try {
    // 创建测试文件
    fs.writeFileSync(testFile, 'Hello Hadoop from Node.js!\nTest time: ' + new Date().toISOString());
    console.log('测试文件已创建：' + testFile);
    console.log('---\n');
    
    await uploadFile();
    await new Promise(r => setTimeout(r, 1000));
    
    await downloadFile();
    await new Promise(r => setTimeout(r, 1000));
    
    await renameFile();
    await new Promise(r => setTimeout(r, 1000));
    
    await deleteFile();
    await new Promise(r => setTimeout(r, 1000));
    
    await statFile();
    
    console.log('\n---');
    console.log('🎉 实验四完成：所有HDFS操作测试通过！');
    
    // 清理本地文件
    fs.unlinkSync(testFile);
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    
  } catch (err) {
    console.error('❌ 测试失败：', err.message);
    process.exit(1);
  }
}

runAllTests();
EOF

cat file-processor/test-hdfs/full-test.js
```

### 5. 终端执行：运行完整测试（截图）
```bash
cd "/Users/caolei/Desktop/culcloud platform/file-processor/test-hdfs"
echo "=== 安装依赖 ==="
npm install webhdfs

echo "=== 运行完整测试 ==="
node full-test.js
```

### 6. 终端验证：检查HDFS文件列表（截图）
```bash
echo "=== 验证HDFS操作结果 ==="
curl -s "http://localhost:9870/webhdfs/v1/?op=LISTSTATUS" | python3 -m json.tool

echo "=== 使用Hadoop命令验证 ==="
docker exec k8s-hadoop-1 bash -c "\$HADOOP_HOME/bin/hdfs dfs -ls /"
```

## 测试验证
- WebHDFS API返回JSON格式响应
- Node.js脚本成功执行上传、下载、重命名、删除、查看详情
- HDFS文件系统操作均成功

## 截图要求
1. hdfs-site.xml配置内容
2. HDFS重启过程
3. curl测试WebHDFS API返回JSON
4. full-test.js脚本内容
5. node full-test.js执行输出
6. HDFS文件列表验证

## 上下文更新
完成后更新 `context/context.txt`：
- 标记PRD 4为完成
- 记录WebHDFS测试状态
