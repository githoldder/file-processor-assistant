import { test, expect } from '@playwright/test';

test.describe('E2E Convert Simple Options', () => {
  test('should hide technical properties and expose 3 simple Excel fit settings', async ({ page }) => {
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

    await page.goto('/');

    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /本地|Local/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'grades.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('grades spreadsheet')
    });

    // 1. Technical params (DPI, OCR, LZO) should not exist in view
    await expect(page.getByText(/DPI PARAMETERS|DPI 参数|OCR|LZO/i)).not.toBeVisible();

    // 2. Excel fit preset segment buttons should be visible
    await expect(page.getByText(/页面适配模式|Page Fit Mode/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /自动适配|Auto Fit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /宽表格|Wide Sheet/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /打印友好|Print Friendly/i })).toBeVisible();

    // 3. File analysis columns/rows panels must be hidden by default
    await expect(page.getByText(/估计列数|Columns/i)).not.toBeVisible();

    // 4. Click expand advanced options
    await page.locator('button', { hasText: /展开高级布局设置|Expand Advanced/i }).click();

    // 5. File analysis should now be visible
    await expect(page.getByText(/估计列数|Columns/i)).toBeVisible();
  });
});
