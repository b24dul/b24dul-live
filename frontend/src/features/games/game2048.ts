/** Pure 2048 rules compatible with the legacy local save shape. No storage or network access. */
export const LEGACY_2048_STORAGE_KEY = 'b24dul_2048';
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Game2048 = {
  grid: number[];
  score: number;
  best: number;
  won: boolean;
  over: boolean;
};
export type LegacySave =
  { status: 'missing' } | { status: 'invalid' } | { status: 'ready'; game: Game2048 };

const nonnegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validTile = (value: unknown): value is number => {
  if (!nonnegativeInteger(value)) return false;
  if (value === 0) return true;
  const tile = BigInt(value);
  return value >= 2 && (tile & (tile - 1n)) === 0n;
};

/** Refuse malformed saves without ever overwriting or deleting their original contents. */
export function readLegacy2048(raw: string | null): LegacySave {
  if (raw === null) return { status: 'missing' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { status: 'invalid' };
    const item = parsed as Record<string, unknown>;
    if (
      !Array.isArray(item.grid) ||
      item.grid.length !== 16 ||
      !item.grid.every(validTile) ||
      !nonnegativeInteger(item.score) ||
      !nonnegativeInteger(item.best) ||
      typeof item.won !== 'boolean' ||
      typeof item.over !== 'boolean'
    )
      return { status: 'invalid' };
    return {
      status: 'ready',
      game: {
        grid: [...item.grid],
        score: item.score,
        best: item.best,
        won: item.won,
        over: item.over,
      },
    };
  } catch {
    return { status: 'invalid' };
  }
}

export function canMove(grid: readonly number[]): boolean {
  if (grid.includes(0)) return true;
  return grid.some(
    (tile, i) => (i % 4 < 3 && tile === grid[i + 1]) || (i < 12 && tile === grid[i + 4]),
  );
}

function randomUnit(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError('Invalid random value');
  return value;
}

function addTile(grid: number[], random: () => number): number {
  const empty = grid.flatMap((value, index) => (value === 0 ? [index] : []));
  if (!empty.length) throw new Error('No empty tile available');
  const index = empty[Math.floor(randomUnit(random) * empty.length)]!;
  grid[index] = randomUnit(random) < 0.9 ? 2 : 4;
  return index;
}

/** Start a new game in memory; no existing save or leaderboard is modified. */
export function new2048(random: () => number = Math.random): Game2048 {
  const grid = Array<number>(16).fill(0);
  addTile(grid, random);
  addTile(grid, random);
  return { grid, score: 0, best: 0, won: false, over: false };
}

function indices(direction: Direction, line: number): number[] {
  return [0, 1, 2, 3].map((step) => {
    if (direction === 'left') return line * 4 + step;
    if (direction === 'right') return line * 4 + (3 - step);
    if (direction === 'up') return step * 4 + line;
    return (3 - step) * 4 + line;
  });
}

export type MoveResult =
  | { moved: false; game: Game2048 }
  | { moved: true; game: Game2048; spawnedIndex: number; reached2048: boolean };

/** Moves once, spawns one tile only when the grid changed, and follows legacy win/over order. */
export function move2048(
  game: Game2048,
  direction: Direction,
  random: () => number = Math.random,
): MoveResult {
  if (game.over) return { moved: false, game };
  const grid = [...game.grid];
  let points = 0;
  for (let line = 0; line < 4; line++) {
    const cells = indices(direction, line);
    const values = cells.map((index) => grid[index]!).filter((value) => value !== 0);
    const merged: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const value = values[i]!;
      if (value === values[i + 1]) {
        const combined = value * 2;
        if (!Number.isSafeInteger(combined))
          throw new RangeError('Tile exceeds safe integer range');
        merged.push(combined);
        points += combined;
        i++;
      } else merged.push(value);
    }
    cells.forEach((index, i) => {
      grid[index] = merged[i] ?? 0;
    });
  }
  if (grid.every((value, index) => value === game.grid[index])) return { moved: false, game };
  const score = game.score + points;
  if (!Number.isSafeInteger(score)) throw new RangeError('Score exceeds safe integer range');
  const spawnedIndex = addTile(grid, random);
  const reached2048 = !game.won && grid.includes(2048);
  const won = game.won || reached2048;
  const over = !reached2048 && !canMove(grid);
  return {
    moved: true,
    game: { grid, score, best: Math.max(game.best, score), won, over },
    spawnedIndex,
    reached2048,
  };
}
