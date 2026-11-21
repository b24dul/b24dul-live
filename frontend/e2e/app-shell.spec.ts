import { expect, test } from '@playwright/test';

const destinations: Array<[string, string]> = [
  ['/', 'B24DUL'],
  ['/watch', 'Watch'],
  ['/videos', 'Videos'],
  ['/games', 'Game Centre'],
  ['/community', 'Community'],
  ['/profile', 'Your account'],
  ['/settings', 'Settings'],
  ['/admin', 'Admin'],
];

test('all eight HashRouter destinations; removed and unknown pages recover', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [route, heading] of destinations) {
    await page.goto('./#' + route);
    await expect(page.locator('#route-content h1')).toHaveText(heading);
    await expect(page).toHaveTitle(new RegExp('B24DUL Live'));
  }
  for (const removed of ['/explore', '/tools', '/competitions', '/does-not-exist']) {
    await page.goto('./#' + removed);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  }
  await page.goto('./#/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('direct hash links survive refresh; the footer has Settings and Privacy, no Admin link for visitors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./#/games');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();
  const footer = page.getByRole('navigation', { name: 'More pages' });
  await expect(footer.getByRole('link')).toHaveText(['Settings', 'Privacy notice']);
  await expect(footer.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await footer.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});

test('phone menu stays usable without overflow on required widths', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./#/');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.getByRole('navigation', { name: 'Site menu' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link')).toHaveCount(7);
    await menu.getByRole('link', { name: 'Games' }).click();
    await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();
    await expect(menu).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'horizontal overflow at ' + viewport.width).toBe(false);
  }
});

test('desktop top bar is keyboard operable and shows the five main links', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('./#/');
  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(mainNav).toBeVisible();
  await expect(mainNav.getByRole('link')).toHaveText([
    'Home',
    'Watch',
    'Videos',
    'Games',
    'Community',
  ]);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  await mainNav.getByRole('link', { name: 'Community' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Community', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Your account' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
});
