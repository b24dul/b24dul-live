import { useEffect, useState } from 'react';
import type { LoadResult, SaveResult, StorageAccess } from './gameSaves';

export type SaveProblem = 'unreadable' | 'unavailable' | null;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Restores the game saved in this browser and saves every change automatically. A save this
 * version can't read (corrupt, or from a newer version) is never overwritten.
 */
export function useSavedGame<T>(
  load: (storage: StorageAccess) => LoadResult<T>,
  save: (storage: StorageAccess, game: T) => SaveResult,
  /** A game this matches (e.g. a lost Sudoku) is removed from the browser instead of saved. */
  discard?: { when: (game: T) => boolean; clear: (storage: Storage) => void },
) {
  const [initial] = useState(() => {
    const store = storage();
    return store ? load(store) : ({ status: 'unavailable' } as const);
  });
  const [game, setGame] = useState<T | null>(initial.status === 'ready' ? initial.game : null);
  const [problem, setProblem] = useState<SaveProblem>(
    initial.status === 'invalid' ? 'unreadable' : null,
  );

  useEffect(() => {
    if (game === null || problem === 'unreadable') return;
    const store = storage();
    if (discard?.when(game)) {
      try {
        if (store) discard.clear(store);
      } catch {
        // Nothing more to do: the game is over either way.
      }
      return;
    }
    const result = store ? save(store, game) : 'unavailable';
    const next: SaveProblem =
      result === 'saved' ? null : result === 'unrecognized' ? 'unreadable' : 'unavailable';
    // Only changes when saving starts or stops working, so this can't loop.
    if (next !== problem) setProblem(next);
  }, [game, problem, save, discard]);

  return { game, setGame, restored: initial.status === 'ready', problem };
}

export function saveProblemText(problem: SaveProblem) {
  if (problem === 'unreadable')
    return 'This browser has a saved game this version can’t read, so it’s been left untouched and this game isn’t being saved.';
  if (problem === 'unavailable')
    return 'This browser isn’t letting the site save, so this game won’t be kept if you leave.';
  return 'Your game saves automatically in this browser.';
}
