import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_2048_KEY, SAVE_SUDOKU_KEY } from './gameSaves';

const submit = vi.fn<(board: string, value: number, flagged: boolean) => Promise<string>>(
  async () => 'Score sent.',
);
vi.mock('./Leaderboards', () => ({ useScoreSubmission: () => ({ submit }) }));

const { Play2048 } = await import('./Play2048');
const { PlaySudoku } = await import('./PlaySudoku');

const save2048 = (game: object) =>
  window.localStorage.setItem(
    SAVE_2048_KEY,
    JSON.stringify({ schemaVersion: 1, kind: '2048', game }),
  );
const saved2048 = () => JSON.parse(window.localStorage.getItem(SAVE_2048_KEY)!).game;
const empty = Array<number>(14).fill(0);

const solution = Array.from(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  Number,
);
function saveSudoku(overrides: object = {}) {
  const grid = [...solution];
  grid[2] = 0;
  window.localStorage.setItem(
    SAVE_SUDOKU_KEY,
    JSON.stringify({
      schemaVersion: 1,
      kind: 'sudoku',
      game: {
        level: 'easy',
        puzzle: grid.map((value, index) => (index < 40 ? value : 0)),
        solution,
        grid,
        notes: Array(81).fill(0),
        hinted: [],
        sel: 2,
        notesMode: false,
        history: [],
        hints: 0,
        mistakes: 0,
        elapsed: 95,
        done: false,
        showMistakes: true,
        ...overrides,
      },
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  submit.mockClear();
});
afterEach(() => window.localStorage.clear());

describe('2048', () => {
  it('starts a game and saves it automatically, with no "practice" wording', () => {
    render(<Play2048 />);
    expect(screen.getByRole('heading', { name: '2048' })).toBeInTheDocument();
    expect(screen.queryByText(/practice/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play 2048' }));
    expect(saved2048().grid.filter(Boolean)).toHaveLength(2);
    expect(screen.getByText(/Your game saves automatically/)).toBeInTheDocument();
  });

  it('shows "You made 2048" with Keep going and Play again, and offers the score once', async () => {
    save2048({ grid: [1024, 1024, ...empty], score: 0, best: 0, won: false, over: false });
    render(<Play2048 />);
    expect(screen.getByText('Welcome back! Your game was restored.')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('grid', { name: '2048 board' }), { key: 'ArrowLeft' });
    expect(screen.getByText('You made 2048!')).toBeInTheDocument();
    expect(await screen.findByText('Score sent.')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith('g2048', 2048, false);
    expect(screen.getByRole('button', { name: 'Right' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(screen.queryByText('You made 2048!')).not.toBeInTheDocument();
    expect(saved2048()).toMatchObject({ won: true, score: 2048 });
  });

  it('Play again from the win screen starts fresh but keeps the best score', () => {
    save2048({ grid: [1024, 1024, ...empty], score: 10, best: 50, won: false, over: false });
    render(<Play2048 />);
    fireEvent.keyDown(screen.getByRole('grid', { name: '2048 board' }), { key: 'ArrowLeft' });
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Score: 0 · Best: 2058')).toBeInTheDocument();
    expect(saved2048()).toMatchObject({ score: 0, best: 2058, won: false });
  });

  it('a restored finished game shows Game over and is not offered to the leaderboard again', () => {
    const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    save2048({ grid: full, score: 300, best: 300, won: false, over: true });
    render(<Play2048 />);
    expect(screen.getByText('Game over')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
  });

  it('a restored game that already won does not show the win screen again', () => {
    save2048({ grid: [2048, 2, ...empty], score: 2100, best: 2100, won: true, over: false });
    render(<Play2048 />);
    expect(screen.queryByText('You made 2048!')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('grid', { name: '2048 board' }), { key: 'ArrowDown' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('never overwrites a save it cannot read', () => {
    const future = JSON.stringify({ schemaVersion: 2, kind: '2048', game: { future: true } });
    window.localStorage.setItem(SAVE_2048_KEY, future);
    render(<Play2048 />);
    expect(screen.getByText(/saved game this version can’t read/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play 2048' }));
    fireEvent.click(screen.getByRole('button', { name: 'Right' }));
    expect(window.localStorage.getItem(SAVE_2048_KEY)).toBe(future);
  });
});

describe('Sudoku', () => {
  it('has a How to play guide that opens and closes', () => {
    render(<PlaySudoku />);
    expect(screen.queryByText(/practice/i)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'How to play' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/every 3×3 box has each number from 1 to 9/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/every 3×3 box/)).not.toBeInTheDocument();
  });

  it('saves automatically and restores the puzzle', () => {
    render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'New medium Sudoku' }));
    const saved = JSON.parse(window.localStorage.getItem(SAVE_SUDOKU_KEY)!).game;
    expect(saved.level).toBe('medium');
  });

  it('shows the solved screen, offers a hint-free time once, and not again after reload', async () => {
    saveSudoku();
    const first = render(<PlaySudoku />);
    expect(screen.getByText('Welcome back! Your puzzle was restored.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter 4' }));
    expect(screen.getByText('Puzzle solved!')).toBeInTheDocument();
    expect(screen.getByText(/Easy · Time 1:35 · Mistakes 0 · Hints 0/)).toBeInTheDocument();
    expect(await screen.findByText('Score sent.')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith('sudoku-easy', 95, false);
    first.unmount();
    render(<PlaySudoku />);
    expect(screen.getByText('Puzzle solved!')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('does not send a solve that used a hint', () => {
    saveSudoku({ hints: 1 });
    render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter 4' }));
    expect(screen.getByText(/Solve without hints to get on the leaderboard/)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
