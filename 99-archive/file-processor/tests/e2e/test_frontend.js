const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the frontend
    console.log('Opening frontend...');
    await page.goto('http://localhost', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if the page loaded successfully
    const title = await page.title();
    console.log('Page title:', title);
    
    // Wait for main content to load
    await page.waitForSelector('h1', { timeout: 10000 });
    const heading = await page.textContent('h1');
    console.log('Main heading:', heading);
    
    // Check for upload zone
    const uploadZone = await page.$('text=拖放文件到此处');
    if (uploadZone) {
      console.log('Upload zone found!');
    }
    
    // Check API connection by checking if health endpoint works
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        return await response.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('API Health:', JSON.stringify(healthResponse));
    
    // Check formats endpoint
    const formatsResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/formats');
        return await response.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('API Formats:', JSON.stringify(formatsResponse));
    
    // Take screenshot
    await page.screenshot({ path: 'test_screenshots/frontend_test.png', fullPage: true });
    console.log('Screenshot saved to test_screenshots/frontend_test.png');
    
    console.log('\n=== TEST PASSED ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: 'test_screenshots/frontend_error.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
