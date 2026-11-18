import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { load2048, save2048 } from './gameSaves';
import { saveProblemText, useSavedGame } from './useSavedGame';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { move2048, new2048, type Direction } from './game2048';

const directions: { label: string; direction: Direction }[] = [
  { label: 'Up', direction: 'up' },
  { label: 'Left', direction: 'left' },
  { label: 'Down', direction: 'down' },
  { label: 'Right', direction: 'right' },
];
const keys: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowRight: 'right',
};

export function Play2048() {
  const { game, setGame, restored, problem } = useSavedGame(load2048, save2048);
  // A restored game that already reached 2048 carries on without showing the win screen again.
  const [keepGoing, setKeepGoing] = useState(() => game?.won ?? false);
  const [message, setMessage] = useState(restored ? 'Welcome back! Your game was restored.' : '');
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;

  const won = game?.won ?? false;
  const over = game?.over ?? false;
  const score = game?.score ?? 0;
  const showWin = won && !over && !keepGoing;

  // A restored game can still go on the leaderboard, but never offers the same result twice.
  useEffect(() => {
    if (restored) session.begin(!over, won ? ['won'] : []);
    // Runs once, for the game restored on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Like the old site: the score is offered when 2048 is reached and when the game ends.
  useEffect(() => {
    if (!won && !over) return;
    if (!session.claim(over ? 'over' : 'won')) return;
    void submit('g2048', score, session.flagged()).then(setMessage);
    // Only the transitions matter; score is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, over]);

  function newGame() {
    setGame((current) => ({ ...new2048(), best: current?.best ?? 0 }));
    setKeepGoing(false);
    session.begin(true);
    setMessage('New game started.');
    window.setTimeout(() => board.current?.focus(), 0);
  }

  function move(direction: Direction) {
    if (showWin) return;
    setGame((current) => (current ? move2048(current, direction).game : current));
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const direction = keys[event.key];
    if (direction) {
      event.preventDefault();
      move(direction);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-7" aria-labelledby="game-2048-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold" id="game-2048-title">
          2048
        </h2>
        <button className="ui-button ui-button--primary" type="button" onClick={newGame}>
          {game ? 'New game' : 'Play 2048'}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Slide the tiles to join matching numbers and reach 2048. {saveProblemText(problem)} When
        you’re signed in with Google, your score goes on the leaderboard when you reach 2048 and
        when the game ends.
      </p>
      <p className="mt-3 text-sm text-slate-300" role="status">
        {message}
      </p>
      {game && (
        <div className="mt-4 max-w-sm">
          <p className="mb-3 text-sm text-slate-200">
            Score: {game.score} · Best: {game.best}
          </p>
          <p className="mb-3 text-sm text-slate-300">
            Use the arrow keys, swipe on the board, or use the direction buttons.
          </p>
          <div className="relative">
            <div
              aria-label="2048 board"
              className="grid gap-2 rounded-xl bg-slate-950/60 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              onKeyDown={handleKey}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              ref={board}
              role="grid"
              style={{ touchAction: 'none' }}
              tabIndex={0}
            >
              {[0, 1, 2, 3].map((row) => (
                <div className="grid grid-cols-4 gap-2" key={row} role="row">
                  {game.grid.slice(row * 4, row * 4 + 4).map((value, column) => (
                    <div
                      aria-label={value ? String(value) : 'Empty'}
                      className="flex aspect-square items-center justify-center rounded-lg bg-slate-700 text-lg font-bold text-white sm:text-2xl"
                      key={column}
                      role="gridcell"
                    >
                      {value || ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {(showWin || game.over) && (
              <div
                aria-labelledby="game-2048-result"
                className="game-result"
                role="dialog"
                aria-modal="false"
              >
                <p className="text-2xl font-bold" id="game-2048-result">
                  {game.over ? 'Game over' : 'You made 2048!'}
                </p>
                <p className="text-slate-200">Score: {game.score}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {!game.over && (
                    <button
                      className="ui-button ui-button--primary"
                      type="button"
                      onClick={() => {
                        setKeepGoing(true);
                        board.current?.focus();
                      }}
                    >
                      Keep going
                    </button>
                  )}
                  <button
                    className={`ui-button ${game.over ? 'ui-button--primary' : 'ui-button--secondary'}`}
                    type="button"
                    onClick={newGame}
                  >
                    Play again
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="2048 direction controls">
            {directions.map(({ label, direction }) => (
              <button
                className="ui-button ui-button--secondary"
                disabled={showWin || game.over}
                key={direction}
                onClick={() => move(direction)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
