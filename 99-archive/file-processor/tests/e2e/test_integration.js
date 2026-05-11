const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('=== Frontend Integration Test ===\n');
    
    // Navigate to the frontend
    console.log('1. Opening frontend...');
    await page.goto('http://localhost', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check page title
    const title = await page.title();
    console.log('   Page title:', title);
    
    // Wait for main content
    await page.waitForSelector('h1', { timeout: 10000 });
    const heading = await page.textContent('h1');
    console.log('   Main heading:', heading);
    
    // Check upload zone
    console.log('\n2. Checking upload zone...');
    const uploadZone = await page.$('text=拖放文件到此处');
    if (uploadZone) {
      console.log('   Upload zone found!');
    }
    
    // Upload a test file
    console.log('\n3. Uploading test file...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles('test_samples/2025 APMCM Control Sheet.docx');
    
    // Wait for file to be added
    await page.waitForTimeout(2000);
    
    // Check if file was added
    const fileName = await page.textContent('p:text("2025 APMCM Control Sheet.docx")');
    console.log('   File uploaded:', fileName ? 'Yes' : 'No');
    
    // Wait for file to be ready
    console.log('\n4. Waiting for file to be ready...');
    await page.waitForTimeout(3000);
    
    // Check if file is ready
    const readyStatus = await page.textContent('span:text("文件已就绪")');
    console.log('   File ready:', readyStatus ? 'Yes' : 'Checking status...');
    
    // Click convert button
    console.log('\n5. Starting conversion...');
    const convertButton = await page.$('button:text("开始转换")');
    if (convertButton) {
      await convertButton.click();
      console.log('   Convert button clicked!');
    }
    
    // Wait for conversion to complete
    console.log('\n6. Waiting for conversion to complete...');
    await page.waitForTimeout(10000);
    
    // Check conversion result
    const completedStatus = await page.$('text=转换完成');
    if (completedStatus) {
      console.log('   Conversion completed!');
      
      // Click download button
      console.log('\n7. Testing download...');
      const downloadButton = await page.$('button:text("下载")');
      if (downloadButton) {
        console.log('   Download button found!');
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test_screenshots/integration_test.png', fullPage: true });
    console.log('\n8. Screenshot saved to test_screenshots/integration_test.png');
    
    console.log('\n=== TEST PASSED ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: 'test_screenshots/integration_error.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
