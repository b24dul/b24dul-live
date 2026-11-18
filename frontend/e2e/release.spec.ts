import { expect, test } from '@playwright/test';

const routes: Array<[string, string]> = [
  ['/', 'B24DUL'],
  ['/watch', 'Watch'],
  ['/videos', 'Videos'],
  ['/games', 'Game Centre'],
  ['/community', 'Community'],
  ['/profile', 'Your account'],
  ['/privacy', 'Privacy notice'],
  ['/settings', 'Settings'],
  ['/admin', 'Admin'],
];

test('static Vite production release candidate loads assets and every hash route', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const initialResponse = await page.goto('./#/');
  expect(initialResponse?.status()).toBe(200);
  for (const [path, title] of routes) {
    await page.goto('./#' + path);
    await expect(page.locator('#route-content h1')).toHaveText(title);
    expect(
      await page
        .locator('img')
        .evaluateAll(
          (images) => images.filter((img) => img.complete && img.naturalWidth === 0).length,
        ),
    ).toBe(0);
  }
  await page.goto('./#/games');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('production build preserves the phone menu and local settings', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: /Compact/ }).check();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'compact');
  await page.reload();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'compact');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('navigation', { name: 'Site menu' })
    .getByRole('link', { name: 'Games' })
    .click();
  await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test('production assets load with the repository subpath and without external APIs', async ({
  page,
}) => {
  const missing: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4176/') && response.status() >= 400) {
      missing.push(response.url() + ': ' + response.status());
    }
  });
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./#/');
  await expect(page.getByRole('heading', { name: 'B24DUL', exact: true })).toBeVisible();
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon).toBe('/b24dul-live/favicon.svg');
  await expect(page.locator('main#route-content')).toBeVisible();
  expect(missing).toEqual([]);
});

test('unknown routes recover on the built static site', async ({ page }) => {
  await page.goto('./#/unknown-release-url');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('the old /legacy/ address sends visitors to the new home page', async ({ page }) => {
  await page.goto('./legacy/');
  await expect(page).toHaveURL(/\/b24dul-live\/(#\/)?$/);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.locator('#gateForm')).toHaveCount(0);
});
