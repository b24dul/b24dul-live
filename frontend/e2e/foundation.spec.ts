import { expect, test } from '@playwright/test';

test('the site renders its own home page and never links to the old site', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'B24DUL', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'B24DUL Live' })).toBeVisible();
  await expect(page.locator('a[href*="legacy"]')).toHaveCount(0);
});
