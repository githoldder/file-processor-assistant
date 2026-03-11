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
    // Test with PNG file
    console.log('=== Testing PNG → PDF ===');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Upload PNG
    await page.locator('input[type="file"]').first().setInputFiles('/tmp/test.png');
    await page.waitForTimeout(2000);
    
    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 10000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/png_ready.png' });
    
    // Check what options are available
    const options = await page.locator('select option').allTextContents();
    console.log('Available options:', options);

    // Click start conversion
    console.log('Starting conversion...');
    await page.click('text=开始转换');
    
    // Wait for completion
    await page.waitForSelector('text=转换完成', { timeout: 60000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/png_done.png' });

    // Click download
    console.log('Clicking download...');
    await page.click('text=下载');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/png_download.png' });

    console.log('=== TEST COMPLETE ===');
  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error.png' });
  } finally {
    await browser.close();
  }
})();
