import { expect, test } from '@playwright/test';

test('design system fits narrow and desktop viewports and the phone menu is keyboard accessible', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'B24DUL', exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `Unexpected horizontal overflow at ${width}px`).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 850 });
  const menuButton = page.getByRole('button', { name: 'Menu' });
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Site menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Site menu' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
});
