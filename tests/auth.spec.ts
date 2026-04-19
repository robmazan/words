import { test, expect } from './fixtures.js';

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.unroute('**/.auth/me');
  await page.route('**/.auth/me', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ clientPrincipal: null }),
  }));

  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('.login-btn')).toBeVisible();
});

test('authenticated user lands on home screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('.mode-btn').first().waitFor();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.locator('.mode-btn')).toHaveCount(4);
});
