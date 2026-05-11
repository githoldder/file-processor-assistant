const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

// Create test SVG file
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect width="400" height="300" fill="#4A90D9"/>
  <circle cx="200" cy="150" r="80" fill="white"/>
  <text x="200" y="160" text-anchor="middle" fill="#333" font-size="24">SVG Test</text>
</svg>`;

fs.writeFileSync('/tmp/test.svg', svgContent);

const testCases = [
  { name: 'SVG → PNG', file: '/tmp/test.svg', targetFormat: 'png' },
  { name: 'SVG → PDF', file: '/tmp/test.svg', targetFormat: 'pdf' },
];

async function testConversion(testCase) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  let downloadPath = null;
  let downloadContent = null;

  page.on('download', async (download) => {
    downloadPath = download.suggestedFilename();
    console.log(`  Downloaded: ${downloadPath}`);
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
    
    // Select target format
    const select = page.locator('select');
    await select.selectOption(testCase.targetFormat);
    console.log(`  Selected target: ${testCase.targetFormat}`);
    
    // Click start
    await page.click('text=开始转换');
    console.log('  Conversion started...');
    
    // Wait for completion
    await page.waitForSelector('text=转换完成', { timeout: 90000 });
    console.log('  Conversion complete!');
    
    // Click download
    await page.click('text=下载');
    await page.waitForTimeout(3000);
    
    if (downloadPath) {
      const ext = testCase.targetFormat;
      console.log(`  ✅ ${testCase.name} - SUCCESS! Downloaded: ${downloadPath}`);
      
      // Save screenshot of the result
      await page.screenshot({ path: `/Users/caolei/Desktop/文件处理全能助手/test_screenshots/${testCase.name.replace(/[^a-z]/g, '_')}_result.png` });
      console.log(`  Screenshot saved`);
    } else {
      console.log(`  ❌ ${testCase.name} - NO DOWNLOAD`);
    }
    
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
