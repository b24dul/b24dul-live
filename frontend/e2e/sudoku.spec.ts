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

test('plays a copy of a legacy Sudoku save without changing the original', async ({ page }) => {
  await page.addInitScript(
    (saved) => window.localStorage.setItem('b24dul_sudoku', saved),
    legacySave,
  );
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Load Sudoku save copy' }).click();
  await expect(
    page.getByText('Loaded a copy of your saved Sudoku game for practice.'),
  ).toBeVisible();
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
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_sudoku'))).toBe(legacySave);
});

test('starts a new Sudoku without overwriting an unreadable legacy save', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('b24dul_sudoku', 'bad save'));
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Load Sudoku save copy' }).click();
  await expect(
    page.getByText('This Sudoku save could not be read. It has been left unchanged.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'New easy Sudoku' }).click();
  await expect(page.getByRole('grid', { name: 'Sudoku board' }).getByRole('gridcell')).toHaveCount(
    81,
  );
  expect(await page.evaluate(() => window.localStorage.getItem('b24dul_sudoku'))).toBe('bad save');
});
