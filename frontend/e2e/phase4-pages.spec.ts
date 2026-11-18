import { expect, test } from '@playwright/test';

const pages = [
  ['/', 'B24DUL'],
  ['/watch', 'Watch'],
  ['/videos', 'Videos'],
  ['/games', 'Game Centre'],
  ['/community', 'Community'],
  ['/profile', 'Your account'],
  ['/settings', 'Settings'],
  ['/admin', 'Admin'],
] as const;

test('Phase 4 content renders on every route without broken images or layout overflow', async ({
  page,
}) => {
  for (const size of [
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    for (const [route, heading] of pages) {
      await page.goto('./#' + route);
      await expect(page.locator('#route-content h1')).toHaveText(heading);
      await expect(page.locator('#route-content')).not.toBeEmpty();
      const badAssets = await page
        .locator('img')
        .evaluateAll(
          (images) => images.filter((image) => image.complete && image.naturalWidth === 0).length,
        );
      expect(badAssets, 'broken images on ' + route).toBe(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, 'horizontal overflow on ' + route + ' at ' + size.width).toBe(false);
    }
  }
});

test('homepage: banner hero with honest stream state, then latest videos and games', async ({
  page,
}) => {
  await page.goto('./#/');
  await expect(page.getByRole('img', { name: 'B24DUL Live' })).toBeVisible();
  await expect(
    page.getByText(/LIVE NOW|Offline right now|Checking whether B24DUL is live/).first(),
  ).toBeVisible();
  for (const name of ['Latest videos', 'Games']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Subscribe' }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'More pages' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play Sudoku' })).toHaveAttribute('href', '#/games');
});

test('video archive plays on the site with a safe Open on YouTube link for every video', async ({
  page,
}) => {
  await page.route('https://b24dul.github.io/b24dul-live/videos.json', (route) => route.abort());
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.goto('./#/videos');
  await expect(page.getByText(/read-only archive snapshot/i)).toBeVisible();
  const videos = page.getByRole('button', { name: /^Play video: / });
  const count = await videos.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await videos.nth(i).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('iframe')).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?/,
    );
    const link = dialog.getByRole('link', { name: /^Open on YouTube: / });
    await expect(link).toHaveAttribute(
      'href',
      /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
    );
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('unconnected features are honestly labelled without fake data', async ({ page }) => {
  await page.goto('./#/games');
  await expect(page.getByRole('heading', { name: 'Leaderboards' })).toBeVisible();
  await expect(page.getByText(/under a made-up name/)).toHaveCount(0);
  await page.goto('./#/admin');
  await expect(page.getByRole('heading', { name: 'Admin only' })).toBeVisible();
  await page.goto('./#/profile');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});
