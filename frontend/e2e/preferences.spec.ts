import { expect, test } from '@playwright/test';

test('settings controls update live UI and survive refresh and direct hash navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./#/settings');
  const layout = page.locator('.app-layout');
  await expect(layout).toHaveAttribute('data-density', 'comfortable');
  await page.getByRole('radio', { name: /Compact/ }).check();
  await expect(layout).toHaveAttribute('data-density', 'compact');
  await page.getByRole('radio', { name: /Reduce motion/ }).check();
  await expect(layout).toHaveAttribute('data-motion', 'reduce');
  await page.getByRole('radio', { name: /Games first/ }).check();
  await page.reload();
  await expect(layout).toHaveAttribute('data-density', 'compact');
  await expect(layout).toHaveAttribute('data-motion', 'reduce');
  await page.goto('./#/');
  await expect(page.locator('.home-feature-order')).toHaveAttribute('data-layout', 'games-first');
  const ordering = await page.evaluate(() => {
    const first = document.querySelector<HTMLElement>('.home-feature-games');
    const second = document.querySelector<HTMLElement>('.home-feature-discover');
    return first && second
      ? first.getBoundingClientRect().top < second.getBoundingClientRect().top
      : false;
  });
  expect(ordering).toBe(true);
});

test('reset preferences restores defaults and real keyboard options', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: /Compact/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'compact');
  await page.getByRole('button', { name: 'Reset appearance settings' }).click();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'comfortable');
  await expect(
    page.getByRole('status', { name: '' }).filter({ hasText: /Appearance settings restored/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Comfortable/ })).toBeChecked();
});

test('invalid stored preferences safely recover without breaking the app', async ({ page }) => {
  await page.goto('./#/settings');
  await page.evaluate(() => window.localStorage.setItem('b24dul.preferences.v1', 'invalid json'));
  await page.reload();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'comfortable');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('mobile appearance controls remain usable without horizontal scroll', async ({ page }) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('./#/settings');
    await page.getByRole('radio', { name: /Compact/ }).check();
    await expect(page.locator('.app-layout')).toHaveAttribute('data-density', 'compact');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, 'horizontal overflow at ' + width).toBe(false);
  }
});
