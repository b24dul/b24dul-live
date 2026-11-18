import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { loadPracticeSudoku, savePracticeSudoku } from './practiceSaves';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { sudokuBoard } from './leaderboardBoards';
import {
  eraseSudoku,
  hintSudoku,
  inputSudoku,
  LEGACY_SUDOKU_STORAGE_KEY,
  newSudoku,
  readLegacySudoku,
  undoSudoku,
  type SudokuGame,
  type SudokuLevel,
} from './sudoku';

export function PracticeSudoku() {
  const [game, setGame] = useState<SudokuGame | null>(null);
  const [message, setMessage] = useState('');
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const running = game !== null && !game.done;
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;
  const done = game?.done ?? false;

  // Like the old site: only hint-free solves go on the leaderboard (fastest time wins).
  useEffect(() => {
    if (!done || !game || !session.claim('solved')) return;
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
  }, [running]);

  function start(level: SudokuLevel) {
    setGame(newSudoku(level));
    session.begin(true);
    setMessage(`New ${level} puzzle started.`);
  }

  function savePractice() {
    if (!game) return;
    try {
      const result = savePracticeSudoku(window.localStorage, game);
      setMessage(
        result === 'saved'
          ? 'Sudoku practice saved in this browser.'
          : result === 'unrecognized'
            ? 'The existing Sudoku practice save could not be read and was not overwritten.'
            : 'The Sudoku practice game could not be saved. Existing saves have not been changed.',
      );
    } catch {
      setMessage('Browser storage is unavailable. Existing saves have not been changed.');
    }
  }

  function loadPractice() {
    try {
      const saved = loadPracticeSudoku(window.localStorage);
      if (saved.status === 'ready') {
        setGame(saved.game);
        session.begin(true);
        setMessage('Loaded your Sudoku practice save.');
      } else {
        setMessage(
          saved.status === 'missing'
            ? 'No Sudoku practice save was found in this browser.'
            : 'The Sudoku practice save is unavailable or cannot be read. It has not been changed.',
        );
      }
    } catch {
      setMessage('Browser storage is unavailable. Existing saves have not been changed.');
    }
  }

  function loadLegacy() {
    try {
      const saved = readLegacySudoku(window.localStorage.getItem(LEGACY_SUDOKU_STORAGE_KEY));
      if (saved.status === 'ready') {
        setGame(saved.game);
        session.begin(false);
        setMessage('Loaded a copy of your saved Sudoku game for practice.');
      } else {
        setMessage(
          saved.status === 'missing'
            ? 'No saved Sudoku game was found in this browser.'
            : 'This Sudoku save could not be read. It has been left unchanged.',
        );
      }
    } catch {
      setMessage('Browser storage is unavailable. Your Sudoku save has not been changed.');
    }
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

  return (
    <section aria-labelledby="sudoku-practice-title">
      <GlassPanel className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold" id="sudoku-practice-title">
          Sudoku practice
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Save progress in this browser, or load a copy of an old-site save. When you’re signed in
          with Google, hint-free solves go on the leaderboard (copies of old-site saves don’t
          count).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              className="ui-button ui-button--secondary"
              key={level}
              onClick={() => start(level)}
              type="button"
            >
              New {level} Sudoku
            </button>
          ))}
          <button className="ui-button ui-button--secondary" onClick={loadLegacy} type="button">
            Load Sudoku save copy
          </button>
          <button
            className="ui-button ui-button--secondary"
            disabled={!game}
            onClick={savePractice}
            type="button"
          >
            Save Sudoku practice
          </button>
          <button className="ui-button ui-button--secondary" onClick={loadPractice} type="button">
            Load Sudoku practice
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-300" role="status">
          {message}
        </p>
        {game && (
          <div className="mt-4 max-w-lg">
            <p className="mb-3 text-sm text-slate-200">
              {game.level} · Mistakes: {game.mistakes} · Hints: {game.hints} · Time:{' '}
              {Math.floor(game.elapsed / 60)}:{String(game.elapsed % 60).padStart(2, '0')}
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
                        className={`relative flex aspect-square min-w-0 items-center justify-center rounded text-xs font-semibold focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:text-lg ${game.sel === index ? 'bg-cyan-700 text-white' : given ? 'bg-slate-600 text-white' : wrong ? 'bg-red-900 text-white' : 'bg-slate-800 text-white'}`}
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
              <p className="mt-3" role="status">
                Sudoku solved!
              </p>
            )}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
