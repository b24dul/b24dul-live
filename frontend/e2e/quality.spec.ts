import { expect, test } from '@playwright/test';

const paths = [
  '/',
  '/explore',
  '/watch',
  '/videos',
  '/games',
  '/community',
  '/tools',
  '/competitions',
  '/profile',
  '/privacy',
  '/settings',
  '/admin',
];

test('all route shells avoid uncaught JS errors, broken internal routes and images', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of paths) {
    await page.goto('./#' + path);
    await expect(page.locator('#route-content h1')).toBeVisible();
    expect(
      await page
        .locator('img')
        .evaluateAll(
          (images) => images.filter((img) => img.complete && img.naturalWidth === 0).length,
        ),
    ).toBe(0);
    const broken = await page
      .locator('a[href^="#/"]')
      .evaluateAll(
        (links) =>
          links.filter((item) => !(item as HTMLAnchorElement).hash.startsWith('#/')).length,
      );
    expect(broken).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('skip to content leaves HashRouter destination unchanged and focuses main content', async ({
  page,
}) => {
  await page.goto('./#/games');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#route-content')).toBeFocused();
  await expect(page).toHaveURL(/#\/games$/);
});

test('page shell and settings support keyboard and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/settings');
  await expect(page.locator('.app-layout')).toHaveAttribute('data-motion', 'reduce');
  const accent = page.getByRole('radio', { name: /Cyan/ });
  await accent.focus();
  await page.keyboard.press('Space');
  await expect(accent).toBeChecked();
  await expect(page.locator('.app-layout')).toHaveAttribute('data-accent', 'cyan');
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Notifications' })).toBeFocused();
});

test('read-only disconnected states work with external network blocked', async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.routeWebSocket(/.*/, (socket) => socket.close());
  await page.goto('./#/watch');
  await expect(page.getByText('Verified playback available when live')).toBeVisible();
  await expect(page.getByTestId('published-live-status')).toContainText('Status unavailable');
  await page.goto('./#/community');
  await expect(page.getByRole('heading', { name: 'Live chat' })).toBeVisible();
  await expect(page.getByText('Loading chat…')).toBeVisible();
  await page.goto('./#/videos');
  await expect(page.getByText(/Read-only archive snapshot/)).toBeVisible();
  await page.goto('./#/admin');
  await expect(page.getByText('No privileged actions are available here')).toBeVisible();
});

test('route controls avoid page-wide horizontal clipping in mobile landscape and zoom', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 812, height: 375 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const target of ['/', '/settings', '/videos', '/games']) {
      await page.goto('./#' + target);
      const x = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(x, `horizontal overflow ${target} at ${viewport.width}`).toBeLessThanOrEqual(1);
    }
  }
});
