import { expect, test } from '@playwright/test';

const legacySave = JSON.stringify({
  grid: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  score: 12,
  best: 20,
  won: false,
  over: false,
});

test('loads and plays a copy of a legacy save without modifying it', async ({ page }) => {
  await page.addInitScript(
    (saved) => window.localStorage.setItem('b24dul_2048', saved),
    legacySave,
  );
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Load 2048 save copy' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loaded a copy' })).toBeVisible();
  const board = page.getByRole('grid', { name: '2048 board' });
  await expect(board.getByRole('gridcell')).toHaveCount(16);
  await board.focus();
  await board.press('ArrowRight');
  await expect(board.getByRole('gridcell').nth(3)).toHaveText('4');
  await expect(page.getByText('Score: 16 · Best: 20')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_2048'))).toBe(legacySave);
});

test('starts a playable practice game and leaves an unreadable save untouched', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('b24dul_2048', 'bad save'));
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Load 2048 save copy' }).click();
  await expect(
    page.getByText('This saved game could not be read. It has been left unchanged.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start 2048 practice' }).click();
  const board = page.getByRole('grid', { name: '2048 board' });
  await expect(board.getByRole('gridcell')).toHaveCount(16);
  await expect(board.getByRole('gridcell', { name: /^(2|4)$/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_2048'))).toBe('bad save');
});

test('moves a loaded practice board with a swipe', async ({ page }) => {
  await page.addInitScript(
    (saved) => window.localStorage.setItem('b24dul_2048', saved),
    legacySave,
  );
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Load 2048 save copy' }).click();
  const board = page.getByRole('grid', { name: '2048 board' });
  await board.evaluate((element) => {
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientX: 20, clientY: 40 }] });
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 100, clientY: 40 }] });
    element.dispatchEvent(start);
    element.dispatchEvent(end);
  });
  await expect(board.getByRole('gridcell').nth(3)).toHaveText('4');
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_2048'))).toBe(legacySave);
});
