// Admin-only /v2/ operations. The database rules allow these only for accounts in /v2/admins;
// this module adds no access of its own.
import {
  equalTo,
  get,
  onValue,
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
const ignore = () => {};

export function createAdminService(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);

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
      if (ids.length)
        await update(at('chat/messages'), Object.fromEntries(ids.map((id) => [id, null])));
      return ids.length;
    },
    mute: (uid: string, minutes: number) =>
      set(at(`moderation/mutes/${uid}`), Date.now() + minutes * 60000),
    unmute: (uid: string) => remove(at(`moderation/mutes/${uid}`)),
    ban: (uid: string) => set(at(`moderation/bans/${uid}`), serverTimestamp()),
    unban: (uid: string) => remove(at(`moderation/bans/${uid}`)),

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
     * Erases everything /v2/ holds for an account (messages, moderation records, online entries and
     * slow-mode stamp) and completes the request, in one atomic write. The sign-in account itself
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
        [`privacyRequests/${request.id}/status`]: 'completed',
        [`privacyRequests/${request.id}/updatedAt`]: serverTimestamp(),
      });
      return ids.length;
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
