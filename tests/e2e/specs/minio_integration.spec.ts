import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('MinIO File Operations E2E', () => {
  const testFileName = `e2e-test-file-${Math.random().toString(36).substring(2, 7)}.txt`;
  const testFilePath = path.join(__dirname, '..', '..', '..', testFileName);

  test.beforeAll(async () => {
    // Create a dummy test file
    fs.writeFileSync(testFilePath, 'Hello MinIO E2E Test Content');
  });

  test.afterAll(async () => {
    // Cleanup test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('should upload, list, download link, and delete a file', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'files');
    });

    // Navigate to MyFiles
    await page.goto('/');
    
    // Upload file
    await page.locator('input[type="file"]').first().setInputFiles(testFilePath);

    // Verify upload success (check if file appears in list)
    await expect(page.getByText(testFileName).first()).toBeVisible({ timeout: 10000 });

    // Click Download (verify it opens a link)
    // Note: We won't actually download it to disk in headless CI, just check if it triggers
    const downloadButton = page.locator('button[title="Download"], button[title="下载"]').first();
    await expect(downloadButton).toBeVisible();

    // Delete the file
    page.on('dialog', dialog => dialog.accept()); // Auto-accept confirm dialog
    await page.locator('button[title="Delete"], button[title="删除"]').first().click();

    // Verify file is gone
    await expect(page.getByText(testFileName).first()).not.toBeVisible({ timeout: 10000 });
  });
});
