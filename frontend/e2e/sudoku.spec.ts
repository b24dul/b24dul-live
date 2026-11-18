import { expect, test } from '@playwright/test';

const solution = Array.from(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  Number,
);
const puzzle = Array.from(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  Number,
);
const legacySave = JSON.stringify({
  level: 'easy',
  puzzle,
  solution,
  grid: [...puzzle],
  notes: Array(81).fill(0),
  hinted: [],
  sel: -1,
  notesMode: false,
  history: [],
  hints: 0,
  mistakes: 0,
  elapsed: 180,
  done: false,
  showMistakes: true,
});

test('restores a saved Sudoku and saves as you play; an old-site save is never changed', async ({
  page,
}) => {
  await page.addInitScript((saved) => {
    window.localStorage.setItem('b24dul_sudoku', saved);
    if (!window.localStorage.getItem('b24dul.preview.sudoku.v1'))
      window.localStorage.setItem(
        'b24dul.preview.sudoku.v1',
        JSON.stringify({ schemaVersion: 1, kind: 'sudoku', game: JSON.parse(saved) }),
      );
  }, legacySave);
  await page.goto('./#/games');
  await expect(page.getByText('Welcome back! Your puzzle was restored.')).toBeVisible();
  const board = page.getByRole('grid', { name: 'Sudoku board' });
  await expect(board.getByRole('gridcell')).toHaveCount(81);
  const selected = board.getByRole('gridcell', { name: 'Row 1 column 3, empty' });
  await selected.click();
  await selected.press('ArrowRight');
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 4, empty' })).toBeFocused();
  await board.getByRole('gridcell', { name: 'Row 1 column 4, empty' }).press('ArrowLeft');
  await expect(selected).toBeFocused();
  await page.getByRole('button', { name: 'Enter 1', exact: true }).click();
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 3, 1, incorrect' })).toBeVisible();
  await expect(page.getByText(/Mistakes: 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo Sudoku' }).click();
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 3, empty' })).toBeVisible();
  await page.getByRole('button', { name: 'Notes off' }).click();
  await page.getByRole('button', { name: 'Enter 4', exact: true }).click();
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 3, notes 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Sudoku hint' }).click();
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 3, hint 4' })).toBeVisible();
  await page.reload();
  await expect(board.getByRole('gridcell', { name: 'Row 1 column 3, hint 4' })).toBeVisible();
  await expect(page.getByText(/Mistakes: 1 · Hints: 1/)).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_sudoku'))).toBe(legacySave);
});

test('starts a new Sudoku without overwriting an unreadable legacy save', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('b24dul_sudoku', 'bad save'));
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'New easy Sudoku' }).click();
  await expect(page.getByRole('grid', { name: 'Sudoku board' }).getByRole('gridcell')).toHaveCount(
    81,
  );
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_sudoku'))).toBe('bad save');
});

test('How to play explains the rules', async ({ page }) => {
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByText(/every 3×3 box has each number from 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/every 3×3 box has each number from 1/)).toBeHidden();
});

test('finishing a puzzle shows the solved screen with Play again choices', async ({ page }) => {
  const grid = [...solution];
  grid[2] = 0;
  const almost = JSON.stringify({
    schemaVersion: 1,
    kind: 'sudoku',
    game: { ...JSON.parse(legacySave), puzzle: grid.map((v, i) => (i < 40 ? v : 0)), grid, sel: 2 },
  });
  await page.addInitScript(
    (saved) => window.localStorage.setItem('b24dul.preview.sudoku.v1', saved),
    almost,
  );
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Enter 4', exact: true }).click();
  const solved = page.getByRole('group', { name: 'Puzzle solved!' });
  await expect(solved).toBeVisible();
  await expect(solved.getByText(/Easy · Time 3:0\d · Mistakes 0 · Hints 0/)).toBeVisible();
  await solved.getByRole('button', { name: 'New hard Sudoku' }).click();
  await expect(solved).toBeHidden();
  await expect(page.getByText(/^hard · Mistakes: 0/)).toBeVisible();
});
