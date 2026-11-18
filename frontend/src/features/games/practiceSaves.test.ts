import { beforeEach, describe, expect, it, vi } from 'vitest';
import { new2048 } from './game2048';
import { newSudoku } from './sudoku';
import {
  loadPractice2048,
  loadPracticeSudoku,
  PRACTICE_2048_KEY,
  PRACTICE_SUDOKU_KEY,
  savePractice2048,
  savePracticeSudoku,
} from './practiceSaves';

beforeEach(() => window.localStorage.clear());

describe('separate practice save storage', () => {
  it('round-trips each practice game without modifying either legacy save', () => {
    const legacy2048 = '{"legacy":"2048"}';
    const legacySudoku = '{"legacy":"sudoku"}';
    window.localStorage.setItem('b24dul_2048', legacy2048);
    window.localStorage.setItem('b24dul_sudoku', legacySudoku);
    const game2048 = new2048(() => 0);
    const sudoku = newSudoku('easy', () => 0.2);
    expect(savePractice2048(window.localStorage, game2048)).toBe('saved');
    expect(savePracticeSudoku(window.localStorage, sudoku)).toBe('saved');
    expect(loadPractice2048(window.localStorage)).toEqual({ status: 'ready', game: game2048 });
    expect(loadPracticeSudoku(window.localStorage)).toEqual({ status: 'ready', game: sudoku });
    expect(window.localStorage.getItem('b24dul_2048')).toBe(legacy2048);
    expect(window.localStorage.getItem('b24dul_sudoku')).toBe(legacySudoku);
    expect(PRACTICE_2048_KEY).not.toBe(PRACTICE_SUDOKU_KEY);
  });
  it('does not overwrite a malformed or future-version practice save', () => {
    for (const raw of ['not json', JSON.stringify({ schemaVersion: 2, kind: '2048', game: {} })]) {
      window.localStorage.setItem(PRACTICE_2048_KEY, raw);
      expect(loadPractice2048(window.localStorage)).toEqual({ status: 'invalid' });
      expect(
        savePractice2048(
          window.localStorage,
          new2048(() => 0),
        ),
      ).toBe('unrecognized');
      expect(window.localStorage.getItem(PRACTICE_2048_KEY)).toBe(raw);
    }
  });
  it('handles unavailable and full storage without writing elsewhere', () => {
    const blocked = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
    };
    expect(loadPractice2048(blocked)).toEqual({ status: 'unavailable' });
    expect(
      savePractice2048(
        blocked,
        new2048(() => 0),
      ),
    ).toBe('unavailable');
    expect(blocked.setItem).not.toHaveBeenCalled();
    const full = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('full');
      }),
    };
    expect(
      savePracticeSudoku(
        full,
        newSudoku('easy', () => 0.2),
      ),
    ).toBe('unavailable');
  });
  it('does not save malformed game state', () => {
    const invalid = { ...new2048(() => 0), score: -1 };
    expect(savePractice2048(window.localStorage, invalid)).toBe('invalid');
    expect(window.localStorage.getItem(PRACTICE_2048_KEY)).toBeNull();
  });
});
