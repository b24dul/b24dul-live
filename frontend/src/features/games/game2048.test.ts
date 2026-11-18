import { describe, expect, it, vi } from 'vitest';
import {
  canMove,
  LEGACY_2048_STORAGE_KEY,
  move2048,
  new2048,
  readLegacy2048,
  type Game2048,
} from './game2048';

const game = (grid: number[], changes: Partial<Game2048> = {}): Game2048 => ({
  grid,
  score: 0,
  best: 0,
  won: false,
  over: false,
  ...changes,
});
const zeros = Array<number>(16).fill(0);
const random = () => 0;

describe('legacy 2048 migration foundation', () => {
  it('accepts the legacy save shape without touching stored data', () => {
    const legacy = game([2, 4, ...zeros.slice(2)], { score: 100, best: 300, won: false });
    expect(LEGACY_2048_STORAGE_KEY).toBe('b24dul_2048');
    expect(readLegacy2048(JSON.stringify(legacy))).toEqual({ status: 'ready', game: legacy });
    expect(readLegacy2048(null)).toEqual({ status: 'missing' });
    for (const bad of [
      '{',
      'null',
      JSON.stringify({ ...legacy, grid: [2] }),
      JSON.stringify({ ...legacy, score: -1 }),
      JSON.stringify({ ...legacy, grid: [3, ...zeros.slice(1)] }),
    ]) {
      expect(readLegacy2048(bad)).toEqual({ status: 'invalid' });
    }
  });
  it('starts a game with two tiles and an empty score', () => {
    const created = new2048(random);
    expect(created.grid.filter(Boolean)).toEqual([2, 2]);
    expect(created.score).toBe(0);
    expect(created.over).toBe(false);
  });
  it('merges each tile once and awards the legacy score without modifying the input', () => {
    const original = game([2, 2, 2, 2, ...zeros.slice(4)], { score: 10, best: 15 });
    const result = move2048(original, 'left', random);
    expect(result.moved).toBe(true);
    expect(result.game.grid.slice(0, 4)).toEqual([4, 4, 2, 0]);
    expect(result.game.score).toBe(18);
    expect(result.game.best).toBe(18);
    expect(original.grid.slice(0, 4)).toEqual([2, 2, 2, 2]);
  });
  it('moves in each direction with the correct scoring', () => {
    const initial = game([2, 0, 0, 0, 2, ...zeros.slice(5)]);
    const up = move2048(initial, 'up', random);
    expect(up.game.grid[0]).toBe(4);
    expect(up.game.score).toBe(4);
    const down = move2048(initial, 'down', random);
    expect(down.game.grid[12]).toBe(4);
    expect(down.game.score).toBe(4);
    const right = move2048(game([2, 2, 0, 0, ...zeros.slice(4)]), 'right', random);
    expect(right.game.grid[3]).toBe(4);
    expect(right.game.score).toBe(4);
  });
  it('does not spawn a tile or consume randomness when a move cannot change the board', () => {
    const initial = game([2, 0, 0, 0, ...zeros.slice(4)]);
    const rng = vi.fn(() => 0);
    expect(move2048(initial, 'left', rng)).toEqual({ moved: false, game: initial });
    expect(rng).not.toHaveBeenCalled();
  });
  it('identifies a stuck board and allows continuing after a first 2048 tile', () => {
    expect(canMove([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2])).toBe(false);
    const result = move2048(game([1024, 1024, ...zeros.slice(2)]), 'left', random);
    expect(result.moved).toBe(true);
    if (result.moved) {
      expect(result.reached2048).toBe(true);
      expect(result.game.won).toBe(true);
      expect(result.game.over).toBe(false);
    }
  });
  it('refuses invalid random values instead of corrupting a game', () => {
    const original = game([0, 2, ...zeros.slice(2)]);
    expect(() => move2048(original, 'left', () => 1)).toThrow(RangeError);
    expect(original.grid[1]).toBe(2);
  });
});
