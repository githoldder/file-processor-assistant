const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Create test files
console.log('Creating test files...');
execSync('python3 -c "from docx import Document; doc = Document(); doc.add_paragraph(\'Hello World Test\'); doc.save(\'/tmp/test.docx\')"');
execSync('python3 -c "from openpyxl import Workbook; wb = Workbook(); ws = wb.active; ws[\'A1\'] = \'Test\'; wb.save(\'/tmp/test.xlsx\')"');
fs.writeFileSync('/tmp/test.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>');

const testCases = [
  { name: 'Word → PDF', file: '/tmp/test.docx', targetFormat: 'pdf' },
  { name: 'Excel → PDF', file: '/tmp/test.xlsx', targetFormat: 'pdf' },
  { name: 'SVG → PDF', file: '/tmp/test.svg', targetFormat: 'pdf' },
];

async function testConversion(testCase) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  let downloadPath = null;
  
  page.on('download', async (download) => {
    downloadPath = download.suggestedFilename();
    console.log(`  Download: ${downloadPath}`);
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
    
    // Select target format if specified
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
    
    if (downloadPath && downloadPath.endsWith('.pdf')) {
      console.log(`  ✅ ${testCase.name} - SUCCESS!`);
    } else {
      console.log(`  ❌ ${testCase.name} - Wrong file type: ${downloadPath}`);
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
