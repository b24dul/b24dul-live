// /v2/ chat, nicknames and presence. Public data holds only nicknames and UIDs; the database rules
// (firebase/v2.rules.json) enforce that, the slow mode and the moderation checks.
import {
  limitToLast,
  onDisconnect,
  onValue,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';

export type ChatMessage = { id: string; uid: string; text: string; ts: number; edited?: boolean };
export type ChatSettings = { enabled: boolean; pinned: { text: string; ts: number } | null };
export type OwnModeration = { banned: boolean; mutedUntil: number | null };

type Unsubscribe = () => void;
const ROOT = 'v2';
const MAX_MESSAGES_SHOWN = 100;
// Read errors (for example while offline) leave the last known value; messages report theirs.
const ignore = () => {};

export function createChatService(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);

  return {
    watchMessages(onMessages: (messages: ChatMessage[]) => void, onError: (error: Error) => void) {
      return onValue(
        query(at('chat/messages'), limitToLast(MAX_MESSAGES_SHOWN)),
        (snapshot) => {
          const messages: ChatMessage[] = [];
          snapshot.forEach((child) => {
            const value = child.val() as Omit<ChatMessage, 'id'>;
            if (value && typeof value.text === 'string')
              messages.push({ id: child.key!, ...value });
          });
          onMessages(messages);
        },
        onError,
      );
    },

    watchSettings(onSettings: (settings: ChatSettings) => void): Unsubscribe {
      return onValue(
        at('chat/settings'),
        (snapshot) => {
          const value = snapshot.val() ?? {};
          onSettings({ enabled: value.enabled !== false, pinned: value.pinned ?? null });
        },
        ignore,
      );
    },

    watchAdmins(onAdmins: (uids: Set<string>) => void): Unsubscribe {
      return onValue(
        at('admins'),
        (snapshot) => onAdmins(new Set(Object.keys(snapshot.val() ?? {}))),
        ignore,
      );
    },

    watchNickname(uid: string, onNickname: (nickname: string | null) => void): Unsubscribe {
      return onValue(
        at(`profiles/${uid}/nickname`),
        (snapshot) => onNickname(typeof snapshot.val() === 'string' ? snapshot.val() : null),
        ignore,
      );
    },

    /** A user's own ban and mute (only they and the admin can read them). */
    watchOwnModeration(uid: string, onModeration: (moderation: OwnModeration) => void) {
      const state: OwnModeration = { banned: false, mutedUntil: null };
      const stops = [
        onValue(
          at(`moderation/bans/${uid}`),
          (snapshot) => {
            state.banned = snapshot.exists();
            onModeration({ ...state });
          },
          ignore,
        ),
        onValue(
          at(`moderation/mutes/${uid}`),
          (snapshot) => {
            state.mutedUntil = typeof snapshot.val() === 'number' ? snapshot.val() : null;
            onModeration({ ...state });
          },
          ignore,
        ),
      ];
      return () => stops.forEach((stop) => stop());
    },

    /** Only the nickname is stored: never a Google name, email or photo. */
    setNickname(uid: string, nickname: string) {
      return set(at(`profiles/${uid}`), { nickname });
    },

    /** Message and slow-mode stamp in one atomic write. */
    async send(uid: string, text: string) {
      const key = push(at('chat/messages')).key;
      if (!key) throw new Error('Could not create a message ID');
      await update(ref(database), {
        [`${ROOT}/chat/messages/${key}`]: { uid, text, ts: serverTimestamp() },
        [`${ROOT}/chat/lastPost/${uid}`]: serverTimestamp(),
      });
      return key;
    },

    /** One presence entry per open connection; removed by the server when the connection drops. */
    startPresence(uid: string): Unsubscribe {
      const connection = push(at(`presence/${uid}`));
      let active = true;
      const stop = onValue(ref(database, '.info/connected'), (snapshot) => {
        if (snapshot.val() !== true || !active) return;
        onDisconnect(connection)
          .remove()
          .then(() => (active ? set(connection, serverTimestamp()) : undefined))
          .catch(() => {});
      });
      return () => {
        active = false;
        stop();
        void set(connection, null).catch(() => {});
      };
    },
  };
}

export type ChatService = ReturnType<typeof createChatService>;
