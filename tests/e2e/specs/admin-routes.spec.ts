import { test, expect } from '@playwright/test';

test.describe('E2E Admin Routes verification', () => {
  test('should redirect admin role to analytics cockpit view when attempting to access user or deprecated views', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin' })
    }));

    // Intercept standard APIs that SystemStatus and TaskMonitor call to prevent errors
    await page.route('**/api/v1/files*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', files: [], folders: [], total: 0 })
    }));
    await page.route('**/api/v1/tasks*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 })
    }));
    await page.route('**/api/v1/system/health', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ services: {} })
    }));
    await page.route('**/api/v1/tasks/queue-length', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ queue_length: 0 })
    }));
    await page.route('**/api/v1/logs/timeline*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ events: [], count: 0 })
    }));
    await page.route('**/api/v1/logs/stats*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({})
    }));
    await page.route('http://localhost:5050/api/analytics/*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: {} })
    }));

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'admin');
      localStorage.setItem('culcloud_view', 'dashboard');
    });

    await page.goto('/');

    // Check if redirected to analytics cockpit by verifying Spark Telemetry text is visible
    await expect(page.getByText(/Spark Telemetry/i).first()).toBeVisible({ timeout: 15000 });

    const activeView = await page.evaluate(() => localStorage.getItem('culcloud_view'));
    expect(activeView).toBe('analytics');
  });
});
