import { describe, expect, it } from 'vitest';
import { ERASE_BOARD_IDS } from '../../services/adminService';
import { BOARDS, boardFor, formatScore, isBetter, isPossibleScore } from './leaderboardBoards';

describe('leaderboard boards', () => {
  it('privacy erasure covers every board', () => {
    expect(ERASE_BOARD_IDS).toEqual(BOARDS.map((board) => board.id));
  });

  it('accepts only possible values', () => {
    const g2048 = boardFor('g2048');
    expect(isPossibleScore(g2048, 2048)).toBe(true);
    for (const value of [0, -4, 2, 2050, 400004, 1.5, Number.NaN]) {
      expect(isPossibleScore(g2048, value)).toBe(false);
    }
    const easy = boardFor('sudoku-easy');
    expect(isPossibleScore(easy, 30)).toBe(true);
    for (const value of [29, 86401, 40.5, -1]) expect(isPossibleScore(easy, value)).toBe(false);
    expect(isPossibleScore(boardFor('sudoku-hard'), 59)).toBe(false);
  });

  it('knows which way is better', () => {
    expect(isBetter(boardFor('g2048'), 100, null)).toBe(true);
    expect(isBetter(boardFor('g2048'), 100, 200)).toBe(false);
    expect(isBetter(boardFor('sudoku-easy'), 100, 200)).toBe(true);
    expect(formatScore(boardFor('sudoku-easy'), 125)).toBe('2:05');
  });
});
