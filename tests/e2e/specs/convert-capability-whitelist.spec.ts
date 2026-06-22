import { test, expect } from '@playwright/test';

test.describe('E2E Convert Capability Whitelist', () => {
  test('should display only whitelisted high-fidelity target formats', async ({ page }) => {
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));
    await page.route('**/api/v1/auth/role', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user' })
    }));

    // Mock getConversionCapabilities to return both P0 and non-P0 targets
    await page.route('**/api/v1/convert/capabilities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          capabilities: [
            { key: 'word_to_pdf', name: 'Word to PDF', from_ext: '.docx', to_ext: 'pdf', quality: 'high', stability: 'stable' },
            { key: 'word_to_markdown', name: 'Word to MD', from_ext: '.docx', to_ext: 'md', quality: 'medium', stability: 'beta' }
          ],
          groups: [
            { group: 'docs', name: 'Documents', items: [
              { key: 'word_to_pdf', name: 'Word to PDF', from_ext: '.docx', to_ext: 'pdf' },
              { key: 'word_to_markdown', name: 'Word to MD', from_ext: '.docx', to_ext: 'md' }
            ]}
          ]
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'user');
      localStorage.setItem('culcloud_view', 'convert');
    });

    await page.goto('/');

    // Check if title is present (Wait for UI to load)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Upload a docx file mock
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label', { hasText: /本地/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'proposal.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('Proposal content')
    });

    // Check whitelisted target is visible
    await expect(page.getByRole('button', { name: /Word to PDF/i })).toBeVisible();

    // Check non-whitelisted is hidden
    await expect(page.getByRole('button', { name: /Word to MD/i })).not.toBeVisible();
  });
});
