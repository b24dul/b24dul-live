import { expect, test } from '@playwright/test';

const archiveUrl = 'https://b24dul.github.io/b24dul-live/videos.json';

test('shows the published archive when a validated read-only fetch succeeds', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.route(archiveUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([
        { id: 'abcdefghijk', title: 'New archive upload', published: '2026-11-17T12:00:00Z' },
        { id: 'not-valid', title: 'Unsafe entry', published: '2026-11-17T12:00:00Z' },
      ]),
    }),
  );
  await page.goto('./#/videos');
  await expect(page.getByText('Read-only published archive')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New archive upload' })).toBeVisible();
  await expect(page.getByText('Unsafe entry')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play video: New archive upload' }).click();
  await expect(
    page.getByRole('link', { name: 'Open on YouTube: New archive upload' }),
  ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
});

test('keeps the bundled snapshot when the published archive is unavailable', async ({ page }) => {
  await page.route(archiveUrl, (route) => route.abort());
  await page.goto('./#/videos');
  await expect(
    page.getByText('Read-only archive snapshot — latest archive unavailable'),
  ).toBeVisible();
  expect(await page.getByRole('button', { name: /^Play video: / }).count()).toBeGreaterThan(0);
});
