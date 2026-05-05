const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. 访问前端界面...');
    await page.goto('http://localhost:80', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/mvp-1-frontend.png' });
    console.log('✅ 前端截图已保存');

    console.log('2. 访问API文档...');
    await page.goto('http://localhost:8000/docs', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/mvp-2-api-docs.png' });
    console.log('✅ API文档截图已保存');

    console.log('3. 访问MinIO控制台...');
    await page.goto('http://localhost:9001', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/mvp-3-minio-console.png' });
    console.log('✅ MinIO控制台截图已保存');

    console.log('4. 访问YARN WebUI...');
    await page.goto('http://localhost:8088', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/mvp-4-yarn-ui.png' });
    console.log('✅ YARN WebUI截图已保存');

    console.log('5. 访问HDFS WebUI...');
    await page.goto('http://localhost:9870', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/02-process/screenshots/mvp-5-hdfs-ui.png' });
    console.log('✅ HDFS WebUI截图已保存');

    console.log('\n✅ MVP验证截图完成！');
    console.log('截图保存在：docs/02-process/screenshots/');
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
  } finally {
    await browser.close();
  }
})();
