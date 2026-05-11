const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('download', async (download) => {
    console.log('DOWNLOAD:', download.suggestedFilename());
    await download.saveAs(path.join('/Users/caolei/Downloads', download.suggestedFilename()));
  });

  try {
    console.log('Opening frontend...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/t1_home.png' });

    // Upload PDF
    console.log('Uploading PDF...');
    await page.locator('input[type="file"]').first().setInputFiles('/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/t2_uploaded.png' });

    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 10000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/t3_ready.png' });

    // Click start conversion
    console.log('Starting conversion...');
    await page.click('text=开始转换');
    
    // Wait for completion
    console.log('Waiting for completion...');
    await page.waitForSelector('text=转换完成', { timeout: 60000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/t4_done.png' });
    console.log('Done! Clicking download...');

    // Click download
    await page.click('text=下载');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/t5_download.png' });

    console.log('=== TEST COMPLETE ===');
  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error.png' });
  } finally {
    await browser.close();
  }
})();
