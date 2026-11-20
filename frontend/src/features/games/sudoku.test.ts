import { describe, expect, it } from 'vitest';
import {
  countSudokuSolutions,
  eraseSudoku,
  hintSudoku,
  inputSudoku,
  LEGACY_SUDOKU_STORAGE_KEY,
  MAX_MISTAKES,
  newlyCompleted,
  newSudoku,
  sudokuLost,
  readLegacySudoku,
  undoSudoku,
  type SudokuGame,
} from './sudoku';

const digits = (text: string) => Array.from(text, Number);
const solution = digits(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);
const puzzle = digits(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
);
const saved = (): SudokuGame => ({
  level: 'easy',
  puzzle: [...puzzle],
  solution: [...solution],
  grid: [...puzzle],
  notes: Array<number>(81).fill(0),
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
function seededRandom() {
  let seed = 12345;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe('Sudoku games and legacy save compatibility', () => {
  it('recognizes the legacy save and never changes the source', () => {
    const original = saved();
    original.grid[2] = 1; // Legacy permits an incorrect guess.
    original.notes[3] = 1 << 4;
    const raw = JSON.stringify(original);
    expect(LEGACY_SUDOKU_STORAGE_KEY).toBe('b24dul_sudoku');
    expect(readLegacySudoku(raw)).toEqual({ status: 'ready', game: original });
    expect(readLegacySudoku(null)).toEqual({ status: 'missing' });
    expect(readLegacySudoku('{')).toEqual({ status: 'invalid' });
    expect(readLegacySudoku(JSON.stringify({ ...original, solution: Array(81).fill(1) }))).toEqual({
      status: 'invalid',
    });
    expect(readLegacySudoku(JSON.stringify({ ...original, puzzle: [1] }))).toEqual({
      status: 'invalid',
    });
  });
  it('counts solutions without modifying the puzzle and rejects conflicting grids', () => {
    const original = [...puzzle];
    expect(countSudokuSolutions(puzzle)).toBe(1);
    expect(puzzle).toEqual(original);
    const bad = [...puzzle];
    bad[2] = 5;
    expect(countSudokuSolutions(bad)).toBe(0);
    expect(countSudokuSolutions(Array<number>(81).fill(0))).toBe(2);
  });
  it('generates valid, uniquely solvable puzzles at each level', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const next = newSudoku(level, seededRandom());
      expect(next.level).toBe(level);
      expect(countSudokuSolutions(next.puzzle)).toBe(1);
      expect(next.solution.every((value, i) => !next.puzzle[i] || next.puzzle[i] === value)).toBe(
        true,
      );
      expect(next.puzzle.filter(Boolean).length).toBeGreaterThanOrEqual(
        { easy: 42, medium: 33, hard: 27 }[level],
      );
      expect(next.puzzle.filter(Boolean).length).toBeLessThan(81);
      expect(next.grid).toEqual(next.puzzle);
    }
  });
  it('protects givens and records mistakes without mutating previous state', () => {
    const locked = { ...saved(), sel: 0 };
    expect(inputSudoku(locked, 2)).toBe(locked);
    const initial = { ...saved(), sel: 2 };
    const wrong = inputSudoku(initial, 1);
    expect(wrong.grid[2]).toBe(1);
    expect(wrong.mistakes).toBe(1);
    expect(initial.grid[2]).toBe(0);
    const undone = undoSudoku(wrong);
    expect(undone.grid[2]).toBe(0);
    expect(undone.mistakes).toBe(1);
  });
  it('toggles notes, clears peer notes on entry, and restores them on undo', () => {
    const initial = { ...saved(), sel: 2, notesMode: true };
    const noted = inputSudoku(initial, 4);
    expect(noted.notes[2]).toBe(1 << 4);
    expect(inputSudoku(noted, 4).notes[2]).toBe(0);
    const other = { ...saved(), sel: 2 };
    other.notes[3] = 1 << 4;
    const placed = inputSudoku(other, 4);
    expect(placed.grid[2]).toBe(4);
    expect(placed.notes[3]).toBe(0);
    expect(undoSudoku(placed).notes[3]).toBe(1 << 4);
    expect(eraseSudoku(placed).grid[2]).toBe(0);
  });
  it('reveals a hint, preserves its history and locks the hinted cell', () => {
    const initial = { ...saved(), sel: 2 };
    const hinted = hintSudoku(initial);
    expect(hinted.grid[2]).toBe(4);
    expect(hinted.hints).toBe(1);
    expect(hinted.hinted).toContain(2);
    expect(inputSudoku(hinted, 3)).toBe(hinted);
    const undone = undoSudoku(hinted);
    expect(undone.grid[2]).toBe(0);
    expect(undone.hinted).not.toContain(2);
    expect(undone.hints).toBe(1);
  });
});

describe('three-mistake rule', () => {
  it('ends the puzzle at the third wrong number and then blocks every change', () => {
    let game: SudokuGame = { ...saved(), sel: 2 }; // empty cell, answer 4
    for (const wrong of [1, 2, 3]) {
      expect(sudokuLost(game)).toBe(false);
      game = inputSudoku(game, wrong);
    }
    expect(MAX_MISTAKES).toBe(3);
    expect(game.mistakes).toBe(3);
    expect(sudokuLost(game)).toBe(true);
    expect(inputSudoku(game, 4)).toBe(game);
    expect(eraseSudoku(game)).toBe(game);
    expect(undoSudoku(game)).toBe(game);
    expect(hintSudoku(game, () => 0)).toBe(game);
  });

  it('a solved puzzle is never lost, whatever its mistakes', () => {
    expect(sudokuLost({ ...saved(), done: true, mistakes: 5 })).toBe(false);
  });
});

describe('newlyCompleted', () => {
  it('lists the cells of each row, column and box the move completes', () => {
    const grid = [...solution];
    grid[2] = 0;
    const before: SudokuGame = { ...saved(), grid, sel: 2 };
    const after = inputSudoku(before, 4);
    const cells = newlyCompleted(before, after);
    expect(cells).toHaveLength(27); // row 1, column 3 and the top-left box
    expect(newlyCompleted(after, after)).toEqual([]);
  });
});
