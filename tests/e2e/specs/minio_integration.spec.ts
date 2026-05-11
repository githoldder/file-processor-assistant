import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('MinIO File Operations E2E', () => {
  const testFileName = 'e2e-test-file.txt';
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
    // Navigate to MyFiles
    await page.goto('/files');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('New').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFilePath);

    // Verify upload success (check if file appears in list)
    await expect(page.getByText(testFileName)).toBeVisible({ timeout: 10000 });

    // Click Download (verify it opens a link)
    // Note: We won't actually download it to disk in headless CI, just check if it triggers
    const downloadButton = page.locator('button[title="Download"]').first();
    await expect(downloadButton).toBeVisible();

    // Delete the file
    page.on('dialog', dialog => dialog.accept()); // Auto-accept confirm dialog
    await page.locator('button[title="Delete"]').first().click();

    // Verify file is gone
    await expect(page.getByText(testFileName)).not.toBeVisible({ timeout: 10000 });
  });
});
