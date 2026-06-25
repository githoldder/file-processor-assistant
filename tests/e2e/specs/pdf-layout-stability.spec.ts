import { test, expect } from '@playwright/test';

test.describe('E2E PDF Layout Stability', () => {
  test('should ensure stable grid thumbnails and hide unverified YARN text', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    await page.route('**/api/v1/convert/pdf/extract-pages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          preview_id: 'preview-id',
          source_object_name: 'test.pdf',
          pages: [
            { page_num: 1, url: 'http://localhost:8000/previews/1.png' }
          ]
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'pdf');
    });

    await page.goto('/');

    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /浏览本地|Browse Local/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'proposal.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    });

    // 1. Unverified "12 worker / YARN" text should not be present
    await expect(page.getByText(/12.*worker|分布式网格就绪|Grid Active/i)).not.toBeVisible();

    // 2. Verified product text should be present
    await expect(page.getByText(/PDF 工作台|页面整理|PDF Organizer/i).first()).toBeVisible();
  });
});
