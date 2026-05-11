const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_FILES = {
  'docx': 'test_samples/2025 APMCM Control Sheet.docx',
  'pdf': 'test_samples/2025 APMCM Control Sheet_20251120102742.pdf',
  'xlsx': 'test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx',
  'pptx': 'test_samples/2024年文娱部招新ppt.pptx',
  'png': 'test_samples/证件照_1748960774467_413_579.png',
  'md': 'test_samples/瘦子增肌计划(1).md'
};

const CONVERSIONS = [
  { file: 'docx', to: 'pdf', label: 'Word → PDF', selectValue: 'pdf' },
  { file: 'pdf', to: 'word', label: 'PDF → Word', selectValue: 'word' },
  { file: 'xlsx', to: 'pdf', label: 'Excel → PDF', selectValue: 'pdf' },
  { file: 'pptx', to: 'pdf', label: 'PPTX → PDF', selectValue: 'pdf' },
  { file: 'png', to: 'pdf', label: 'PNG → PDF', selectValue: 'pdf' },
  { file: 'md', to: 'pdf', label: 'Markdown → PDF', selectValue: 'pdf' }
];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    downloadsPath: path.join(__dirname, 'test_results')
  });
  const page = await context.newPage();
  
  const results = [];
  
  try {
    console.log('========================================');
    console.log('浏览器自动化测试 - 文件处理全能助手');
    console.log('========================================\n');
    
    // 确保下载目录存在
    if (!fs.existsSync('test_results')) {
      fs.mkdirSync('test_results');
    }
    
    // 访问前端页面
    console.log('【1】打开前端页面...');
    await page.goto('http://localhost', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log(`   页面标题: ${await page.textContent('h1')}`);
    await page.screenshot({ path: 'test_screenshots/browser_01_home.png', fullPage: true });
    
    // 遍历每种转换类型
    for (let i = 0; i < CONVERSIONS.length; i++) {
      const conv = CONVERSIONS[i];
      console.log(`\n【${i+2}】测试: ${conv.label}`);
      console.log('-----------------------------------');
      
      try {
        // 刷新页面
        await page.goto('http://localhost', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        // 点击上传区域触发文件选择
        const dropZone = await page.$('.border-dashed');
        if (dropZone) {
          console.log('   点击上传区域...');
        }
        
        // 直接通过input[type=file]上传
        const filePath = path.join(__dirname, TEST_FILES[conv.file]);
        console.log(`   上传文件: ${path.basename(filePath)}`);
        
        // 使用setInputFiles直接设置文件
        await page.locator('input[type="file"]').first().setInputFiles(filePath);
        
        // 等待文件处理
        await page.waitForTimeout(3000);
        
        // 截图
        await page.screenshot({ path: `test_screenshots/browser_${String(i+2).padStart(2,'0')}_uploaded.png`, fullPage: true });
        
        // 查找文件项
        const fileItems = await page.locator('.bg-white\\/10').all();
        console.log(`   找到 ${fileItems.length} 个文件项`);
        
        if (fileItems.length === 0) {
          console.log('   ❌ 未找到文件项');
          results.push({ test: conv.label, status: 'FAIL', error: 'No file item found' });
          continue;
        }
        
        // 等待文件状态变为"文件已就绪"或"转换中"
        console.log('   等待文件处理...');
        let fileReady = false;
        for (let w = 0; w < 10; w++) {
          await page.waitForTimeout(1000);
          const pageText = await page.textContent('body');
          if (pageText && (pageText.includes('文件已就绪') || pageText.includes('转换中') || pageText.includes('转换完成'))) {
            fileReady = true;
            console.log('   ✅ 文件已就绪');
            break;
          }
        }
        
        if (!fileReady) {
          console.log('   ⚠️ 文件处理中，继续尝试...');
        }
        
        // 查找并点击"开始转换"按钮 - 尝试多种选择器
        let convertClicked = false;
        const buttonSelectors = [
          'button:has-text("开始转换")',
          'button:has-text("开始")',
          '.bg-gradient-to-r button',
          'button.bg-gradient-to-r'
        ];
        
        for (const selector of buttonSelectors) {
          const btn = await page.$(selector);
          if (btn) {
            const btnText = await btn.textContent();
            console.log(`   找到按钮: ${btnText.trim()}`);
            await btn.click();
            convertClicked = true;
            console.log('   ✅ 点击转换按钮');
            break;
          }
        }
        
        if (!convertClicked) {
          console.log('   ❌ 找不到转换按钮');
          results.push({ test: conv.label, status: 'FAIL', error: 'No convert button' });
          continue;
        }
        
        // 等待转换完成
        console.log('   等待转换完成...');
        let completed = false;
        for (let w = 0; w < 30; w++) {
          await page.waitForTimeout(1000);
          const pageText = await page.textContent('body');
          
          if (pageText && pageText.includes('转换完成')) {
            completed = true;
            console.log('   ✅ 转换完成');
            break;
          } else if (pageText && pageText.includes('失败')) {
            console.log('   ❌ 转换失败');
            break;
          }
        }
        
        // 截图
        await page.screenshot({ path: `test_screenshots/browser_${String(i+2).padStart(2,'0')}_converted.png`, fullPage: true });
        
        if (completed) {
          // 查找下载按钮
          const downloadBtn = await page.$('button:has-text("下载")');
          if (downloadBtn) {
            console.log('   ✅ 找到下载按钮');
            results.push({ test: conv.label, status: 'PASS', note: '转换完成，可下载' });
          } else {
            console.log('   ⚠️ 转换完成但未找到下载按钮');
            results.push({ test: conv.label, status: 'PASS', note: '转换完成' });
          }
        } else {
          console.log('   ❌ 转换未完成');
          results.push({ test: conv.label, status: 'FAIL', error: 'Conversion timeout' });
        }
        
      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}`);
        await page.screenshot({ path: `test_screenshots/browser_${String(i+2).padStart(2,'0')}_error.png`, fullPage: true });
        results.push({ test: conv.label, status: 'FAIL', error: error.message });
      }
    }
    
    // 打印测试结果汇总
    console.log('\n========================================');
    console.log('测试结果汇总');
    console.log('========================================');
    
    let passCount = 0;
    for (const r of results) {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.test}: ${r.status}${r.note ? ' - ' + r.note : ''}`);
      if (r.status === 'PASS') passCount++;
    }
    
    console.log(`\n总计: ${passCount}/${results.length} 通过`);
    
    // 最终截图
    await page.screenshot({ path: 'test_screenshots/browser_final.png', fullPage: true });
    
  } catch (error) {
    console.error('测试失败:', error);
    await page.screenshot({ path: 'test_screenshots/browser_error.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
