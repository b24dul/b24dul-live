/** Pure Sudoku rules and read-only compatibility with legacy browser saves. */
export const LEGACY_SUDOKU_STORAGE_KEY = 'b24dul_sudoku';
export type SudokuLevel = 'easy' | 'medium' | 'hard';
type Snapshot = { grid: number[]; notes: number[]; hinted: number[] };
export type SudokuGame = {
  level: SudokuLevel;
  puzzle: number[];
  solution: number[];
  grid: number[];
  notes: number[];
  hinted: number[];
  sel: number;
  notesMode: boolean;
  history: Snapshot[];
  hints: number;
  mistakes: number;
  elapsed: number;
  done: boolean;
  showMistakes: boolean;
};
export type LegacySudokuSave =
  { status: 'missing' } | { status: 'invalid' } | { status: 'ready'; game: SudokuGame };

const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const row = (index: number) => Math.floor(index / 9);
const col = (index: number) => index % 9;
const box = (index: number) => Math.floor(row(index) / 3) * 3 + Math.floor(col(index) / 3);
const peers = Array.from({ length: 81 }, (_, index) =>
  Array.from({ length: 81 }, (__, i) => i).filter(
    (i) => i !== index && (row(i) === row(index) || col(i) === col(index) || box(i) === box(index)),
  ),
);
const digitArray = (value: unknown, min = 0): value is number[] =>
  Array.isArray(value) && value.length === 81 && value.every((n: unknown) => integer(n, min, 9));

function noConflicts(grid: readonly number[]): boolean {
  return grid.every(
    (value, index) => !value || peers[index]!.every((other) => grid[other] !== value),
  );
}

/** Counts up to two solutions, preserving the caller's grid. Invalid boards return zero. */
export function countSudokuSolutions(input: readonly number[]): number {
  if (!digitArray(input) || !noConflicts(input)) return 0;
  const grid = [...input];
  function search(): number {
    let best = -1;
    let candidates: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const available = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) =>
        peers[i]!.every((other) => grid[other] !== n),
      );
      if (!available.length) return 0;
      if (best < 0 || available.length < candidates.length) {
        best = i;
        candidates = available;
        if (available.length === 1) break;
      }
    }
    if (best < 0) return 1;
    let total = 0;
    for (const value of candidates) {
      grid[best] = value;
      total += search();
      grid[best] = 0;
      if (total >= 2) return 2;
    }
    return total;
  }
  return search();
}

