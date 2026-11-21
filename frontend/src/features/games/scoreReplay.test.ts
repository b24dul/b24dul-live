import { describe, expect, it } from 'vitest';
import { replay2048 } from './scoreReplay';

describe('2048 score replay primitive', () => {
  it('replays a known seeded sequence without trusting the submitted score', () => {
    const submission = { moves: ['left', 'left'], score: 4 };
    const result = replay2048(1, submission);
    expect(result).toEqual({
      status: 'replayed',
      score: 4,
      grid: [2, 0, 0, 2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0],
      claimedScoreMatches: true,
      eligibleCheckpoint: false,
    });
    expect(submission).toEqual({ moves: ['left', 'left'], score: 4 });
    expect(replay2048(1, { moves: ['left', 'left'], score: 999999 })).toMatchObject({
      status: 'replayed',
      score: 4,
      claimedScoreMatches: false,
      eligibleCheckpoint: false,
    });
  });
  it('marks a known finished replay as eligible while rejecting a forged score', () => {
    const direction = { l: 'left', u: 'up', r: 'right', d: 'down' } as const;
    const moves = Array.from(
      'lurd'.repeat(38) + 'lur',
      (letter) => direction[letter as keyof typeof direction],
    );
    expect(replay2048(1, { moves, score: 1468 })).toMatchObject({
      status: 'replayed',
      score: 1468,
      claimedScoreMatches: true,
      eligibleCheckpoint: true,
    });
    expect(replay2048(1, { moves, score: 999999 })).toMatchObject({
      status: 'replayed',
      score: 1468,
      claimedScoreMatches: false,
      eligibleCheckpoint: true,
    });
  });
  it('rejects invalid seeds, move sequences and impossible score values', () => {
    for (const seed of [0, -1, NaN, 0x100000000]) {
      expect(replay2048(seed, { moves: [], score: 0 })).toEqual({ status: 'invalid' });
    }
    for (const submission of [
      null,
      { moves: ['teleport'], score: 0 },
      { moves: [], score: -1 },
      { moves: [], score: 0.5 },
      { moves: Array(4097).fill('left'), score: 0 },
    ])
      expect(replay2048(1, submission)).toEqual({ status: 'invalid' });
  });
  it('rejects impossible no-op moves rather than advancing random state', () => {
    expect(
      replay2048(1, { moves: ['left', 'left', 'left', 'left', 'left', 'left'], score: 0 }),
    ).toEqual({ status: 'invalid' });
  });
});
