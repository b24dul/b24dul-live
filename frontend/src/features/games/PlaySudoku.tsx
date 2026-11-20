import { countEvent } from '../../services/visitorCounts';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { clearSudoku, loadSudoku, loadSudokuBests, saveSudoku, saveSudokuBests } from './gameSaves';
import { saveProblemText, useSavedGame } from './useSavedGame';
import { useScoreSession } from './useScoreSession';
import { useScoreSubmission } from './Leaderboards';
import { sudokuBoard } from './leaderboardBoards';
import { GameResult } from './GameResult';
import {
  eraseSudoku,
  hintSudoku,
  inputSudoku,
  MAX_MISTAKES,
  newlyCompleted,
  newSudoku,
  sudokuLost,
  undoSudoku,
  type SudokuGame,
  type SudokuLevel,
} from './sudoku';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const title = (level: string) => level[0]!.toUpperCase() + level.slice(1);
const boxOf = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
// A lost puzzle is removed from the browser instead of saved, so it can't be resumed.
const discardLost = { when: sudokuLost, clear: clearSudoku };

export function PlaySudoku() {
  const { game, setGame, restored, problem } = useSavedGame(loadSudoku, saveSudoku, discardLost);
  const [message, setMessage] = useState(restored ? 'Welcome back! Your puzzle was restored.' : '');
  const [result, setResult] = useState('');
  const [help, setHelp] = useState(false);
  const [bests, setBests] = useState(loadSudokuBests);
  const [newBest, setNewBest] = useState(false);
  const [glow, setGlow] = useState<number[]>([]);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const lost = game !== null && sudokuLost(game);
  const running = game !== null && !game.done && !lost;
  const scores = useScoreSubmission();
  const session = useScoreSession();
  const { submit } = scores;

  // A restored, unfinished puzzle can still go on the leaderboard; a finished one isn't re-sent.
  useEffect(() => {
    if (restored) session.begin(game !== null && !game.done);
    // Runs once, for the puzzle restored on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        setGame((current) =>
          current && !current.done && !sudokuLost(current)
            ? { ...current, elapsed: Math.min(Number.MAX_SAFE_INTEGER, current.elapsed + 1) }
            : current,
        );
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, setGame]);

  /** Applies a change; on the move that solves the puzzle, records the result once. */
  function play(change: (current: SudokuGame) => SudokuGame) {
    if (!game) return;
    const next = change(game);
    if (next === game) return;
    setGame(next);
    setGlow(newlyCompleted(game, next));
    if (!next.done || game.done || !session.claim('solved')) return;
    countEvent(`sudoku/solved-${next.level}`, `Solved Sudoku (${title(next.level)})`);
    // Like the old site: only hint-free solves count (fastest time wins).
    if (next.hints > 0) {
      setNewBest(false);
      setResult('Solved! Solve without hints to get on the leaderboard.');
      return;
    }
    const previous = bests[next.level];
    const best = previous === undefined || next.elapsed < previous;
    setNewBest(best);
    if (best) {
      const updated = { ...bests, [next.level]: next.elapsed };
      setBests(updated);
      saveSudokuBests(updated);
    }
    void submit(sudokuBoard(next.level), next.elapsed, session.flagged()).then(setResult);
  }

  function start(level: SudokuLevel) {
    countEvent('pick/sudoku', 'Picked Sudoku');
    setGame(newSudoku(level));
    setResult('');
    setNewBest(false);
    setGlow([]);
    session.begin(true);
    setMessage(`New ${level} puzzle started.`);
  }

  const input = (digit: number) => play((current) => inputSudoku(current, digit));

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!game) return;
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      input(Number(event.key));
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      play(eraseSudoku);
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

  const best = game ? bests[game.level] : undefined;
  const bestLine = game && (
    <p className="text-sm text-slate-300">
      {best === undefined
        ? `No hint-free ${game.level} solve yet`
        : `Your best (${game.level}): ${formatTime(best)}`}
    </p>
  );
  const selected = game && game.sel >= 0 ? game.sel : -1;
  const selectedValue = selected >= 0 ? game!.grid[selected]! : 0;
  const finished = game !== null && (game.done || lost);

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
              <li>The bold numbers are given and can’t be changed.</li>
              <li>
                Pick a cell, then tap a number or type it. Arrow keys move between cells; Backspace
                clears a cell. The number buttons show how many of each number are left.
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
                <strong>Three mistakes end the puzzle.</strong> Show mistakes marks wrong numbers;
                every wrong number counts as a mistake, even after Undo.
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
              {game.level} · Mistakes: {game.mistakes}/{MAX_MISTAKES} · Hints: {game.hints} · Time:{' '}
              {formatTime(game.elapsed)}
            </p>
            <p className="mb-3 text-sm text-slate-300">
              Choose a cell and use the number buttons or keyboard. Arrow keys move between cells.
            </p>
            <div className="relative">
              <div aria-label="Sudoku board" className="sd-board" onKeyDown={handleKey} role="grid">
                {Array.from({ length: 9 }, (_, r) => (
                  <div className="sd-row" key={r} role="row">
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
                      const classes = [
                        'sd-cell',
                        given ? 'is-given' : hinted ? 'is-hint' : 'is-entry',
                        c % 3 === 2 && c < 8 && 'box-right',
                        r % 3 === 2 && r < 8 && 'box-bottom',
                        index === selected
                          ? 'is-selected'
                          : selected >= 0 &&
                            (Math.floor(index / 9) === Math.floor(selected / 9) ||
                              index % 9 === selected % 9 ||
                              boxOf(index) === boxOf(selected)) &&
                            'is-peer',
                        selectedValue && value === selectedValue && 'is-same',
                        wrong && 'is-wrong',
                        glow.includes(index) && 'is-glow',
                      ];
                      return (
                        <button
                          aria-label={`Row ${r + 1} column ${c + 1}, ${description}`}
                          aria-selected={game.sel === index}
                          className={classes.filter(Boolean).join(' ')}
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
                              <span className="sd-notes">
                                {Array.from({ length: 9 }, (__, i) => (
                                  <span key={i}>{notes.includes(i + 1) ? i + 1 : ' '}</span>
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
              {game.done && (
                <GameResult
                  id="sudoku-result"
                  message={result}
                  newBest={newBest}
                  role="group"
                  title="Puzzle solved!"
                  win
                >
                  <p className="text-slate-200">
                    {title(game.level)} · Time {formatTime(game.elapsed)} · Mistakes {game.mistakes}{' '}
                    · Hints {game.hints}
                  </p>
                  {bestLine}
                  <p className="text-sm text-slate-300">Play again:</p>
                  <div className="flex flex-wrap justify-center gap-2">{levels}</div>
                </GameResult>
              )}
              {lost && (
                <GameResult
                  id="sudoku-over"
                  newBest={false}
                  role="group"
                  title="Game over"
                  win={false}
                >
                  <p className="text-slate-200">
                    {MAX_MISTAKES} mistakes. You filled{' '}
                    {
                      game.grid.filter((v, i) => v && !game.puzzle[i] && v === game.solution[i])
                        .length
                    }{' '}
                    of {game.puzzle.filter((v) => !v).length} cells in {formatTime(game.elapsed)}.
                  </p>
                  {bestLine}
                  <p className="text-sm text-slate-300">Play again:</p>
                  <div className="flex flex-wrap justify-center gap-2">{levels}</div>
                </GameResult>
              )}
            </div>
            <div aria-label="Sudoku number controls" className="sd-pad">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
                const left = Math.max(0, 9 - game.grid.filter((v) => v === digit).length);
                return (
                  <button
                    aria-describedby={`sudoku-left-${digit}`}
                    aria-label={`Enter ${digit}`}
                    className={`sd-key${left === 0 ? ' is-used-up' : ''}`}
                    disabled={finished}
                    key={digit}
                    onClick={() => input(digit)}
                    type="button"
                  >
                    {digit}
                    <small id={`sudoku-left-${digit}`}>{left} left</small>
                  </button>
                );
              })}
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
                onClick={() => play(eraseSudoku)}
                type="button"
              >
                Erase Sudoku cell
              </button>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => play(undoSudoku)}
                type="button"
              >
                Undo Sudoku
              </button>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => play((current) => hintSudoku(current))}
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
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
