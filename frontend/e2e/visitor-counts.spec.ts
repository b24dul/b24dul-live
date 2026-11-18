import { expect, test } from '@playwright/test';

test('test and local runs never send visitor counts to GoatCounter', async ({ page }) => {
  const counted: string[] = [];
  await page.route('https://b24dul.goatcounter.com/**', (route) => {
    counted.push(route.request().url());
    return route.abort();
  });
  await page.goto('./#/');
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Play 2048' }).click();
  await page.goto('./#/videos');
  expect(counted).toEqual([]);
});
