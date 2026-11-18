import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { loadPractice2048, savePractice2048 } from './practiceSaves';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { move2048, new2048, type Direction, type Game2048 } from './game2048';

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

export function Practice2048() {
  const [game, setGame] = useState<Game2048 | null>(null);
  const [message, setMessage] = useState('');
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;

  // Like the old site: the score is offered when 2048 is reached and when the game ends.
  const won = game?.won ?? false;
  const over = game?.over ?? false;
  const score = game?.score ?? 0;
  useEffect(() => {
    if (!won && !over) return;
    if (!session.claim(over ? 'over' : 'won')) return;
    void submit('g2048', score, session.flagged()).then(setMessage);
    // Only the transitions matter; score is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, over]);

  function move(direction: Direction) {
    setGame((current) => {
      if (!current) return current;
      return move2048(current, direction).game;
    });
  }

  function savePractice() {
    if (!game) return;
    try {
      const result = savePractice2048(window.localStorage, game);
      setMessage(
        result === 'saved'
          ? '2048 practice saved in this browser.'
          : result === 'unrecognized'
            ? 'The existing 2048 practice save could not be read and was not overwritten.'
            : 'The 2048 practice game could not be saved. Existing saves have not been changed.',
      );
    } catch {
      setMessage('Browser storage is unavailable. Existing saves have not been changed.');
    }
  }

  function loadPractice() {
    try {
      const saved = loadPractice2048(window.localStorage);
      if (saved.status === 'ready') {
        setGame(saved.game);
        session.begin(true);
        setMessage('Loaded your 2048 practice save.');
      } else {
        setMessage(
          saved.status === 'missing'
            ? 'No 2048 practice save was found in this browser.'
            : 'The 2048 practice save is unavailable or cannot be read. It has not been changed.',
        );
      }
    } catch {
      setMessage('Browser storage is unavailable. Existing saves have not been changed.');
    }
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
    <GlassPanel className="p-5 sm:p-7">
      <h2 className="text-xl font-semibold">2048 practice</h2>
      <p className="mt-2 text-sm text-slate-300">
        Save progress in this browser. When you’re signed in with Google, your score goes on the
        leaderboard when you reach 2048 and when the game ends.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="ui-button ui-button--primary"
          type="button"
          onClick={() => {
            setGame(new2048());
            session.begin(true);
            setMessage('New game started.');
          }}
        >
          {game ? 'New practice game' : 'Start 2048 practice'}
        </button>
        <button
          className="ui-button ui-button--secondary"
          disabled={!game}
          onClick={savePractice}
          type="button"
        >
          Save 2048 practice
        </button>
        <button className="ui-button ui-button--secondary" onClick={loadPractice} type="button">
          Load 2048 practice
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-300" role="status">
        {message}
      </p>
      {game && (
        <div className="mt-4 max-w-sm">
          <p className="mb-3 text-sm text-slate-200">
            Score: {game.score} · Best: {game.best}
          </p>
          <p className="mb-3 text-sm text-slate-300">
            Focus the board and use arrow keys, swipe, or use the direction buttons.
          </p>
          <div
            aria-label="2048 board"
            className="grid gap-2 rounded-xl bg-slate-950/60 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            onKeyDown={handleKey}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
          <div className="mt-3 flex flex-wrap gap-2" aria-label="2048 direction controls">
            {directions.map(({ label, direction }) => (
              <button
                className="ui-button ui-button--secondary"
                key={direction}
                onClick={() => move(direction)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {game.over ? (
            <p className="mt-3" role="status">
              Game over. Start a new practice game to play again.
            </p>
          ) : game.won ? (
            <p className="mt-3" role="status">
              You reached 2048. Keep playing!
            </p>
          ) : null}
        </div>
      )}
    </GlassPanel>
  );
}
