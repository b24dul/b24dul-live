import { expect, test } from '@playwright/test';

test('on phones the video rows swipe sideways and start at the first card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  const row = page.locator('.video-row').first();
  await expect(row.locator('.video-card').first()).toBeVisible();
  const state = await row.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    scrollable: element.scrollWidth > element.clientWidth,
  }));
  expect(state).toEqual({ scrollLeft: 0, scrollable: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

// Lighthouse CLS: the "Live now" hero is shorter than the "Latest video" one, so the hero reserves
// the taller height and the rows below must not move when a slow live check answers "live".
for (const width of [360, 390, 430, 1280])
  test(`the rows below the hero do not move when the live check answers late (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
    await page.route('**/b24dul.github.io/b24dul-live/videos.json', (route) => route.abort());
    let answer = () => {};
    const answered = new Promise<void>((resolve) => (answer = resolve));
    await page.route('**/api/status', async (route) => {
      await answered;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          live: true,
          videoId: '1yVlKouJnag',
          checkedAt: Date.now(),
          stale: false,
        }),
      });
    });
    await page.goto('./#/');
    await expect(page.getByText('Checking whether B24DUL is live')).toBeVisible();
    // Load every web font first, so a late font swap is not mistaken for the live switch.
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((font) => font.load().catch(() => undefined)));
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const rowTop = () =>
      page
        .locator('.home-feature-order')
        .evaluate((element) => element.getBoundingClientRect().top);
    const before = await rowTop();
    answer();
    await expect(page.locator('.live-pill')).toBeVisible();
    expect(Math.abs((await rowTop()) - before)).toBeLessThan(1);
  });
