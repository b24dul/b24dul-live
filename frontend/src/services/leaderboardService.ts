// /v2/ leaderboards. Entries hold only a value and the server time under the account ID; names are
// generated from the ID when shown. The rules reject impossible values, keep one best per person
// per board, limit writes to one per 10 seconds and let only the admin delete.
import {
  get,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
  serverTimestamp,
  update,
  type Database,
} from 'firebase/database';
import type { BoardId } from '../features/games/leaderboardBoards';

export type ScoreEntry = { uid: string; value: number; ts: number };
export type ScoreFlag = { value: number; ts: number };
export type SubmitResult = 'new-best' | 'not-better' | 'failed';

const ROOT = 'v2';
const LIMIT = 10;
const ignore = () => {};

export function createLeaderboardService(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);

  return {
    /** Best entries first; at most `count` (the rules allow up to 50). */
    watchTop(
      board: BoardId,
      lowerWins: boolean,
      onEntries: (entries: ScoreEntry[]) => void,
      onError: () => void = ignore,
      count = LIMIT,
    ) {
      const ordered = query(
        at(`scores/${board}`),
        orderByChild('value'),
        lowerWins ? limitToFirst(count) : limitToLast(count),
      );
      return onValue(
        ordered,
        (snapshot) => {
          const entries: ScoreEntry[] = [];
          snapshot.forEach((child) => {
            entries.push({ uid: child.key!, ...(child.val() as Omit<ScoreEntry, 'uid'>) });
          });
          entries.sort((a, b) => (lowerWins ? a.value - b.value : b.value - a.value));
          onEntries(entries);
        },
        onError,
      );
    },

    /** The signed-in person's own best (only they and the admin can read it). */
    async myBest(board: BoardId, uid: string) {
      const snapshot = await get(at(`scores/${board}/${uid}`));
      return typeof snapshot.val()?.value === 'number' ? (snapshot.val().value as number) : null;
    },

    /**
     * Saves a new personal best. `flagged` adds an admin-only review hint in the same atomic write;
     * it never blocks the score.
     */
    async submit(board: BoardId, uid: string, value: number, flagged: boolean) {
      const entry = { value, ts: serverTimestamp() };
      await update(ref(database, ROOT), {
        [`scores/${board}/${uid}`]: entry,
        ...(flagged ? { [`scoreFlags/${board}/${uid}`]: entry } : {}),
      });
    },

    // Admin only (the rules refuse everyone else).
    watchFlags(board: BoardId, onFlags: (flags: Record<string, ScoreFlag>) => void) {
      return onValue(
        at(`scoreFlags/${board}`),
        (snapshot) => onFlags(snapshot.val() ?? {}),
        ignore,
      );
    },
    deleteScore(board: BoardId, uid: string) {
      return update(ref(database, ROOT), {
        [`scores/${board}/${uid}`]: null,
        [`scoreFlags/${board}/${uid}`]: null,
      });
    },
  };
}

export type LeaderboardService = ReturnType<typeof createLeaderboardService>;
