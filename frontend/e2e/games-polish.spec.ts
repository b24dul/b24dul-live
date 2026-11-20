import { expect, test, type Page } from '@playwright/test';
import { mouseDrag, touchSwipe } from './gameInput';

// Test-only setups: game states are seeded into this test browser's own storage.
const save2048 = (grid: number[], extra: object = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    kind: '2048',
    game: { grid, score: 1000, best: 400, won: false, over: false, ...extra },
  });
const solution = Array.from(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  Number,
);
const saveSudoku = (overrides: object = {}) => {
  const grid = [...solution];
  grid[2] = 0;
  return JSON.stringify({
    schemaVersion: 1,
    kind: 'sudoku',
    game: {
      level: 'easy',
      puzzle: grid.map((value, index) => (index < 40 ? value : 0)),
      solution,
      grid,
      notes: Array(81).fill(0),
      hinted: [],
      sel: 2,
      notesMode: false,
      history: [],
      hints: 0,
      mistakes: 0,
      elapsed: 125,
      done: false,
      showMistakes: true,
      ...overrides,
    },
  });
};
const KEY_2048 = 'b24dul.preview.2048.v1';
const KEY_SUDOKU = 'b24dul.preview.sudoku.v1';
const twos = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const nearWin = [1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// Left fills the last gap; whatever spawns, no move is left.
const nearOver = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 8, 0, 16, 8, 16];

async function open(page: Page, key: string, value: string) {
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(k, v);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [key, value],
  );
  await page.goto('./#/games');
}
const board2048 = (page: Page) => page.getByRole('grid', { name: '2048 board' });
const cells = async (page: Page) => {
  await expect(board2048(page).getByRole('gridcell')).toHaveCount(16);
  return board2048(page).getByRole('gridcell').allTextContents();
};

test.describe('2048 controls', () => {
  test('click-and-drag with the mouse moves the tiles without selecting text', async ({ page }) => {
    await open(page, KEY_2048, save2048(twos));
    await mouseDrag(page, board2048(page), 150, 10);
    await expect(board2048(page).getByRole('gridcell').nth(3)).toHaveText('4');
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    await expect(page.getByText(/^Score: 1004/)).toBeVisible();
  });

  test('a short drag (a tap) moves nothing', async ({ page }) => {
    await open(page, KEY_2048, save2048(twos));
    const before = await cells(page);
    await mouseDrag(page, board2048(page), 8, 4);
    await page.waitForTimeout(200);
    expect(await cells(page)).toEqual(before);
  });

  test('a touch swipe moves the tiles and does not scroll the page', async ({ page }) => {
    await open(page, KEY_2048, save2048(twos));
    await board2048(page).scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => scrollY);
    await touchSwipe(page, board2048(page), 0, -120);
    // Up is not possible on this board, so nothing moves and the page must not scroll either.
    await expect(board2048(page).getByRole('gridcell').nth(0)).toHaveText('2');
    await touchSwipe(page, board2048(page), 120, 0);
    await expect(board2048(page).getByRole('gridcell').nth(3)).toHaveText('4');
    expect(await page.evaluate(() => scrollY)).toBe(scrolled);
    await expect(page.getByText(/^Score: 1004/)).toBeVisible();
  });

  test('a pen drag moves the tiles', async ({ page }) => {
    await open(page, KEY_2048, save2048(twos));
    const board = board2048(page);
    const init = { pointerId: 3, pointerType: 'pen', isPrimary: true, button: 0 };
    await board.dispatchEvent('pointerdown', { ...init, clientX: 100, clientY: 100 });
    await board.dispatchEvent('pointermove', { ...init, clientX: 220, clientY: 105 });
    await board.dispatchEvent('pointerup', { ...init, clientX: 220, clientY: 105 });
    await expect(board.getByRole('gridcell').nth(3)).toHaveText('4');
  });

  test('arrow keys and WASD both move the tiles', async ({ page }) => {
    // One tile in the middle can always move, whichever key is pressed.
    const middle = save2048([0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    await open(page, KEY_2048, middle);
    const board = board2048(page);
    // Where the tile at cell 5 ends up for each key (a new tile can never land there).
    const ends: Record<string, number> = { ArrowUp: 1, w: 1, ArrowDown: 13, s: 13 };
    Object.assign(ends, { ArrowLeft: 4, a: 4, ArrowRight: 7, d: 7 });
    for (const [key, end] of Object.entries(ends)) {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY_2048, middle]);
      await page.reload();
      await expect(board.getByRole('gridcell').nth(5)).toHaveText('2');
      await board.focus();
      await page.keyboard.press(key);
      await expect(board.getByRole('gridcell').nth(end), `key ${key}`).toHaveText('2');
    }
  });
});

