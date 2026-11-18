import { countEvent } from '../../services/visitorCounts';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { loadSudoku, saveSudoku } from './gameSaves';
import { saveProblemText, useSavedGame } from './useSavedGame';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { sudokuBoard } from './leaderboardBoards';
import {
  eraseSudoku,
  hintSudoku,
  inputSudoku,
  newSudoku,
  undoSudoku,
  type SudokuLevel,
} from './sudoku';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function PlaySudoku() {
  const { game, setGame, restored, problem } = useSavedGame(loadSudoku, saveSudoku);
  const [message, setMessage] = useState(restored ? 'Welcome back! Your puzzle was restored.' : '');
  const [help, setHelp] = useState(false);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const running = game !== null && !game.done;
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;
  const done = game?.done ?? false;

  // A restored, unfinished puzzle can still go on the leaderboard; a finished one isn't re-sent.
  useEffect(() => {
    if (restored) session.begin(!done);
    // Runs once, for the puzzle restored on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Like the old site: only hint-free solves go on the leaderboard (fastest time wins).
  useEffect(() => {
    if (!done || !game || !session.claim('solved')) return;
    countEvent(
      `sudoku/solved-${game.level}`,
      `Solved Sudoku (${game.level[0]!.toUpperCase()}${game.level.slice(1)})`,
    );
    if (game.hints > 0) {
      setMessage('Solved! Solve without hints to get on the leaderboard.');
      return;
    }
    void submit(sudokuBoard(game.level), game.elapsed, session.flagged()).then(setMessage);
    // Only the moment of solving matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        setGame((current) =>
          current && !current.done
            ? { ...current, elapsed: Math.min(Number.MAX_SAFE_INTEGER, current.elapsed + 1) }
            : current,
        );
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, setGame]);

  function start(level: SudokuLevel) {
    countEvent('pick/sudoku', 'Picked Sudoku');
    setGame(newSudoku(level));
    session.begin(true);
    setMessage(`New ${level} puzzle started.`);
  }

  function input(digit: number) {
    setGame((current) => (current ? inputSudoku(current, digit) : current));
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!game) return;
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      input(Number(event.key));
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setGame((current) => (current ? eraseSudoku(current) : current));
      return;
    }
    const current = game.sel < 0 ? 0 : game.sel;
    const row = Math.floor(current / 9);
    const column = current % 9;
    let next = current;
    if (event.key === 'ArrowLeft' && column > 0) next--;
    else if (event.key === 'ArrowRight' && column < 8) next++;
    else if (event.key === 'ArrowUp' && row > 0) next -= 9;
    else if (event.key === 'ArrowDown' && row < 8) next += 9;
    else return;
    event.preventDefault();
    setGame((state) => (state ? { ...state, sel: next } : state));
    cells.current[next]?.focus();
  }

  const levels = (['easy', 'medium', 'hard'] as const).map((level) => (
    <button
      className="ui-button ui-button--secondary"
      key={level}
      onClick={() => start(level)}
      type="button"
    >
      New {level} Sudoku
    </button>
  ));

  return (
    <section aria-labelledby="sudoku-title">
      <GlassPanel className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold" id="sudoku-title">
            Sudoku
          </h2>
          <button
            aria-controls="sudoku-help"
            aria-expanded={help}
            className="ui-button ui-button--secondary"
            onClick={() => setHelp((open) => !open)}
            type="button"
          >
            How to play
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {saveProblemText(problem)} When you’re signed in with Google, hint-free solves go on the
          leaderboard (fastest time wins).
        </p>
        {help && (
          <div className="game-help" id="sudoku-help">
            <h3 className="font-semibold">How to play</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
              <li>
                Fill the grid so every row, every column and every 3×3 box has each number from 1 to
                9 exactly once.
              </li>
              <li>The grey numbers are given and can’t be changed.</li>
              <li>
                Pick a cell, then tap a number or type it. Arrow keys move between cells; Backspace
                clears a cell.
              </li>
              <li>
                <strong>Notes</strong>: turn notes on to pencil in small candidate numbers. Tap a
                number again to remove its note.
              </li>
              <li>
                <strong>Erase</strong> clears your number or notes in the chosen cell;{' '}
                <strong>Undo</strong> steps back.
              </li>
              <li>
                <strong>Hint</strong> fills in one correct number. Puzzles solved with a hint don’t
                go on the leaderboard.
              </li>
              <li>
                <strong>Show mistakes</strong> turns wrong numbers red. Every wrong number still
                counts as a mistake.
              </li>
              <li>The timer pauses while the page is hidden. Your puzzle saves as you play.</li>
            </ul>
            <button
              className="ui-button ui-button--secondary mt-3"
              onClick={() => setHelp(false)}
              type="button"
            >
              Close
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">{levels}</div>
        <p className="mt-3 text-sm text-slate-300" role="status">
          {message}
        </p>
        {game && (
          <div className="mt-4 max-w-lg">
            <p className="mb-3 text-sm text-slate-200">
              {game.level} · Mistakes: {game.mistakes} · Hints: {game.hints} · Time:{' '}
              {formatTime(game.elapsed)}
            </p>
            <p className="mb-3 text-sm text-slate-300">
              Choose a cell and use the number buttons or keyboard. Arrow keys move between cells.
            </p>
            <div
              aria-label="Sudoku board"
              className="grid gap-0.5 rounded-lg bg-slate-950/60 p-1"
              onKeyDown={handleKey}
              role="grid"
            >
              {Array.from({ length: 9 }, (_, r) => (
                <div className="grid grid-cols-9 gap-0.5" key={r} role="row">
                  {Array.from({ length: 9 }, (_, c) => {
                    const index = r * 9 + c;
                    const value = game.grid[index]!;
                    const given = Boolean(game.puzzle[index]);
                    const hinted = game.hinted.includes(index);
                    const wrong = Boolean(
                      value && !given && game.showMistakes && value !== game.solution[index],
                    );
                    const notes = Array.from({ length: 9 }, (__, i) => i + 1).filter(
                      (digit) => (game.notes[index]! & (1 << digit)) !== 0,
                    );
                    const description = value
                      ? `${given ? 'given ' : hinted ? 'hint ' : ''}${value}${wrong ? ', incorrect' : ''}`
                      : notes.length
                        ? `notes ${notes.join(' ')}`
                        : 'empty';
                    return (
                      <button
                        aria-label={`Row ${r + 1} column ${c + 1}, ${description}`}
                        aria-selected={game.sel === index}
                        className={`relative flex aspect-square min-w-0 items-center justify-center rounded text-xs font-semibold focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-violet sm:text-lg ${game.sel === index ? 'bg-brand-violet text-white' : given ? 'bg-slate-600 text-white' : wrong ? 'bg-red-900 text-white' : 'bg-slate-800 text-white'}`}
                        key={index}
                        onClick={() =>
                          setGame((current) => (current ? { ...current, sel: index } : current))
                        }
                        ref={(element) => {
                          cells.current[index] = element;
                        }}
                        role="gridcell"
                        tabIndex={index === (game.sel < 0 ? 0 : game.sel) ? 0 : -1}
                        type="button"
                      >
                        {value ||
                          (notes.length > 0 ? (
                            <span className="grid grid-cols-3 text-[0.5rem] leading-none sm:text-xs">
                              {Array.from({ length: 9 }, (__, i) => (
                                <span key={i}>{notes.includes(i + 1) ? i + 1 : '\u00a0'}</span>
                              ))}
                            </span>
                          ) : (
                            ''
                          ))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div aria-label="Sudoku number controls" className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
                <button
                  aria-label={`Enter ${digit}`}
                  className="ui-button ui-button--secondary"
                  key={digit}
                  onClick={() => input(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                aria-pressed={game.notesMode}
                className="ui-button ui-button--secondary"
                onClick={() =>
                  setGame((current) =>
                    current ? { ...current, notesMode: !current.notesMode } : current,
                  )
                }
                type="button"
              >
                Notes {game.notesMode ? 'on' : 'off'}
              </button>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => setGame((current) => (current ? eraseSudoku(current) : current))}
                type="button"
              >
                Erase Sudoku cell
              </button>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => setGame((current) => (current ? undoSudoku(current) : current))}
                type="button"
              >
                Undo Sudoku
              </button>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => setGame((current) => (current ? hintSudoku(current) : current))}
                type="button"
              >
                Sudoku hint
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input
                checked={game.showMistakes}
                onChange={(event) =>
                  setGame((current) =>
                    current ? { ...current, showMistakes: event.target.checked } : current,
                  )
                }
                type="checkbox"
              />{' '}
              Show mistakes
            </label>
            {game.done && (
              <div aria-labelledby="sudoku-result" className="game-result-card" role="group">
                <p className="text-2xl font-bold" id="sudoku-result">
                  Puzzle solved!
                </p>
                <p className="text-slate-200">
                  {game.level[0]!.toUpperCase() + game.level.slice(1)} · Time{' '}
                  {formatTime(game.elapsed)} · Mistakes {game.mistakes} · Hints {game.hints}
                </p>
                <p className="text-sm text-slate-300">Play again:</p>
                <div className="flex flex-wrap justify-center gap-2">{levels}</div>
              </div>
            )}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
