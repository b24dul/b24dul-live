import { expect, test } from '@playwright/test';

test('design system fits narrow and desktop viewports and modal is keyboard accessible', async ({ page }) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'B24DUL' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `Unexpected horizontal overflow at ${width}px`).toBe(false);
  }
  await page.getByRole('button', { name: 'Open preview dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'Preview dialog' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open preview dialog' })).toBeFocused();
});