test.describe('result screens', () => {
  test('2048 win: celebration, score, best, New best!, sign-in prompt, Keep going', async ({
    page,
  }) => {
    await open(page, KEY_2048, save2048(nearWin));
    await board2048(page).focus();
    await page.keyboard.press('ArrowLeft');
    const win = page.getByRole('dialog', { name: 'You made 2048!' });
    await expect(win).toBeVisible();
    await expect(win.getByText('Score: 3048')).toBeVisible();
    await expect(win.getByText('Your best: 3048')).toBeVisible();
    await expect(win.getByText('New best!')).toBeVisible();
    await expect(win.getByText(/Sign in with Google/)).toBeVisible();
    await expect(win.locator('.game-confetti')).toBeVisible();
    await expect(win.getByRole('button', { name: 'Play again' })).toBeVisible();
    await win.getByRole('button', { name: 'Keep going' }).click();
    await expect(win).toBeHidden();
  });

  test('2048 game over: final score, best, sign-in prompt and Play again', async ({ page }) => {
    await open(page, KEY_2048, save2048(nearOver, { best: 5000 }));
    await board2048(page).focus();
    await page.keyboard.press('ArrowLeft');
    const over = page.getByRole('dialog', { name: 'Game over' });
    await expect(over).toBeVisible();
    await expect(over.getByText('Score: 1000')).toBeVisible();
    await expect(over.getByText('Your best: 5000')).toBeVisible();
    await expect(over.getByText('New best!')).toBeHidden();
    await expect(over.getByText(/Sign in with Google/)).toBeVisible();
    await over.getByRole('button', { name: 'Play again' }).click();
    await expect(over).toBeHidden();
    await expect(page.getByText(/^Score: 0 · Best: 5000/)).toBeVisible();
  });

  test('Sudoku win: time, mistakes, personal best, New best!, sign-in prompt', async ({ page }) => {
    await open(page, KEY_SUDOKU, saveSudoku({ mistakes: 1 }));
    await page.getByRole('button', { name: 'Enter 4', exact: true }).click();
    const solved = page.getByRole('group', { name: 'Puzzle solved!' });
    await expect(solved).toBeVisible();
    await expect(solved.getByText(/Easy · Time 2:0\d · Mistakes 1 · Hints 0/)).toBeVisible();
    await expect(solved.getByText(/Your best \(easy\): 2:0\d/)).toBeVisible();
    await expect(solved.getByText('New best!')).toBeVisible();
    await expect(solved.getByText(/Sign in with Google/)).toBeVisible();
    await expect(solved.locator('.game-confetti')).toBeVisible();
    await expect(solved.getByRole('button', { name: 'New easy Sudoku' })).toBeVisible();
  });

  test('Sudoku ends on the third mistake, clears the save and offers no score', async ({
    page,
  }) => {
    await open(page, KEY_SUDOKU, saveSudoku());
    await expect(page.getByText(/Mistakes: 0\/3/)).toBeVisible();
    for (const [wrong, count] of [
      [1, 1],
      [2, 2],
    ] as const) {
      await page.getByRole('button', { name: `Enter ${wrong}`, exact: true }).click();
      await expect(page.getByText(new RegExp(`Mistakes: ${count}/3`))).toBeVisible();
      await expect(page.getByRole('group', { name: 'Game over' })).toBeHidden();
    }
    await page.getByRole('button', { name: 'Enter 3', exact: true }).click();
    const over = page.getByRole('group', { name: 'Game over' });
    await expect(over).toBeVisible();
    await expect(over.getByText(/3 mistakes\. You filled 41 of 42 cells/)).toBeVisible();
    await expect(over.getByText(/No hint-free easy solve yet/)).toBeVisible();
    await expect(over.getByText(/leaderboard|Sign in/)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Enter 4', exact: true })).toBeDisabled();
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY_SUDOKU)).toBeNull();
    await page.reload();
    await expect(page.getByRole('grid', { name: 'Sudoku board' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'New easy Sudoku' })).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no celebration or slide animations, but the games still work', async ({ page }) => {
    await open(page, KEY_2048, save2048(nearWin));
    const board = board2048(page);
    await board.focus();
    await page.keyboard.press('ArrowLeft');
    const tile = board.locator('.g2-tile').first();
    expect(await tile.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    expect(await tile.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    const win = page.getByRole('dialog', { name: 'You made 2048!' });
    await expect(win).toBeVisible();
    await expect(win.locator('.game-confetti')).toBeHidden();
    await expect(page.locator('.g2-gain')).toBeHidden();
    await win.getByRole('button', { name: 'Keep going' }).click();
    await board.focus();
    const before = await cells(page);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => cells(page)).not.toEqual(before);
  });
});
