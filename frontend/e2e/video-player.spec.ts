import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.route('**/api/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ live: false, checkedAt: Date.now(), stale: false }),
    }),
  );
});

for (const [where, path] of [
  ['home page', './#/'],
  ['Videos page', './#/videos'],
  ['Watch page offline list', './#/watch'],
] as const) {
  test(`videos on the ${where} play in the site's player`, async ({ page }) => {
    await page.goto(path);
    // Pin the button by its name: the list can refresh while the video plays.
    const name = await page
      .getByRole('button', { name: /^Play video: / })
      .first()
      .getAttribute('aria-label');
    const play = page.getByRole('button', { name: name!, exact: true }).first();
    await play.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\//);
    await expect(dialog.getByRole('button', { name: 'Close video' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(play).toBeFocused();
  });
}

test('on a phone the player fits the screen and closes with a tap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('./#/videos');
  await page
    .getByRole('button', { name: /^Play video: / })
    .first()
    .click();
  const frame = page.getByRole('dialog').locator('iframe');
  const box = (await frame.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: 'Close video' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
