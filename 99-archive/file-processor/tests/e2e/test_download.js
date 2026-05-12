const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for downloads
  page.on('download', async (download) => {
    console.log('=== DOWNLOAD DETECTED ===');
    console.log('Filename:', download.suggestedFilename());
    console.log('URL:', download.url());
    
    const savePath = path.join('/Users/caolei/Downloads', download.suggestedFilename());
    await download.saveAs(savePath);
    console.log('Saved to:', savePath);
  });

  page.on('console', msg => console.log('CONSOLE:', msg.text()));

  try {
    console.log('Opening frontend...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/1_start.png' });

    // Upload
    await page.locator('input[type="file"]').first().setInputFiles('/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf');
    await page.waitForTimeout(2000);
    
    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 10000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/2_ready.png' });
    
    // Convert
    console.log('Starting conversion...');
    await page.click('text=开始转换');
    
    // Wait for complete
    await page.waitForSelector('text=转换完成', { timeout: 60000 });
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/3_done.png' });
    console.log('Conversion done!');

    // Download
    console.log('Clicking download...');
    await page.click('text=下载');
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/4_after.png' });

    // List downloads
    const fs = require('fs');
    const downloads = fs.readdirSync('/Users/caolei/Downloads/').filter(f => f.includes('converted') || f.includes('.docx'));
    console.log('New files in Downloads:', downloads);

    console.log('\n=== SUCCESS ===');
  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error.png' });
  } finally {
    await browser.close();
  }
})();
