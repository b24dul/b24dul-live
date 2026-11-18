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
