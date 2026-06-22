import { test, expect } from '@playwright/test';

test.describe('E2E Convert Rename Memory', () => {
  test('should extract name, persist in cache, and pass displayName to API', async ({ page }) => {
    let requestBody: any = null;

    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    // Intercept convert API call
    await page.route('**/api/v1/convert/existing', async (route) => {
      const postData = route.request().postData();
      requestBody = postData;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ task_id: 'mock-task-id', status: 'pending' })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'convert');
    });

    await page.goto('/');

    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Upload mock file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /本地|Local/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: '12345678-1234-1234-1234-1234567890ab_课程报告.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('mock report content')
    });

    // Check display name input default value (should strip uuid and ext)
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveValue('课程报告');

    // Change display name
    await input.fill('我的毕业报告');

    // Start conversion
    await page.locator('button', { hasText: /初始化|Initialize/i }).click();

    // Verify request payload contains display name
    await expect.poll(() => requestBody).not.toBeNull();
    expect(requestBody).toContain('display_name');
    expect(requestBody).toContain('我的毕业报告');
  });
});
