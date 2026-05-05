const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const testFiles = {
  'svg': '/tmp/test.svg',
  'pdf': '/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf',
  'png': '/tmp/test.png',
  'docx': '/tmp/test.docx',
  'xlsx': '/tmp/test.xlsx',
};

// Create test files
fs.writeFileSync('/tmp/test.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>');

const { createCanvas } = require('canvas') || {};
const { execSync } = require('child_process');

// Create simple PNG
const { exec } = require('child_process');
exec('python3 -c "from PIL import Image; img = Image.new(\'RGB\', (100, 100), color=\'red\'); img.save(\'/tmp/test.png\')"', () => {});

// Create Word file (using a simple approach)
exec('python3 -c "
from docx import Document
doc = Document()
doc.add_paragraph(\'Hello World Test\')
doc.save(\'/tmp/test.docx\')
" 2>/dev/null || echo "docx creation failed"', () => {});

// Create Excel file
exec('python3 -c "
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws[\'A1\'] = \'Test\'
wb.save(\'/tmp/test.xlsx\')
" 2>/dev/null || echo "xlsx creation failed"', () => {});

const conversions = [
  { name: 'SVG → PDF', file: 'svg', target: 'pdf' },
  { name: 'Word → PDF', file: 'docx', target: 'pdf' },
  { name: 'Excel → PDF', file: 'xlsx', target: 'pdf' },
];

async function testConversion(name, filePath, targetFormat) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let downloadSuccess = false;
  let errorMsg = '';
  
  page.on('console', msg => console.log(`  CONSOLE: ${msg.text()}`));
  page.on('download', async (download) => {
    console.log(`  DOWNLOAD: ${download.suggestedFilename()}`);
    await download.saveAs(path.join('/Users/caolei/Downloads', download.suggestedFilename()));
    downloadSuccess = true;
  });

  try {
    console.log(`\n=== Testing: ${name} ===`);
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Upload file
    await page.locator('input[type="file"]').first().setInputFiles(filePath);
    await page.waitForTimeout(2000);
    
    // Wait for ready
    await page.waitForSelector('text=文件已就绪', { timeout: 15000 });
    console.log('  File ready');
    
    // Click start
    await page.click('text=开始转换');
    console.log('  Conversion started...');
    
    // Wait for completion
    await page.waitForSelector('text=转换完成', { timeout: 90000 });
    console.log('  Conversion complete!');
    
    // Click download
    await page.click('text=下载');
    await page.waitForTimeout(3000);
    
    if (downloadSuccess) {
      console.log(`  ✅ ${name} - SUCCESS!`);
    } else {
      console.log(`  ❌ ${name} - NO DOWNLOAD DETECTED`);
    }
    
  } catch (error) {
    console.log(`  ❌ ${name} - ERROR: ${error.message}`);
    await page.screenshot({ path: `/Users/caolei/Desktop/文件处理全能助手/test_screenshots/error_${name.replace(/[^a-z]/g, '_')}.png` });
  } finally {
    await browser.close();
  }
}

(async () => {
  // Wait for test files
  await new Promise(r => setTimeout(r, 2000));
  
  // Test SVG → PDF
  await testConversion('SVG → PDF', '/tmp/test.svg', 'pdf');
  
  // Test Word → PDF  
  await testConversion('Word → PDF', '/tmp/test.docx', 'pdf');
  
  // Test Excel → PDF
  await testConversion('Excel → PDF', '/tmp/test.xlsx', 'pdf');
  
  console.log('\n=== ALL TESTS COMPLETE ===');
})();
