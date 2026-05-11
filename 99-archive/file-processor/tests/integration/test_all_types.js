const { chromium } = require('playwright');
const fs = require('fs');

// Test files that should already exist
const testCases = [
  { name: 'Excel → PDF', file: '/tmp/test_excel.xlsx', targetFormat: 'pdf', expectedPdfSize: 10000 },
  { name: 'SVG → PNG', file: '/tmp/test_svg.svg', targetFormat: 'png' },
  { name: 'SVG → PDF', file: '/tmp/test_svg.svg', targetFormat: 'pdf' },
  { name: 'PDF → Word', file: '/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf', targetFormat: 'word' },
];

async function testConversion(testCase) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  let downloadPath = null;
  let downloadSize = 0;

  page.on('download', async (download) => {
    downloadPath = download.suggestedFilename();
    const path = await download.path();
    const stats = fs.statSync(path);
    downloadSize = stats.size;
    console.log(`  Downloaded: ${downloadPath} (${downloadSize} bytes)`);
  });

  try {
    console.log(`\n=== Testing: ${testCase.name} ===`);
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Upload file
    await page.locator('input[type="file"]').first().setInputFiles(testCase.file);
    await page.waitForTimeout(2000);
    
    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 15000 });
    console.log('  File ready');
    
    // Select target format if needed
    if (testCase.targetFormat) {
      const select = page.locator('select');
      await select.selectOption(testCase.targetFormat);
      console.log(`  Selected target: ${testCase.targetFormat}`);
    }
    
    // Click start
    await page.click('text=开始转换');
    console.log('  Conversion started...');
    
    // Wait for completion
    await page.waitForSelector('text=转换完成', { timeout: 90000 });
    console.log('  Conversion complete!');
    
    // Click download
    await page.click('text=下载');
    await page.waitForTimeout(3000);
    
    // Verify result
    if (downloadPath) {
      const ext = testCase.targetFormat;
      const actualExt = downloadPath.split('.').pop();
      
      if (actualExt === ext || (ext === 'word' && actualExt === 'docx')) {
        if (testCase.expectedPdfSize && downloadSize < testCase.expectedPdfSize) {
          console.log(`  ⚠️ ${testCase.name} - WARNING: PDF size too small (${downloadSize} < ${testCase.expectedPdfSize})`);
        } else {
          console.log(`  ✅ ${testCase.name} - SUCCESS!`);
        }
      } else {
        console.log(`  ❌ ${testCase.name} - Wrong extension: ${actualExt}`);
      }
    } else {
      console.log(`  ❌ ${testCase.name} - NO DOWNLOAD`);
    }
    
    // Take screenshot
    await page.screenshot({ path: `/Users/caolei/Desktop/文件处理全能助手/test_screenshots/result_${testCase.name.replace(/[^a-z]/g, '_')}.png` });
    
  } catch (error) {
    console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
    await page.screenshot({ path: `/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error_${testCase.name.replace(/[^a-z]/g, '_')}.png` });
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const testCase of testCases) {
    await testConversion(testCase);
  }
  console.log('\n=== ALL TESTS COMPLETE ===');
})();
