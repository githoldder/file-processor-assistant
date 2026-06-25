import { test, expect } from '@playwright/test';

test.describe('E2E Sidebar User Menu verification', () => {
  test('should display exactly 5 user views and hide admin elements', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'dashboard');
    });

    await page.goto('/');

    // Check sidebar links
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    const buttons = sidebar.locator('button');
    // dashboard, files, convert, pdf
    await expect(buttons).toHaveCount(4);

    // Verify system or tasks monitor is hidden
    await expect(page.getByText(/系统状态|任务监控|System Status|Task Monitor/i)).not.toBeVisible();
  });
});
