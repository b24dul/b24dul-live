// Leaderboard boards and limits. firebase/v2.rules.json enforces the same limits; the emulator
// tests check both stay in step.
import type { SudokuLevel } from './sudoku';

export type BoardId = 'sudoku-easy' | 'sudoku-medium' | 'sudoku-hard' | 'g2048';

export type Board = {
  id: BoardId;
  label: string;
  /** Sudoku: fastest time (seconds) wins. 2048: highest score wins. */
  lowerWins: boolean;
  min: number;
  max: number;
  /** 2048 scores are always multiples of 4 (every merge adds at least 4). */
  step: number;
};

export const BOARDS: Board[] = [
  { id: 'sudoku-easy', label: 'Sudoku · Easy', lowerWins: true, min: 30, max: 86400, step: 1 },
  { id: 'sudoku-medium', label: 'Sudoku · Medium', lowerWins: true, min: 45, max: 86400, step: 1 },
  { id: 'sudoku-hard', label: 'Sudoku · Hard', lowerWins: true, min: 60, max: 86400, step: 1 },
  { id: 'g2048', label: '2048', lowerWins: false, min: 4, max: 400000, step: 4 },
];

export const TOP_SHOWN = 10;
export const SCORE_RATE_LIMIT_MS = 10000;

export const boardFor = (id: BoardId) => BOARDS.find((board) => board.id === id)!;
export const sudokuBoard = (level: SudokuLevel): BoardId => `sudoku-${level}`;

/** Same checks as the rules: right type, possible range, and the game's step. */
export function isPossibleScore(board: Board, value: number) {
  return (
    Number.isInteger(value) && value >= board.min && value <= board.max && value % board.step === 0
  );
}

export function isBetter(board: Board, value: number, previous: number | null) {
  return previous === null || (board.lowerWins ? value < previous : value > previous);
}

export function formatScore(board: Board, value: number) {
  if (!board.lowerWins) return value.toLocaleString();
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
}
