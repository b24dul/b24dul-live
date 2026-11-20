import { readLegacy2048, type Game2048 } from './game2048';
import { readLegacySudoku, type SudokuGame, type SudokuLevel } from './sudoku';

/**
 * This site's own save keys, separate from the old site's keys (which are never written).
 * The key names date from the preview; they're kept so games saved since then aren't lost.
 */
export const SAVE_2048_KEY = 'b24dul.preview.2048.v1';
export const SAVE_SUDOKU_KEY = 'b24dul.preview.sudoku.v1';
export type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadResult<T> =
  { status: 'ready'; game: T } | { status: 'missing' | 'invalid' | 'unavailable' };
export type SaveResult = 'saved' | 'unrecognized' | 'invalid' | 'unavailable';
type Decoder<T> = (
  raw: string | null,
) => { status: 'ready'; game: T } | { status: 'missing' | 'invalid' };

function readEnvelope<T>(
  storage: StorageAccess,
  key: string,
  kind: string,
  decode: Decoder<T>,
): LoadResult<T> {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'missing' };
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return { status: 'invalid' };
    const envelope = value as Record<string, unknown>;
    if (envelope.schemaVersion !== 1 || envelope.kind !== kind) return { status: 'invalid' };
    const result = decode(JSON.stringify(envelope.game));
    return result.status === 'ready' ? result : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

function saveEnvelope<T>(
  storage: StorageAccess,
  key: string,
  kind: string,
  game: T,
  decode: Decoder<T>,
): SaveResult {
  try {
    // Never overwrite a corrupt or newer-version save automatically.
    const existing = readEnvelope(storage, key, kind, decode);
    if (existing.status === 'unavailable') return 'unavailable';
    if (existing.status === 'invalid') return 'unrecognized';
    if (decode(JSON.stringify(game)).status !== 'ready') return 'invalid';
    storage.setItem(key, JSON.stringify({ schemaVersion: 1, kind, game }));
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

export function load2048(storage: StorageAccess): LoadResult<Game2048> {
  return readEnvelope(storage, SAVE_2048_KEY, '2048', readLegacy2048);
}
export function save2048(storage: StorageAccess, game: Game2048): SaveResult {
  return saveEnvelope(storage, SAVE_2048_KEY, '2048', game, readLegacy2048);
}
export function loadSudoku(storage: StorageAccess): LoadResult<SudokuGame> {
  return readEnvelope(storage, SAVE_SUDOKU_KEY, 'sudoku', readLegacySudoku);
}
export function saveSudoku(storage: StorageAccess, game: SudokuGame): SaveResult {
  // The original game clears undo history on reload; preserve that behavior and bound the save.
  return saveEnvelope(
    storage,
    SAVE_SUDOKU_KEY,
    'sudoku',
    { ...game, history: [] },
    readLegacySudoku,
  );
}

/** Removes this site's Sudoku save (never the old site's), unless it's one we can't read. */
export function clearSudoku(storage: StorageAccess & Pick<Storage, 'removeItem'>) {
  if (loadSudoku(storage).status === 'ready') storage.removeItem(SAVE_SUDOKU_KEY);
}

/** Fastest solve time in seconds for each Sudoku level, kept in this browser only. */
export const SUDOKU_BEST_KEY = 'b24dul.sudoku-best.v1';
export type SudokuBests = Partial<Record<SudokuLevel, number>>;

export function loadSudokuBests(): SudokuBests {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SUDOKU_BEST_KEY) ?? '{}');
    if (typeof value !== 'object' || value === null) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([level, time]) =>
          ['easy', 'medium', 'hard'].includes(level) && Number.isSafeInteger(time) && time >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export function saveSudokuBests(bests: SudokuBests) {
  try {
    window.localStorage.setItem(SUDOKU_BEST_KEY, JSON.stringify(bests));
  } catch {
    // Not saved in this browser; the game still works.
  }
}
