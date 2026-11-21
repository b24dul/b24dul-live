import { countEvent } from '../../services/visitorCounts';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { GlassPanel } from '../../components/ui';
import { load2048, save2048 } from './gameSaves';
import { saveProblemText, useSavedGame } from './useSavedGame';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { move2048, new2048, type Direction } from './game2048';
import { GameResult } from './GameResult';
import { slideTiles, tilesFromGrid, tilesMatch, type Tile } from './tiles2048';

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
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
};
/** A drag or swipe shorter than this (in CSS pixels) is a tap and moves nothing. */
const MIN_DRAG = 24;

export function Play2048() {
  const { game, setGame, restored, problem } = useSavedGame(load2048, save2048);
  // A restored game that already reached 2048 carries on without showing the win screen again.
  const [keepGoing, setKeepGoing] = useState(() => game?.won ?? false);
  const [message, setMessage] = useState(restored ? 'Welcome back! Your game was restored.' : '');
  const [result, setResult] = useState('');
  const [tiles, setTiles] = useState<Tile[]>(() => (game ? tilesFromGrid(game.grid) : []));
  const [gain, setGain] = useState<{ points: number; key: number } | null>(null);
  // The best score before this game, to tell whether it set a new best.
  const [bestBefore, setBestBefore] = useState(() => game?.best ?? 0);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;

  const won = game?.won ?? false;
  const over = game?.over ?? false;
  const score = game?.score ?? 0;
  const showWin = won && !over && !keepGoing;
  const shown = game && !tilesMatch(tiles, game.grid) ? tilesFromGrid(game.grid) : tiles;

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
    if (!over) countEvent('2048/won', 'Reached 2048');
    void submit('g2048', score, session.flagged()).then(setResult);
    // Only the transitions matter; score is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, over]);

  function newGame() {
    countEvent('pick/2048', 'Picked 2048');
    const best = game?.best ?? 0;
    const fresh = { ...new2048(), best };
    setGame(fresh);
    setTiles(tilesFromGrid(fresh.grid, 'new'));
    setBestBefore(best);
    setKeepGoing(false);
    setResult('');
    setGain(null);
    session.begin(true);
    setMessage('New game started.');
    window.setTimeout(() => board.current?.focus(), 0);
  }

  function move(direction: Direction) {
    if (!game || showWin) return;
    const next = move2048(game, direction);
    if (!next.moved) return;
    setGame(next.game);
    setTiles(slideTiles(shown, direction, next.game.grid, next.spawnedIndex));
    const points = next.game.score - game.score;
    if (points) setGain({ points, key: (gain?.key ?? 0) + 1 });
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = keys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction) {
      event.preventDefault();
      move(direction);
    }
  }

  // Mouse drag, touch swipe and pen all arrive as pointer events. One move per drag.
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (event.pointerType === 'mouse') {
      event.preventDefault(); // no text selection while dragging
      event.currentTarget.focus();
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_DRAG) return;
    drag.current = null;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  const endDrag = () => {
    drag.current = null;
  };

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
          <div className="g2-score">
            <p className="text-sm text-slate-200">
              Score: {game.score} · Best: {game.best}
            </p>
            {gain && (
              <span aria-hidden="true" className="g2-gain" key={gain.key}>
                +{gain.points}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm text-slate-300">
            Use the arrow keys or WASD, drag with the mouse, swipe on the board, or use the
            direction buttons.
          </p>
          <div className="relative">
            <div
              aria-label="2048 board"
              className="g2-board"
              onKeyDown={handleKey}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              ref={board}
              role="grid"
              tabIndex={0}
            >
              {[0, 1, 2, 3].map((row) => (
                <div className="g2-row" key={row} role="row">
                  {game.grid.slice(row * 4, row * 4 + 4).map((value, column) => (
                    <div
                      aria-label={value ? String(value) : 'Empty'}
                      className="g2-cell"
                      key={column}
                      role="gridcell"
                    >
                      <span className="sr-only">{value || ''}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div aria-hidden="true" className="g2-tiles">
                {shown.map((tile) => (
                  <div
                    className={`g2-tile${tile.state ? ` is-${tile.state}` : ''}`}
                    data-v={tile.value > 2048 ? 'big' : tile.value}
                    key={tile.id}
                    style={{ '--r': tile.at >> 2, '--c': tile.at & 3 } as CSSProperties}
                  >
                    {tile.value}
                  </div>
                ))}
              </div>
            </div>
            {(showWin || game.over) && (
              <GameResult
                id="game-2048-result"
                message={result}
                newBest={game.score > bestBefore}
                title={game.over ? 'Game over' : 'You made 2048!'}
                win={!game.over}
              >
                <p className="text-slate-200">Score: {game.score}</p>
                <p className="text-sm text-slate-300">Your best: {game.best}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {!game.over && (
                    <button
                      className="ui-button ui-button--primary"
                      type="button"
                      onClick={() => {
                        setKeepGoing(true);
                        setResult('');
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
              </GameResult>
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
