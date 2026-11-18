import { readLegacy2048, type Game2048 } from './game2048';
import { readLegacySudoku, type SudokuGame } from './sudoku';

/** Preview-only keys: intentionally distinct from the legacy games' storage keys. */
export const PRACTICE_2048_KEY = 'b24dul.preview.2048.v1';
export const PRACTICE_SUDOKU_KEY = 'b24dul.preview.sudoku.v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
type LoadResult<T> =
  { status: 'ready'; game: T } | { status: 'missing' | 'invalid' | 'unavailable' };
type SaveResult = 'saved' | 'unrecognized' | 'invalid' | 'unavailable';
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
    // Never overwrite a corrupt or newer-version practice save automatically.
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

export function loadPractice2048(storage: StorageAccess): LoadResult<Game2048> {
  return readEnvelope(storage, PRACTICE_2048_KEY, '2048', readLegacy2048);
}
export function savePractice2048(storage: StorageAccess, game: Game2048): SaveResult {
  return saveEnvelope(storage, PRACTICE_2048_KEY, '2048', game, readLegacy2048);
}
export function loadPracticeSudoku(storage: StorageAccess): LoadResult<SudokuGame> {
  return readEnvelope(storage, PRACTICE_SUDOKU_KEY, 'sudoku', readLegacySudoku);
}
export function savePracticeSudoku(storage: StorageAccess, game: SudokuGame): SaveResult {
  // The original game clears undo history on reload; preserve that behavior and bound the save.
  return saveEnvelope(
    storage,
    PRACTICE_SUDOKU_KEY,
    'sudoku',
    { ...game, history: [] },
    readLegacySudoku,
  );
}
