import { expect, test } from '@playwright/test';

test('upload page redirects to /login when unauthenticated', async ({ page }) => {
  const response = await page.goto('/upload/romhack');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);
});
