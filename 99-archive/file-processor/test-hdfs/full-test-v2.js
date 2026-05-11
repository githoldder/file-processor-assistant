const WebHDFS = require('webhdfs');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

// 重写HTTP请求以处理重定向
const originalHttpRequest = http.request;
http.request = function(options, callback) {
  if (options.hostname && options.hostname.match(/^[0-9a-f]+$/)) {
    // 如果是容器ID，替换为localhost
    options.hostname = 'localhost';
  }
  return originalHttpRequest.call(this, options, callback);
};

const hdfs = WebHDFS.createClient({
  user: 'root',
  host: 'localhost',
  port: 9870,
  path: '/webhdfs/v1',
  followRedirect: true
});

// 测试文件
const testFile = 'test.txt';
const hdfsPath = '/test.txt';
const downloadPath = 'downloaded.txt';

// 1. 创建测试文件
fs.writeFileSync(testFile, 'Hello Hadoop from Node.js!\nTest time: ' + new Date().toISOString());
console.log('1. 测试文件已创建：' + testFile);

// 2. 上传文件到HDFS（使用curl方式）
function uploadFile() {
  return new Promise((resolve, reject) => {
    console.log('2. 上传文件到HDFS...');
    
    // 先获取重定向地址
    const uploadUrl = `http://localhost:9870/webhdfs/v1${hdfsPath}?op=CREATE&overwrite=true`;
    
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fs.statSync(testFile).size
      }
    };
    
    const req = http.request(uploadUrl, options, (res) => {
      if (res.statusCode === 307 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        console.log('重定向到:', redirectUrl);
        
        // 跟随重定向上传
        const parsedUrl = url.parse(redirectUrl);
        const uploadReq = http.request({
          hostname: 'localhost', // 替换为localhost
          port: parsedUrl.port || 80,
          path: parsedUrl.path,
          method: 'PUT',
          headers: options.headers
        }, (uploadRes) => {
          console.log('✅ 上传成功：' + hdfsPath);
          resolve();
        });
        
        uploadReq.on('error', reject);
        fs.createReadStream(testFile).pipe(uploadReq);
      } else {
        console.log('上传响应:', res.statusCode);
        resolve();
      }
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 3. 从HDFS下载文件
function downloadFile() {
  return new Promise((resolve, reject) => {
    console.log('3. 从HDFS下载文件...');
    
    const downloadUrl = `http://localhost:9870/webhdfs/v1${hdfsPath}?op=OPEN`;
    
    http.get(downloadUrl, (res) => {
      if (res.statusCode === 307 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        const parsedUrl = url.parse(redirectUrl);
        
        http.get({
          hostname: 'localhost',
          port: parsedUrl.port || 80,
          path: parsedUrl.path
        }, (downloadRes) => {
          const writeStream = fs.createWriteStream(downloadPath);
          downloadRes.pipe(writeStream);
          
          writeStream.on('finish', () => {
            const content = fs.readFileSync(downloadPath, 'utf8');
            console.log('✅ 下载成功，内容：' + content.trim());
            resolve();
          });
        }).on('error', reject);
      } else {
        console.log('下载响应:', res.statusCode);
        resolve();
      }
    }).on('error', reject);
  });
}

// 4. 重命名文件
function renameFile() {
  return new Promise((resolve, reject) => {
    console.log('4. 重命名文件...');
    hdfs.rename(hdfsPath, '/test_renamed.txt', (err) => {
      if (err) {
        console.error('❌ 重命名失败:', err.message);
        return reject(err);
      }
      console.log('✅ 重命名成功：/test.txt → /test_renamed.txt');
      resolve();
    });
  });
}

// 5. 删除文件
function deleteFile() {
  return new Promise((resolve, reject) => {
    console.log('5. 删除文件...');
    hdfs.unlink('/test_renamed.txt', (err) => {
      if (err) {
        console.error('❌ 删除失败:', err.message);
        return reject(err);
      }
      console.log('✅ 删除成功：/test_renamed.txt');
      resolve();
    });
  });
}

// 6. 查看文件详情
function statFile() {
  return new Promise((resolve, reject) => {
    console.log('6. 查看根目录信息...');
    hdfs.readdir('/', (err, stats) => {
      if (err) {
        console.error('❌ 查看失败:', err.message);
        return reject(err);
      }
      console.log('✅ 根目录内容：', JSON.stringify(stats, null, 2));
      resolve();
    });
  });
}

// 执行所有测试
async function runAllTests() {
  try {
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
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    
  } catch (err) {
    console.error('\n❌ 测试失败：', err.message);
    process.exit(1);
  }
}

runAllTests();
