const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-download-shub']  // Allow downloads
  });
  const context = await browser.newContext({
    downloadsPath: '/Users/caolei/Downloads'
  });
  const page = await context.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('download', download => {
    console.log('DOWNLOAD STARTED:', download.suggestedFilename(), 'size:', download.suggestedSize());
  });

  try {
    console.log('Opening frontend...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/1_homepage.png' });

    // Upload PDF
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/2_uploaded.png' });

    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 10000 });
    console.log('File ready, starting conversion...');
    
    // Click start
    await page.click('text=开始转换');
    
    // Wait for completion
    await page.waitForSelector('text=转换完成', { timeout: 60000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/3_completed.png' });
    console.log('Conversion complete!');

    // Click download
    console.log('Clicking download...');
    await page.click('text=下载');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/4_downloaded.png' });

    // Check downloads folder
    const fs = require('fs');
    const downloads = fs.readdirSync('/Users/caolei/Downloads/');
    console.log('Downloads folder contents:', downloads.slice(-10));

    console.log('\n=== DONE ===');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error.png' });
  } finally {
    await browser.close();
  }
})();
