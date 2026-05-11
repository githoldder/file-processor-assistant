const WebHDFS = require('webhdfs');
const fs = require('fs');

const hdfs = WebHDFS.createClient({
  user: 'root',
  host: 'localhost',
  port: 9870,
  path: '/webhdfs/v1'
});

// 上传文件
const local = fs.createReadStream('test.txt');
const remote = hdfs.createWriteStream('/test.txt');

local.pipe(remote);

remote.on('finish', () => {
  console.log('✅ 上传成功：test.txt 已上传到 HDFS /test.txt');
  
  // 验证上传
  hdfs.readdir('/', (err, list) => {
    if (err) { console.error('读取失败:', err); return; }
    console.log('📂 HDFS根目录内容:', list);
  });
});
