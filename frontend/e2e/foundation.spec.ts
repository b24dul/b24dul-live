import { expect, test } from '@playwright/test';

test('isolated preview renders without replacing production', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'B24DUL', exact: true })).toBeVisible();
  await expect(page.getByText('Isolated development preview')).toBeVisible();
  await expect(page.getByRole('link', { name: /visit current site/i })).toHaveAttribute(
    'href',
    'https://b24dul.github.io/b24dul-live/',
  );
});
