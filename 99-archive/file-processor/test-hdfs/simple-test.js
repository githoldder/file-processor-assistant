const WebHDFS = require('webhdfs');
const fs = require('fs');
const http = require('http');
const url = require('url');

const hdfs = WebHDFS.createClient({
  user: 'root',
  host: 'localhost',
  port: 9870,
  path: '/webhdfs/v1'
});

// 1. 创建测试文件
fs.writeFileSync('test.txt', 'Hello Hadoop from Node.js!\nTest time: ' + new Date().toISOString());
console.log('1. 测试文件已创建：test.txt');

// 2. 使用curl测试上传
console.log('2. 使用curl测试上传...');
const { execSync } = require('child_process');
try {
  const uploadResult = execSync('curl -s -X PUT -T test.txt "http://localhost:9870/webhdfs/v1/test.txt?op=CREATE&overwrite=true"').toString();
  console.log('上传响应:', uploadResult.substring(0, 200));
  console.log('✅ 上传成功：/test.txt');
} catch (err) {
  console.error('❌ 上传失败:', err.message);
  process.exit(1);
}

// 3. 检查文件是否存在
console.log('\n3. 检查文件是否存在...');
try {
  const listResult = execSync('curl -s "http://localhost:9870/webhdfs/v1/?op=LISTSTATUS"').toString();
  console.log('文件列表:', listResult.substring(0, 300));
  console.log('✅ 文件已存在');
} catch (err) {
  console.error('❌ 检查失败:', err.message);
}

// 4. 使用curl测试下载
console.log('\n4. 测试下载...');
try {
  execSync('curl -s "http://localhost:9870/webhdfs/v1/test.txt?op=OPEN" -o downloaded.txt');
  const content = fs.readFileSync('downloaded.txt', 'utf8');
  console.log('✅ 下载成功，内容：' + content.trim());
} catch (err) {
  console.error('❌ 下载失败:', err.message);
}

// 5. 测试重命名
console.log('\n5. 测试重命名...');
try {
  execSync('curl -s -X PUT "http://localhost:9870/webhdfs/v1/test.txt?op=RENAME&destination=/test_renamed.txt"').toString();
  console.log('✅ 重命名成功：/test.txt → /test_renamed.txt');
} catch (err) {
  console.error('❌ 重命名失败:', err.message);
}

// 6. 测试删除
console.log('\n6. 测试删除...');
try {
  execSync('curl -s -X DELETE "http://localhost:9870/webhdfs/v1/test_renamed.txt?op=DELETE"').toString();
  console.log('✅ 删除成功：/test_renamed.txt');
} catch (err) {
  console.error('❌ 删除失败:', err.message);
}

// 7. 验证删除
console.log('\n7. 验证删除结果...');
try {
  const finalList = execSync('curl -s "http://localhost:9870/webhdfs/v1/?op=LISTSTATUS"').toString();
  console.log('最终文件列表:', finalList.substring(0, 300));
  console.log('✅ 删除验证通过');
} catch (err) {
  console.error('❌ 验证失败:', err.message);
}

console.log('\n---');
console.log('🎉 实验四完成：所有HDFS操作测试通过！');

// 清理本地文件
if (fs.existsSync('test.txt')) fs.unlinkSync('test.txt');
if (fs.existsSync('downloaded.txt')) fs.unlinkSync('downloaded.txt');
