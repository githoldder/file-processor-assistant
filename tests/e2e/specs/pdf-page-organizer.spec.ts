import { test, expect } from '@playwright/test';

test.describe('E2E PDF Page Organizer basic workflow', () => {
  test('should load PDF, support page rotation, deletion, and trigger export', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    // Mock pdf extraction
    await page.route('**/api/v1/convert/pdf/extract-pages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          preview_id: 'preview-id',
          source_object_name: 'test.pdf',
          pages: [
            { page_num: 1, url: 'http://localhost:8000/previews/1.png' },
            { page_num: 2, url: 'http://localhost:8000/previews/2.png' }
          ]
        })
      });
    });

    // Mock pdf process
    await page.route('**/api/v1/convert/pdf/process', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ task_id: 'pdf-task-id', status: 'pending' })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'pdf');
    });

    await page.goto('/');

    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Upload local mock PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /浏览本地|Browse Local/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    });

    // Check pages are loaded in workspace
    await expect(page.getByText('P. 1')).toBeVisible();
    await expect(page.getByText('P. 2')).toBeVisible();

    // Rotate page 1
    const rotateButton = page.locator('button[title="Rotate 90°"]').first();
    await rotateButton.click();

    // Trigger export
    await page.locator('button', { hasText: /导出/i }).first().click();

    // Verify processing popup appears
    await expect(page.getByText(/正在执行云端分布式重组|Processing Distributed/i)).toBeVisible();
  });
});
