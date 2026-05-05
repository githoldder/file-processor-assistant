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

// 1. 创建测试文件
fs.writeFileSync(testFile, 'Hello Hadoop from Node.js!\nTest time: ' + new Date().toISOString());
console.log('1. 测试文件已创建：' + testFile);

// 2. 上传文件到HDFS
function uploadFile() {
  return new Promise((resolve, reject) => {
    console.log('2. 上传文件到HDFS...');
    const local = fs.createReadStream(testFile);
    const remote = hdfs.createWriteStream(hdfsPath, { followRedirect: true });
    
    local.pipe(remote);
    
    remote.on('finish', () => {
      console.log('✅ 上传成功：' + hdfsPath);
      resolve();
    });
    
    remote.on('error', (err) => {
      console.error('❌ 上传失败:', err.message);
      reject(err);
    });
  });
}

// 3. 从HDFS下载文件
function downloadFile() {
  return new Promise((resolve, reject) => {
    console.log('3. 从HDFS下载文件...');
    const remote = hdfs.createReadStream(hdfsPath, { followRedirect: true });
    const local = fs.createWriteStream(downloadPath);
    
    remote.pipe(local);
    
    local.on('finish', () => {
      const content = fs.readFileSync(downloadPath, 'utf8');
      console.log('✅ 下载成功，内容：' + content.trim());
      resolve();
    });
    
    remote.on('error', (err) => {
      console.error('❌ 下载失败:', err.message);
      reject(err);
    });
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
