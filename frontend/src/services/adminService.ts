// Admin-only /v2/ operations. The database rules allow these only for accounts in /v2/admins;
// this module adds no access of its own.
import type { DayTotals } from './dailyTotals';
import {
  equalTo,
  get,
  limitToLast,
  onValue,
  orderByKey,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';

export type Moderation = { bans: Record<string, number>; mutes: Record<string, number> };
export type Presence = Record<string, number>; // uid -> most recent connection time
export type PrivacyStatus = 'pending' | 'processing' | 'completed';
export type PrivacyRequest = {
  id: string;
  uid: string;
  status: PrivacyStatus;
  createdAt: number;
  updatedAt: number;
};

const ROOT = 'v2';
/** Leaderboard boards (kept equal to BOARDS in features/games/leaderboardBoards.ts by a unit test). */
export type StatsDay = { day: string; totals: DayTotals };
/** When a Google-signed-in account was first and last seen. Nothing else is kept. */
export type SeenUser = { uid: string; firstSeen: number; lastSeen: number };
export type ModerationAction = 'timeout' | 'untimeout' | 'ban' | 'unban' | 'deleteMessages';
export type ModerationEntry = {
  id: string;
  action: ModerationAction;
  at: number;
  until?: number;
  count?: number;
};
export type ModerationLog = Record<string, ModerationEntry[]>; // uid -> newest first
export type UserScores = Record<string, Partial<Record<string, number>>>; // uid -> board -> value

export const ERASE_BOARD_IDS = ['sudoku-easy', 'sudoku-medium', 'sudoku-hard', 'g2048'];
const ignore = () => {};

export function createAdminService(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);

  /** One history entry, written in the same atomic update as the action itself. */
  function logged(uid: string, entry: Omit<ModerationEntry, 'id' | 'at'>) {
    const key = push(at(`moderationLog/${uid}`)).key!;
    return { [`moderationLog/${uid}/${key}`]: { ...entry, at: serverTimestamp() } };
  }
  const write = (updates: Record<string, unknown>) => update(ref(database, ROOT), updates);

  async function messageIdsFrom(uid: string) {
    const snapshot = await get(query(at('chat/messages'), orderByChild('uid'), equalTo(uid)));
    return Object.keys(snapshot.val() ?? {});
  }

  return {
    // Chat
    setChatEnabled: (enabled: boolean) => set(at('chat/settings/enabled'), enabled),
    pin: (text: string) => set(at('chat/settings/pinned'), { text, ts: serverTimestamp() }),
    unpin: () => remove(at('chat/settings/pinned')),
    clearChat: () => remove(at('chat/messages')),
    editMessage: (id: string, text: string) =>
      update(at(`chat/messages/${id}`), { text, edited: true }),
    deleteMessage: (id: string) => remove(at(`chat/messages/${id}`)),

    // People
    async deleteAllMessagesFrom(uid: string) {
      const ids = await messageIdsFrom(uid);
      await write({
        ...Object.fromEntries(ids.map((id) => [`chat/messages/${id}`, null])),
        ...logged(uid, { action: 'deleteMessages', count: ids.length }),
      });
      return ids.length;
    },
    mute(uid: string, minutes: number) {
      const until = Date.now() + minutes * 60000;
      return write({
        [`moderation/mutes/${uid}`]: until,
        ...logged(uid, { action: 'timeout', until }),
      });
    },
    unmute: (uid: string) =>
      write({ [`moderation/mutes/${uid}`]: null, ...logged(uid, { action: 'untimeout' }) }),
    ban: (uid: string) =>
      write({ [`moderation/bans/${uid}`]: serverTimestamp(), ...logged(uid, { action: 'ban' }) }),
    unban: (uid: string) =>
      write({ [`moderation/bans/${uid}`]: null, ...logged(uid, { action: 'unban' }) }),

    watchModeration(onModeration: (moderation: Moderation) => void) {
      return onValue(
        at('moderation'),
        (snapshot) => {
          const value = snapshot.val() ?? {};
          onModeration({ bans: value.bans ?? {}, mutes: value.mutes ?? {} });
        },
        ignore,
      );
    },

    /** Daily totals for the most recent days (newest first). Totals only; nothing per person. */
    watchStats(onDays: (days: StatsDay[]) => void, days = 30) {
      return onValue(
        query(at('stats/days'), orderByKey(), limitToLast(days)),
        (snapshot) => {
          const result: StatsDay[] = [];
          snapshot.forEach((day) => {
            result.unshift({ day: day.key!, totals: (day.val() ?? {}) as DayTotals });
          });
          onDays(result);
        },
        () => onDays([]),
      );
    },
    /** Every Google-signed-in account the site has seen, with first/last seen times. */
    watchUsers(onUsers: (users: SeenUser[]) => void) {
      return onValue(
        at('users'),
        (snapshot) => {
          const users: SeenUser[] = [];
          snapshot.forEach((child) => {
            const value = child.val() as Omit<SeenUser, 'uid'>;
            users.push({ uid: child.key!, firstSeen: value.firstSeen, lastSeen: value.lastSeen });
          });
          onUsers(users.sort((a, b) => b.lastSeen - a.lastSeen));
        },
        () => onUsers([]),
      );
    },

    /** Chat messages per account, over all stored messages (admins can read them all). */
    watchMessageCounts(onCounts: (counts: Record<string, number>) => void) {
      return onValue(
        at('chat/messages'),
        (snapshot) => {
          const counts: Record<string, number> = {};
          snapshot.forEach((child) => {
            const uid = (child.val() as { uid?: string }).uid;
            if (uid) counts[uid] = (counts[uid] ?? 0) + 1;
          });
          onCounts(counts);
        },
        ignore,
      );
    },

    /** Timeouts, bans, unbans and message deletions, newest first per account. */
    watchModerationLog(onLog: (log: ModerationLog) => void) {
      return onValue(
        at('moderationLog'),
        (snapshot) => {
          const log: ModerationLog = {};
          snapshot.forEach((person) => {
            const entries: ModerationEntry[] = [];
            person.forEach((entry) => {
              entries.push({ id: entry.key!, ...(entry.val() as Omit<ModerationEntry, 'id'>) });
            });
            log[person.key!] = entries.sort((a, b) => b.at - a.at);
          });
          onLog(log);
        },
        ignore,
      );
    },

    /** Everyone's best score on each board (admins may read whole boards). */
    watchAllScores(onScores: (scores: UserScores) => void) {
      const scores: UserScores = {};
      const stops = ERASE_BOARD_IDS.map((board) =>
        onValue(
          at(`scores/${board}`),
          (snapshot) => {
            for (const uid of Object.keys(scores)) delete scores[uid]![board];
            snapshot.forEach((child) => {
              (scores[child.key!] ??= {})[board] = (child.val() as { value: number }).value;
            });
            onScores({ ...scores });
          },
          ignore,
        ),
      );
      return () => stops.forEach((stop) => stop());
    },

    watchPresence(onPresence: (presence: Presence) => void) {
      return onValue(
        at('presence'),
        (snapshot) => {
          const presence: Presence = {};
          snapshot.forEach((user) => {
            const times = Object.values((user.val() ?? {}) as Record<string, number>);
            if (times.length) presence[user.key!] = Math.max(...times);
          });
          onPresence(presence);
        },
        ignore,
      );
    },

    // Privacy requests: a log of account IDs and statuses only (no names, emails or notes).
    watchPrivacyRequests(onRequests: (requests: PrivacyRequest[]) => void) {
      return onValue(
        at('privacyRequests'),
        (snapshot) => {
          const requests: PrivacyRequest[] = [];
          snapshot.forEach((child) => {
            requests.push({ id: child.key!, ...(child.val() as Omit<PrivacyRequest, 'id'>) });
          });
          onRequests(requests.sort((a, b) => b.createdAt - a.createdAt));
        },
        ignore,
      );
    },
    recordPrivacyRequest: (uid: string) =>
      set(push(at('privacyRequests')), {
        uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    markProcessing: (id: string) =>
      update(at(`privacyRequests/${id}`), { status: 'processing', updatedAt: serverTimestamp() }),

    /**
     * Erases everything /v2/ holds for an account (messages, moderation records and history,
     * first/last seen, online entries, slow-mode stamp, leaderboard scores and review flags) and completes the request, in one atomic write. The sign-in account itself
     * can only be deleted in the Firebase console.
     */
    async completeAndErase(request: PrivacyRequest) {
      const ids = await messageIdsFrom(request.uid);
      await update(ref(database, ROOT), {
        ...Object.fromEntries(ids.map((id) => [`chat/messages/${id}`, null])),
        [`moderation/bans/${request.uid}`]: null,
        [`moderation/mutes/${request.uid}`]: null,
        [`presence/${request.uid}`]: null,
        [`chat/lastPost/${request.uid}`]: null,
        [`users/${request.uid}`]: null,
        [`moderationLog/${request.uid}`]: null,
        ...Object.fromEntries(
          ERASE_BOARD_IDS.flatMap((board) => [
            [`scores/${board}/${request.uid}`, null],
            [`scoreFlags/${board}/${request.uid}`, null],
          ]),
        ),
        [`privacyRequests/${request.id}/status`]: 'completed',
        [`privacyRequests/${request.id}/updatedAt`]: serverTimestamp(),
      });
      return ids.length;
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
