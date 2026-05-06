import { expect, test } from '@playwright/test';

test('home page loads with hero and four sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'HEXHIVE' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Romhacks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sprites' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sounds' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scripts' })).toBeVisible();
});
