import { test, expect } from '@playwright/test';

test.describe('E2E Role Routing redial guard', () => {
  test('should fallback to dashboard when user attempts to access admin views', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    // 1. Initialize role as user and view as tasks
    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'admin');
      localStorage.setItem('culcloud_view', 'tasks');
    });

    await page.goto('/');

    // 2. Expect view state fallback to dashboard
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/数据概览|Data Overview/i);

    const activeView = await page.evaluate(() => localStorage.getItem('culcloud_view'));
    expect(activeView).toBe('dashboard');
  });
});
