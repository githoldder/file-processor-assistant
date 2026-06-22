import { test, expect } from '@playwright/test';

test.describe('CulCloud Platform E2E', () => {
  test('should load ConvertCenter and interact', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'convert');
    });

    // 1. Visit the home page (ConvertCenter)
    await page.goto('/');
    
    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // 2. Select file via local button
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /本地|Local/i }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test_doc.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('mock document content for e2e testing')
    });
    
    // 3. Verify file is detected
    await expect(page.getByText('test_doc.docx')).toBeVisible();
    
    await page.locator('button', { hasText: /初始化|Initialize/i }).click();
    
    // 5. Verify processing state (or error if backend is down, but UI should reflect state change)
    await expect(page.locator('text=/处理中|Processing|失败/i').first()).toBeVisible({ timeout: 10000 });
  });
});