/** Read a compatible legacy save without changing browser storage or existing records. */
export function readLegacySudoku(raw: string | null): LegacySudokuSave {
  if (raw === null) return { status: 'missing' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { status: 'invalid' };
    const item = parsed as Record<string, unknown>;
    if (
      (item.level !== 'easy' && item.level !== 'medium' && item.level !== 'hard') ||
      !digitArray(item.puzzle) ||
      !digitArray(item.solution, 1) ||
      !digitArray(item.grid) ||
      !noConflicts(item.solution) ||
      !item.puzzle.every((value, i) => !value || (item.solution as number[])[i] === value) ||
      !item.puzzle.every((value, i) => !value || (item.grid as number[])[i] === value) ||
      !Array.isArray(item.notes) ||
      item.notes.length !== 81 ||
      !item.notes.every((value: unknown) => integer(value, 0, 1022) && (value & 1) === 0) ||
      !Array.isArray(item.hinted) ||
      !item.hinted.every((value: unknown) => integer(value, 0, 80)) ||
      !integer(item.sel, -1, 80) ||
      typeof item.notesMode !== 'boolean' ||
      !integer(item.hints, 0, Number.MAX_SAFE_INTEGER) ||
      !integer(item.mistakes, 0, Number.MAX_SAFE_INTEGER) ||
      !integer(item.elapsed, 0, Number.MAX_SAFE_INTEGER) ||
      typeof item.done !== 'boolean' ||
      typeof item.showMistakes !== 'boolean'
    )
      return { status: 'invalid' };
    return {
      status: 'ready',
      game: {
        level: item.level,
        puzzle: [...item.puzzle],
        solution: [...item.solution],
        grid: [...item.grid],
        notes: [...item.notes],
        hinted: [...item.hinted],
        sel: item.sel,
        notesMode: item.notesMode,
        history: [],
        hints: item.hints,
        mistakes: item.mistakes,
        elapsed: item.elapsed,
        done: item.done,
        showMistakes: item.showMistakes,
      },
    };
  } catch {
    return { status: 'invalid' };
  }
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const number = random();
    if (!Number.isFinite(number) || number < 0 || number >= 1)
      throw new RangeError('Invalid random value');
    const j = Math.floor(number * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Generate a fresh uniquely solvable puzzle; never writes a legacy save. */
export function newSudoku(level: SudokuLevel, random: () => number = Math.random): SudokuGame {
  const axis = () =>
    shuffled([0, 1, 2], random).flatMap((group) =>
      shuffled([0, 1, 2], random).map((offset) => group * 3 + offset),
    );
  const rows = axis();
  const columns = axis();
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const solution = rows.flatMap((r) =>
    columns.map((c) => digits[(r * 3 + Math.floor(r / 3) + c) % 9]!),
  );
  const puzzle = [...solution];
  const target = { easy: 42, medium: 33, hard: 27 }[level];
  let clues = 81;
  for (const index of shuffled(
    Array.from({ length: 81 }, (_, i) => i),
    random,
  )) {
    if (clues <= target) break;
    const value = puzzle[index]!;
    puzzle[index] = 0;
    if (countSudokuSolutions(puzzle) !== 1) puzzle[index] = value;
    else clues--;
  }
  return {
    level,
    puzzle,
    solution,
    grid: [...puzzle],
    notes: Array<number>(81).fill(0),
    hinted: [],
    sel: -1,
    notesMode: false,
    history: [],
    hints: 0,
    mistakes: 0,
    elapsed: 0,
    done: false,
    showMistakes: true,
  };
}

const snapshot = (game: SudokuGame): Snapshot => ({
  grid: [...game.grid],
  notes: [...game.notes],
  hinted: [...game.hinted],
});
const editable = (game: SudokuGame) =>
  !game.done &&
  game.sel >= 0 &&
  game.sel < 81 &&
  !game.puzzle[game.sel] &&
  !game.hinted.includes(game.sel);
const solved = (grid: readonly number[], solution: readonly number[]) =>
  grid.every((value, i) => value === solution[i]);

/** Apply one digit or note using legacy behavior, without storage, analytics or leaderboard writes. */
export function inputSudoku(game: SudokuGame, digit: number): SudokuGame {
  if (!integer(digit, 1, 9) || !editable(game)) return game;
  const index = game.sel;
  if (game.notesMode && game.grid[index]) return game;
  const grid = [...game.grid];
  const notes = [...game.notes];
  let mistakes = game.mistakes;
  if (game.notesMode) notes[index] = notes[index]! ^ (1 << digit);
  else if (grid[index] === digit) grid[index] = 0;
  else {
    grid[index] = digit;
    notes[index] = 0;
    for (const other of peers[index]!) notes[other] = notes[other]! & ~(1 << digit);
    if (digit !== game.solution[index]) mistakes++;
  }
  return {
    ...game,
    grid,
    notes,
    mistakes,
    history: [...game.history, snapshot(game)],
    done: solved(grid, game.solution),
  };
}

export function eraseSudoku(game: SudokuGame): SudokuGame {
  if (!editable(game)) return game;
  const grid = [...game.grid];
  const notes = [...game.notes];
  grid[game.sel] = 0;
  notes[game.sel] = 0;
  return { ...game, grid, notes, history: [...game.history, snapshot(game)] };
}

export function undoSudoku(game: SudokuGame): SudokuGame {
  if (game.done || !game.history.length) return game;
  const last = game.history[game.history.length - 1]!;
  return {
    ...game,
    grid: [...last.grid],
    notes: [...last.notes],
    hinted: [...last.hinted],
    history: game.history.slice(0, -1),
  };
}

export function hintSudoku(game: SudokuGame, random: () => number = Math.random): SudokuGame {
  if (game.done) return game;
  let index = game.sel;
  if (index < 0 || game.puzzle[index] || game.grid[index] === game.solution[index]) {
    const open = game.grid.flatMap((value, i) => (value !== game.solution[i] ? [i] : []));
    if (!open.length) return game;
    const number = random();
    if (!Number.isFinite(number) || number < 0 || number >= 1)
      throw new RangeError('Invalid random value');
    index = open[Math.floor(number * open.length)]!;
  }
  const grid = [...game.grid];
  const notes = [...game.notes];
  grid[index] = game.solution[index]!;
  notes[index] = 0;
  for (const other of peers[index]!) notes[other] = notes[other]! & ~(1 << grid[index]!);
  return {
    ...game,
    grid,
    notes,
    hinted: [...game.hinted, index],
    sel: index,
    hints: game.hints + 1,
    history: [...game.history, snapshot(game)],
    done: solved(grid, game.solution),
  };
}
