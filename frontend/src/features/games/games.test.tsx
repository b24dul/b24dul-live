import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('2048 controls and screens', () => {
  // jsdom has no PointerEvent; a MouseEvent with the pointer fields is enough here.
  if (!('PointerEvent' in window))
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: class extends MouseEvent {
        pointerId: number;
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
          this.pointerType = init.pointerType ?? '';
        }
      },
    });
  const board = () => screen.getByRole('grid', { name: '2048 board' });
  const cells = () => screen.getAllByRole('gridcell').map((cell) => cell.textContent);
  const drag = (dx: number, dy: number, pointerType = 'mouse') => {
    const init = { pointerId: 1, button: 0, pointerType };
    fireEvent.pointerDown(board(), { ...init, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(board(), { ...init, clientX: 100 + dx, clientY: 100 + dy });
    fireEvent.pointerUp(board(), { ...init, clientX: 100 + dx, clientY: 100 + dy });
  };

  it('moves with WASD as well as the arrow keys', () => {
    save2048({ grid: [2, 2, ...empty], score: 0, best: 0, won: false, over: false });
    render(<Play2048 />);
    fireEvent.keyDown(board(), { key: 'd' });
    expect(cells()[3]).toBe('4');
    expect(saved2048().score).toBe(4);
  });

  it('a mouse, touch or pen drag moves once; a short tap moves nothing', () => {
    save2048({ grid: [2, 2, ...empty], score: 0, best: 0, won: false, over: false });
    render(<Play2048 />);
    drag(10, 5);
    expect(saved2048().score).toBe(0);
    drag(120, 10);
    expect(cells()[3]).toBe('4');
    expect(saved2048().score).toBe(4);
    for (const type of ['touch', 'pen']) {
      const before = saved2048().grid.join();
      drag(-5, 90, type);
      drag(5, -90, type);
      expect(saved2048().grid.join()).not.toBe(before);
    }
  });

  it('shows the points gained and draws one tile per number', () => {
    save2048({ grid: [2, 2, ...empty], score: 0, best: 0, won: false, over: false });
    const { container } = render(<Play2048 />);
    fireEvent.keyDown(board(), { key: 'ArrowLeft' });
    expect(container.querySelector('.g2-gain')).toHaveTextContent('+4');
    const visible = container.querySelectorAll('.g2-tile:not(.is-gone)');
    expect([...visible].map((tile) => tile.textContent).sort()).toEqual(
      saved2048().grid.filter(Boolean).map(String).sort(),
    );
    expect(container.querySelector('.g2-tile.is-merged')).toHaveAttribute('data-v', '4');
  });

  const nearOver = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 8, 0, 16, 8, 16];

  it('game over shows the final score, the best and "New best!" when beaten', async () => {
    save2048({ grid: nearOver, score: 900, best: 500, won: false, over: false });
    render(<Play2048 />);
    fireEvent.keyDown(board(), { key: 'ArrowLeft' });
    const over = screen.getByRole('dialog', { name: 'Game over' });
    expect(over).toHaveTextContent('Score: 900');
    expect(over).toHaveTextContent('Your best: 900');
    expect(over).toHaveTextContent('New best!');
    expect(await screen.findByText('Score sent.')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith('g2048', 900, false);
  });

  it('game over without a new best says nothing about one', () => {
    save2048({ grid: nearOver, score: 900, best: 5000, won: false, over: false });
    render(<Play2048 />);
    fireEvent.keyDown(board(), { key: 'ArrowLeft' });
    const over = screen.getByRole('dialog', { name: 'Game over' });
    expect(over).toHaveTextContent('Your best: 5000');
    expect(over).not.toHaveTextContent('New best!');
  });

  it('the win screen celebrates and offers Keep going', () => {
    save2048({ grid: [1024, 1024, ...empty], score: 0, best: 0, won: false, over: false });
    const { container } = render(<Play2048 />);
    fireEvent.keyDown(board(), { key: 'ArrowLeft' });
    const win = screen.getByRole('dialog', { name: 'You made 2048!' });
    expect(win).toHaveTextContent('New best!');
    expect(container.querySelector('.game-confetti')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeInTheDocument();
  });
});

describe('Sudoku: three mistakes, highlights and number pad', () => {
  it('shows Mistakes n/3 and ends on the third mistake without saving or scoring', () => {
    saveSudoku({ mistakes: 2 });
    render(<PlaySudoku />);
    expect(screen.getByText(/Mistakes: 2\/3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter 1' }));
    const over = screen.getByRole('group', { name: 'Game over' });
    expect(over).toHaveTextContent('3 mistakes');
    expect(over).toHaveTextContent('No hint-free easy solve yet');
    expect(screen.getByText(/Mistakes: 3\/3/)).toBeInTheDocument();
    expect(window.localStorage.getItem(SAVE_SUDOKU_KEY)).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enter 4' })).toBeDisabled();
    fireEvent.click(within(over).getByRole('button', { name: 'New easy Sudoku' }));
    expect(screen.queryByRole('group', { name: 'Game over' })).not.toBeInTheDocument();
    expect(screen.getByText(/Mistakes: 0\/3/)).toBeInTheDocument();
  });

  it('the first and second mistakes do not end the puzzle', () => {
    saveSudoku();
    render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enter 2' }));
    expect(screen.getByText(/Mistakes: 2\/3/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Game over' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SAVE_SUDOKU_KEY)).not.toBeNull();
  });

  it('highlights the row, column, box and same numbers, and shows how many are left', () => {
    saveSudoku();
    render(<PlaySudoku />);
    const cell = (r: number, c: number) =>
      screen.getByRole('gridcell', { name: new RegExp(`^Row ${r} column ${c},`) });
    fireEvent.click(cell(1, 1)); // a given 5
    expect(cell(1, 1)).toHaveClass('is-selected');
    expect(cell(1, 9)).toHaveClass('is-peer');
    expect(cell(9, 1)).toHaveClass('is-peer');
    expect(cell(3, 3)).toHaveClass('is-peer');
    expect(cell(5, 5)).not.toHaveClass('is-peer');
    expect(cell(3, 7)).toHaveClass('is-same'); // another 5
    expect(cell(1, 1)).toHaveClass('is-given');
    expect(screen.getByRole('button', { name: 'Enter 4' })).toHaveAccessibleDescription('1 left');
    expect(screen.getByRole('button', { name: 'Enter 5' })).toHaveAccessibleDescription('0 left');
  });

  it('completing a row, column and box makes them glow', () => {
    saveSudoku();
    const { container } = render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter 4' }));
    expect(container.querySelectorAll('.sd-cell.is-glow').length).toBeGreaterThanOrEqual(9);
  });

  it('a hint-free solve records the personal best and says "New best!"', () => {
    saveSudoku();
    render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter 4' }));
    const solved = screen.getByRole('group', { name: 'Puzzle solved!' });
    expect(solved).toHaveTextContent('New best!');
    expect(solved).toHaveTextContent('Your best (easy): 1:35');
    expect(JSON.parse(window.localStorage.getItem('b24dul.sudoku-best.v1')!)).toEqual({
      easy: 95,
    });
  });

  it('a slower solve keeps the old best and no "New best!"', () => {
    window.localStorage.setItem('b24dul.sudoku-best.v1', JSON.stringify({ easy: 60 }));
    saveSudoku();
    render(<PlaySudoku />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter 4' }));
    const solved = screen.getByRole('group', { name: 'Puzzle solved!' });
    expect(solved).not.toHaveTextContent('New best!');
    expect(solved).toHaveTextContent('Your best (easy): 1:00');
  });
});
