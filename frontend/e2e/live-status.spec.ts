import { expect, test } from '@playwright/test';

const endpoint = '**/api/status';

test('fresh verified LIVE shows only a valid confirmed stream link', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live: true,
        videoId: '1yVlKouJnag',
        checkedAt: Date.now(),
        stale: false,
      }),
    }),
  );
  await page.goto('./#/watch');
  await expect(page.getByTestId('published-live-status')).toContainText('LIVE confirmed');
  await expect(page.getByRole('link', { name: /Open confirmed broadcast/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=1yVlKouJnag',
  );
});

test('fresh confirmed offline does not claim live', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ live: false, videoId: '', checkedAt: Date.now(), stale: false }),
    }),
  );
  await page.goto('./#/watch');
  await expect(page.getByTestId('published-live-status')).toContainText('Offline confirmed');
  await expect(page.getByRole('link', { name: /Open confirmed broadcast/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open YouTube live channel/ })).toBeVisible();
});

test('stale or blocked API never invents a live or offline state', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live: true,
        videoId: '1yVlKouJnag',
        checkedAt: Date.now() - 240_000,
        stale: true,
      }),
    }),
  );
  await page.goto('./#/watch');
  await expect(page.getByTestId('published-live-status')).toContainText('Status unavailable');
  await expect(page.getByRole('link', { name: /Open confirmed broadcast/ })).toHaveCount(0);
  await page.route(endpoint, (route) => route.abort());
  await page.reload();
  await expect(page.getByTestId('published-live-status')).toContainText('Status unavailable');
  await expect(page.getByRole('link', { name: /Open YouTube live channel/ })).toBeVisible();
});

test('embedded player is opt-in and limited to a fresh verified broadcast', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live: true,
        videoId: '1yVlKouJnag',
        checkedAt: Date.now(),
        stale: false,
      }),
    }),
  );
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.goto('./#/watch');
  await expect(page.getByTestId('published-live-status')).toContainText('LIVE confirmed');
  const embed = page.getByTitle('B24DUL verified live broadcast');
  await expect(embed).toHaveCount(0);
  await page.getByRole('button', { name: 'Load verified live player' }).click();
  await expect(embed).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/1yVlKouJnag');
});

test('offline and stale states never load an embedded YouTube player', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ live: false, checkedAt: Date.now(), stale: false }),
    }),
  );
  await page.goto('./#/watch');
  await expect(page.getByTestId('published-live-status')).toContainText('Offline confirmed');
  await expect(page.getByRole('button', { name: 'Load verified live player' })).toHaveCount(0);
  await expect(page.getByTitle('B24DUL verified live broadcast')).toHaveCount(0);
});
