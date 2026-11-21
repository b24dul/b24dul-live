import { describe, expect, it } from 'vitest';
import { move2048, type Game2048 } from './game2048';
import { slideTiles, tilesFromGrid, tilesMatch } from './tiles2048';

const game = (grid: number[]): Game2048 => ({ grid, score: 0, best: 0, won: false, over: false });

describe('tiles2048', () => {
  it('slides tiles, merges pairs and adds the new tile, matching the real move', () => {
    const start = [2, 2, 4, 0, 0, 0, 0, 0, 0, 8, 0, 8, 0, 0, 0, 0];
    const tiles = tilesFromGrid(start);
    const result = move2048(game(start), 'left', () => 0);
    if (!result.moved) throw new Error('expected a move');
    const next = slideTiles(tiles, 'left', result.game.grid, result.spawnedIndex);
    expect(tilesMatch(next, result.game.grid)).toBe(true);
    // The two 2s slide into cell 0 and a new 4 pops there; the old 4 slides to cell 1.
    expect(next.filter((t) => t.at === 0).map((t) => t.state)).toEqual(['gone', 'gone', 'merged']);
    const four = tiles.find((t) => t.at === 2)!;
    expect(next.find((t) => t.id === four.id)).toMatchObject({ at: 1, state: undefined });
    expect(next.filter((t) => t.state === 'new')).toHaveLength(1);
    expect(next.find((t) => t.state === 'merged' && t.at === 8)?.value).toBe(16);
  });

  it('falls back to fresh tiles if they ever disagree with the grid', () => {
    const next = slideTiles(tilesFromGrid([2]), 'left', [4, ...Array(15).fill(0)], 5);
    expect(tilesMatch(next, [4, ...Array(15).fill(0)])).toBe(true);
  });
});
