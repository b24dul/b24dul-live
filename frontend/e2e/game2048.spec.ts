import { expect, test } from '@playwright/test';

const legacySave = JSON.stringify({
  grid: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  score: 12,
  best: 20,
  won: false,
  over: false,
});
const SAVE_KEY = 'b24dul.preview.2048.v1';

/** Seeds only once, so a reload shows what the site itself saved. */
const seed = ([key, saved]: [string, string]) => {
  window.localStorage.setItem('b24dul_2048', saved);
  if (!window.localStorage.getItem(key))
    window.localStorage.setItem(
      key,
      JSON.stringify({ schemaVersion: 1, kind: '2048', game: JSON.parse(saved) }),
    );
};

test('restores a saved game, saves every move automatically; an old-site save is never changed', async ({
  page,
}) => {
  await page.addInitScript(seed, [SAVE_KEY, legacySave]);
  await page.goto('./#/games');
  await expect(page.getByText('Welcome back! Your game was restored.')).toBeVisible();
  const board = page.getByRole('grid', { name: '2048 board' });
  await expect(board.getByRole('gridcell')).toHaveCount(16);
  await board.focus();
  await board.press('ArrowRight');
  await expect(board.getByRole('gridcell').nth(3)).toHaveText('4');
  await expect(page.getByText('Score: 16 · Best: 20')).toBeVisible();
  const savedBoard = await board.getByRole('gridcell').allTextContents();
  await page.reload();
  await expect(board.getByRole('gridcell')).toHaveText(savedBoard);
  await expect(page.getByText('Score: 16 · Best: 20')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_2048'))).toBe(legacySave);
});

test('reaching 2048 shows the win screen with Keep going and Play again', async ({ page }) => {
  const nearWin = JSON.stringify({
    grid: [1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,
    best: 0,
    won: false,
    over: false,
  });
  await page.addInitScript(seed, [SAVE_KEY, nearWin]);
  await page.goto('./#/games');
  const board = page.getByRole('grid', { name: '2048 board' });
  await board.focus();
  await board.press('ArrowLeft');
  const win = page.getByRole('dialog', { name: 'You made 2048!' });
  await expect(win).toBeVisible();
  await win.getByRole('button', { name: 'Keep going' }).click();
  await expect(win).toBeHidden();
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByText(/^Score: 0 · Best: \d+/)).toBeVisible();
});

test('starts a playable game and leaves an unreadable old-site save untouched', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('b24dul_2048', 'bad save'));
  await page.goto('./#/games');
  await expect(page.getByText(/practice/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Play 2048' }).click();
  const board = page.getByRole('grid', { name: '2048 board' });
  await expect(board.getByRole('gridcell')).toHaveCount(16);
  await expect(board.getByRole('gridcell', { name: /^(2|4)$/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_2048'))).toBe('bad save');
});

test('moves the board with a swipe', async ({ page }) => {
  await page.addInitScript(seed, [SAVE_KEY, legacySave]);
  await page.goto('./#/games');
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

test('does not overwrite an unrecognized or newer save', async ({ page }) => {
  const future = JSON.stringify({ schemaVersion: 2, kind: '2048', game: { future: true } });
  await page.addInitScript(
    ([key, saved]) => window.localStorage.setItem(key, saved),
    [SAVE_KEY, future],
  );
  await page.goto('./#/games');
  await expect(page.getByText(/saved game this version can’t read/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Play 2048' }).click();
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY)).toBe(future);
});
