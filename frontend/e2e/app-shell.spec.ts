import { expect, test } from '@playwright/test';

const destinations: Array<[string, string]> = [
  ['/', 'B24DUL'],
  ['/explore', 'Explore'],
  ['/watch', 'Watch'],
  ['/videos', 'Videos'],
  ['/games', 'Game Centre'],
  ['/community', 'Community'],
  ['/tools', 'Tools'],
  ['/competitions', 'Competitions'],
  ['/profile', 'Guest profile'],
  ['/settings', 'Settings'],
  ['/admin', 'Admin'],
];

test('all eleven HashRouter destinations and unknown-route recovery', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [route, heading] of destinations) {
    await page.goto('./#' + route);
    await expect(page.locator('#route-content h1')).toHaveText(heading);
    await expect(page).toHaveTitle(new RegExp('B24DUL Preview'));
  }
  await page.goto('./#/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('direct hash links survive refresh and keyboard sidebar collapse persists', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./#/games');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();

  const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
  await collapse.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.app-layout')).toHaveAttribute('data-sidebar', 'collapsed');
  await page.reload();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-sidebar', 'collapsed');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-sidebar', 'expanded');

  await page.getByRole('searchbox', { name: 'Find a section' }).fill('Videos');
  await page.getByRole('button', { name: 'Go to section' }).click();
  await expect(page.getByRole('heading', { name: 'Videos' })).toBeVisible();
});

test('mobile bottom navigation stays usable without overflow on required widths', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./#/');
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveCount(5);
    await nav.getByRole('link', { name: 'Games' }).click();
    await expect(page.getByRole('heading', { name: 'Game Centre' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'horizontal overflow at ' + viewport.width).toBe(false);
  }
});

test('desktop navigation and not-connected notifications are keyboard operable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('./#/');
  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(mainNav).toBeVisible();
  await mainNav.getByRole('link', { name: 'Community' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Community' })).toBeVisible();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toHaveCount(0);
});
