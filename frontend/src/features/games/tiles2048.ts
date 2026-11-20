// Follows each 2048 tile through a move so the board can animate slides, merges and new tiles.
// Display only: the game rules stay in game2048.ts and decide the real grid.
import { indices, type Direction } from './game2048';

export type Tile = {
  id: number;
  value: number;
  /** Cell index 0-15. */
  at: number;
  /** new: just spawned; merged: made by a merge; gone: slid into a merge and is hidden. */
  state?: 'new' | 'merged' | 'gone';
};

let nextId = 1;
const make = (value: number, at: number, state?: Tile['state']): Tile => ({
  id: nextId++,
  value,
  at,
  state,
});

export function tilesFromGrid(grid: readonly number[], state?: Tile['state']): Tile[] {
  return grid.flatMap((value, at) => (value ? [make(value, at, state)] : []));
}

/** True when the visible tiles show exactly this grid. */
export function tilesMatch(tiles: readonly Tile[], grid: readonly number[]) {
  const shown = Array<number>(16).fill(0);
  for (const tile of tiles) if (tile.state !== 'gone') shown[tile.at] = tile.value;
  return shown.every((value, i) => value === grid[i]);
}

/**
 * Moves the tiles the same way move2048 moved the numbers. Falls back to a fresh set of tiles
 * if the result ever disagrees with the real grid.
 */
export function slideTiles(
  tiles: readonly Tile[],
  direction: Direction,
  grid: readonly number[],
  spawnedIndex: number,
): Tile[] {
  const byCell = new Map(tiles.filter((t) => t.state !== 'gone').map((t) => [t.at, t]));
  const result: Tile[] = [];
  for (let line = 0; line < 4; line++) {
    const cells = indices(direction, line);
    const lineTiles = cells.flatMap((cell) => byCell.get(cell) ?? []);
    let target = 0;
    for (let i = 0; i < lineTiles.length; i++) {
      const tile = lineTiles[i]!;
      const next = lineTiles[i + 1];
      const at = cells[target++]!;
      if (next && next.value === tile.value) {
        result.push({ ...tile, at, state: 'gone' }, { ...next, at, state: 'gone' });
        result.push(make(tile.value * 2, at, 'merged'));
        i++;
      } else result.push({ ...tile, at, state: undefined });
    }
  }
  result.push(make(grid[spawnedIndex]!, spawnedIndex, 'new'));
  return tilesMatch(result, grid) ? result : tilesFromGrid(grid);
}
