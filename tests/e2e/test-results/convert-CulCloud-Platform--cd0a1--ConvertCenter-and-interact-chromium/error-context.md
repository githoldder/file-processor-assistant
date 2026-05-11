# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: convert.spec.ts >> CulCloud Platform E2E >> should load ConvertCenter and interact
- Location: specs/convert.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "无法访问此网站" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: 拒绝了我们的连接请求。
    - generic [ref=e10]:
      - paragraph [ref=e11]: 请试试以下办法：
      - list [ref=e12]:
        - listitem [ref=e13]: 检查网络连接
        - listitem [ref=e14]:
          - link "检查代理服务器和防火墙" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "重新加载" [ref=e19] [cursor=pointer]
    - button "详情" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('CulCloud Platform E2E', () => {
  4  |   test('should load ConvertCenter and interact', async ({ page }) => {
  5  |     // 1. Visit the home page (ConvertCenter)
> 6  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |     
  8  |     // Check if title is present (Wait for UI to load)
  9  |     await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  10 |     
  11 |     // 2. Select file via local button
  12 |     const fileChooserPromise = page.waitForEvent('filechooser');
  13 |     // Clicking the label which contains the hidden file input
  14 |     await page.locator('label', { hasText: /本地文件|Local/i }).click();
  15 |     
  16 |     const fileChooser = await fileChooserPromise;
  17 |     await fileChooser.setFiles({
  18 |       name: 'test_doc.docx',
  19 |       mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  20 |       buffer: Buffer.from('mock document content for e2e testing')
  21 |     });
  22 |     
  23 |     // 3. Verify file is detected
  24 |     await expect(page.getByText('test_doc.docx')).toBeVisible();
  25 |     
  26 |     // 4. Click start conversion
  27 |     await page.locator('button', { hasText: /初始化转换链路|Initialize/i }).click();
  28 |     
  29 |     // 5. Verify processing state (or error if backend is down, but UI should reflect state change)
  30 |     await expect(page.locator('text=/处理中|Processing|失败/i').first()).toBeVisible({ timeout: 10000 });
  31 |   });
  32 | });
  33 | 
```