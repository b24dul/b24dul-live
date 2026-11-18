import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole, Shield } from 'lucide-react';
import { GlassPanel, PrimaryButton, SecondaryButton, StatusIndicator } from '../../components/ui';
import { PublishedStreamStatus } from '../../components/PublishedStreamStatus';
import { useAccount } from '../../contexts/AccountContext';
import type { AdminRuntime } from '../../services/adminRuntime';
import type { Moderation, Presence, PrivacyRequest } from '../../services/adminService';
import type { ChatMessage, ChatSettings } from '../../services/chatService';
import type { ScoreEntry, ScoreFlag } from '../../services/leaderboardService';
import { BOARDS, boardFor, formatScore, type BoardId } from '../games/leaderboardBoards';
import { ChatPanel } from '../chat/ChatPanel';
import {
  ADMIN_CHAT_NAME,
  chatNameFor,
  cleanMessage,
  MAX_MESSAGE_LENGTH,
  MUTE_MINUTES,
} from '../chat/chatPolicy';

export type LoadAdminRuntime = () => Promise<AdminRuntime>;
const loadFirebaseAdmin: LoadAdminRuntime = () =>
  import('../../services/adminRuntime').then((module) => module.startAdminRuntime());

/** Runs an admin action, reports "done" or "failed", and resolves to whether it worked. */
type Run = (label: string, action: () => Promise<unknown>) => Promise<boolean>;

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** A destructive action needs a second, explicit click. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  small = false,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  small?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const size = small ? 'admin-small-button' : '';
  if (!asking)
    return (
      <SecondaryButton className={size} onClick={() => setAsking(true)}>
        {label}
      </SecondaryButton>
    );
  return (
    <span className="inline-flex flex-wrap gap-2">
      <PrimaryButton
        className={`admin-danger ${size}`}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </PrimaryButton>
      <SecondaryButton className={size} onClick={() => setAsking(false)}>
        Cancel
      </SecondaryButton>
    </span>
  );
}

function PersonActions({
  uid,
  name,
  moderation,
  runtime,
  run,
}: {
  uid: string;
  name: string;
  moderation: Moderation;
  runtime: AdminRuntime;
  run: Run;
}) {
  const [minutes, setMinutes] = useState<number>(MUTE_MINUTES[1]);
  const mutedUntil = moderation.mutes[uid];
  const muted = mutedUntil !== undefined && mutedUntil > Date.now();
  const banned = moderation.bans[uid] !== undefined;
  const { admin } = runtime;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {muted ? (
        <SecondaryButton
          className="admin-small-button"
          onClick={() => void run(`lifted ${name}’s timeout`, () => admin.unmute(uid))}
        >
          Lift timeout (until {time.format(mutedUntil)})
        </SecondaryButton>
      ) : (
        <span className="inline-flex gap-2">
          <label className="sr-only" htmlFor={`mute-${uid}`}>
            Timeout length for {name}
          </label>
          <select
            id={`mute-${uid}`}
            className="admin-select"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          >
            {MUTE_MINUTES.map((option) => (
              <option key={option} value={option}>
                {option} min
              </option>
            ))}
          </select>
          <SecondaryButton
            className="admin-small-button"
            onClick={() =>
              void run(`timed out ${name} for ${minutes} min`, () => admin.mute(uid, minutes))
            }
          >
            Timeout
          </SecondaryButton>
        </span>
      )}
      {banned ? (
        <SecondaryButton
          className="admin-small-button"
          onClick={() => void run(`unbanned ${name}`, () => admin.unban(uid))}
        >
          Unban
        </SecondaryButton>
      ) : (
        <ConfirmButton
          small
          label="Ban"
          confirmLabel={`Ban ${name}`}
          onConfirm={() => void run(`banned ${name}`, () => admin.ban(uid))}
        />
      )}
      <ConfirmButton
        small
        label="Delete all their messages"
        confirmLabel={`Delete all from ${name}`}
        onConfirm={() =>
          void run(`deleted ${name}’s messages`, async () => {
            const count = await admin.deleteAllMessagesFrom(uid);
            return count;
          })
        }
      />
    </div>
  );
}

function MessageActions({
  message,
  name,
  isAdminAuthor,
  moderation,
  pinnedText,
  runtime,
  run,
}: {
  message: ChatMessage;
  name: string;
  isAdminAuthor: boolean;
  moderation: Moderation;
  pinnedText: string | null;
  runtime: AdminRuntime;
  run: Run;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = cleanMessage(text);
    if (!cleaned || cleaned.length > MAX_MESSAGE_LENGTH) return;
    setEditing(false);
    void run('message edited', () => runtime.admin.editMessage(message.id, cleaned));
  }
  return (
    <details className="admin-message-actions">
      <summary>Moderate</summary>
      <div className="mt-2 flex flex-col gap-2">
        {editing ? (
          <form className="flex flex-wrap gap-2" onSubmit={save}>
            <label className="sr-only" htmlFor={`edit-${message.id}`}>
              Edit message
            </label>
            <input
              id={`edit-${message.id}`}
              className="admin-input min-w-0 flex-1"
              maxLength={MAX_MESSAGE_LENGTH}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <PrimaryButton className="admin-small-button" type="submit">
              Save
            </PrimaryButton>
            <SecondaryButton className="admin-small-button" onClick={() => setEditing(false)}>
              Cancel
            </SecondaryButton>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton className="admin-small-button" onClick={() => setEditing(true)}>
              Edit
            </SecondaryButton>
            {pinnedText === message.text ? (
              <SecondaryButton
                className="admin-small-button"
                onClick={() => void run('unpinned', () => runtime.admin.unpin())}
              >
                Unpin
              </SecondaryButton>
            ) : (
              <SecondaryButton
                className="admin-small-button"
                onClick={() => void run('message pinned', () => runtime.admin.pin(message.text))}
              >
                Pin
              </SecondaryButton>
            )}
            <ConfirmButton
              small
              label="Delete"
              confirmLabel="Delete message"
              onConfirm={() =>
                void run('message deleted', () => runtime.admin.deleteMessage(message.id))
              }
            />
          </div>
        )}
        {!isAdminAuthor && (
          <PersonActions
            uid={message.uid}
            name={name}
            moderation={moderation}
            runtime={runtime}
            run={run}
          />
        )}
      </div>
    </details>
  );
}

function ChatControls({
  runtime,
  settings,
  messageCount,
  run,
}: {
  runtime: AdminRuntime;
  settings: ChatSettings;
  messageCount: number;
  run: Run;
}) {
  const [pinText, setPinText] = useState('');
  const [pinError, setPinError] = useState('');
  const { admin } = runtime;
  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="chat-controls">
      <h2 id="chat-controls" className="text-lg font-semibold">
        Chat controls
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <StatusIndicator status={settings.enabled ? 'success' : 'warning'}>
          Chat is {settings.enabled ? 'on' : 'off'}
        </StatusIndicator>
        <SecondaryButton
          onClick={() =>
            void run(settings.enabled ? 'Chat turned off' : 'Chat turned on', () =>
              admin.setChatEnabled(!settings.enabled),
            )
          }
        >
          {settings.enabled ? 'Turn chat off' : 'Turn chat on'}
        </SecondaryButton>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = pinText.trim();
          if (!text) return setPinError('Type the announcement in the box first.');
          setPinError('');
          void run('message pinned', () => admin.pin(text)).then((ok) => ok && setPinText(''));
        }}
      >
        <label className="text-sm font-semibold" htmlFor="pin-text">
          Pinned message
        </label>
        {settings.pinned && (
          <p className="text-sm text-slate-300">Currently pinned: “{settings.pinned.text}”</p>
        )}
        <input
          id="pin-text"
          className="admin-input"
          maxLength={MAX_MESSAGE_LENGTH}
          aria-describedby="pin-help pin-error"
          value={pinText}
          onChange={(event) => {
            setPinText(event.target.value);
            setPinError('');
          }}
        />
        <p id="pin-help" className="text-xs text-slate-300">
          Type an announcement, or use “Pin” under Moderate on any chat message.
        </p>
        <p id="pin-error" role="alert" className="text-sm text-red-200">
          {pinError}
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit">Pin announcement</PrimaryButton>
          {settings.pinned && (
            <SecondaryButton onClick={() => void run('unpinned', () => admin.unpin())}>
              Unpin
            </SecondaryButton>
          )}
        </div>
      </form>
      <div>
        <ConfirmButton
          label="Clear chat"
          confirmLabel={`Delete every message (${messageCount} shown)`}
          onConfirm={() => void run('chat cleared', () => admin.clearChat())}
        />
      </div>
    </GlassPanel>
  );
}

type Person = {
  uid: string;
  name: string;
  online: boolean;
  lastMessage: number | null;
  messages: number;
  muted: boolean;
  banned: boolean;
};
type Filter = 'all' | 'online' | 'recent' | 'muted' | 'banned';
const PAGE_SIZE = 20;

function People({
  runtime,
  messages,
  presence,
  moderation,
  admins,
  run,
}: {
  runtime: AdminRuntime;
  messages: ChatMessage[];
  presence: Presence;
  moderation: Moderation;
  admins: Set<string>;
  run: Run;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const people = useMemo(() => {
    const byUid = new Map<string, Person>();
    const now = Date.now();
    const person = (uid: string) => {
      let found = byUid.get(uid);
      if (!found) {
        found = {
          uid,
          name: admins.has(uid) ? ADMIN_CHAT_NAME : chatNameFor(uid),
          online: false,
          lastMessage: null,
          messages: 0,
          muted: (moderation.mutes[uid] ?? 0) > now,
          banned: moderation.bans[uid] !== undefined,
        };
        byUid.set(uid, found);
      }
      return found;
    };
    for (const message of messages) {
      const found = person(message.uid);
      found.messages += 1;
      found.lastMessage = Math.max(found.lastMessage ?? 0, message.ts);
    }
    for (const uid of Object.keys(presence)) person(uid).online = true;
    for (const uid of Object.keys(moderation.mutes)) person(uid);
    for (const uid of Object.keys(moderation.bans)) person(uid);
    return [...byUid.values()].sort(
      (a, b) => Number(b.online) - Number(a.online) || (b.lastMessage ?? 0) - (a.lastMessage ?? 0),
    );
  }, [messages, presence, moderation, admins]);

  const term = search.trim().toLowerCase();
  const shown = people.filter(
    (person) =>
      (filter === 'all' ||
        (filter === 'online' && person.online) ||
        (filter === 'recent' && person.lastMessage !== null) ||
        (filter === 'muted' && person.muted) ||
        (filter === 'banned' && person.banned)) &&
      (!term ||
        person.name.toLowerCase().includes(term) ||
        person.uid.toLowerCase().includes(term)),
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const onlineCount = people.filter((person) => person.online).length;

  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="people-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="people-title" className="text-lg font-semibold">
          People
        </h2>
        <StatusIndicator status="neutral">{onlineCount} online with chat open</StatusIndicator>
      </div>
      <p className="text-sm text-slate-300">
        People who are online, posted in the last 100 messages, or are timed out or banned. Names
        are generated from account IDs; no real names exist here.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Search name or account ID
          <input
            className="admin-input"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Show
          <select
            className="admin-select"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as Filter);
              setPage(0);
            }}
          >
            <option value="all">Everyone</option>
            <option value="online">Online now</option>
            <option value="recent">Recently posted</option>
            <option value="muted">Timed out</option>
            <option value="banned">Banned</option>
          </select>
        </label>
      </div>
      <ul className="flex flex-col gap-3" aria-label="People">
        {shown.length === 0 && <li className="text-sm text-slate-300">Nobody matches.</li>}
        {shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((person) => (
          <li key={person.uid} className="admin-person">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{person.name}</strong>
              <code className="break-all text-xs text-slate-400">{person.uid}</code>
              {person.online && <StatusIndicator status="success">Online</StatusIndicator>}
              {person.muted && <StatusIndicator status="warning">Timed out</StatusIndicator>}
              {person.banned && <StatusIndicator status="danger">Banned</StatusIndicator>}
              {person.messages > 0 && (
                <span className="text-xs text-slate-300">
                  {person.messages} recent message{person.messages === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {!admins.has(person.uid) && (
              <PersonActions
                uid={person.uid}
                name={person.name}
                moderation={moderation}
                runtime={runtime}
                run={run}
              />
            )}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex items-center gap-3">
          <SecondaryButton disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </SecondaryButton>
          <span className="text-sm">
            Page {current + 1} of {pages}
          </span>
          <SecondaryButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Next
          </SecondaryButton>
        </div>
      )}
    </GlassPanel>
  );
}

function AdminLeaderboards({ runtime, run }: { runtime: AdminRuntime; run: Run }) {
  const [boardId, setBoardId] = useState<BoardId>('g2048');
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [flags, setFlags] = useState<Record<string, ScoreFlag>>({});
  const board = boardFor(boardId);
  useEffect(() => {
    setEntries(null);
    const stops = [
      runtime.leaderboards.watchTop(boardId, board.lowerWins, setEntries, () => {}, 50),
      runtime.leaderboards.watchFlags(boardId, setFlags),
    ];
    return () => stops.forEach((stop) => stop());
  }, [runtime, boardId, board.lowerWins]);
  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="admin-lb">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-lb" className="text-lg font-semibold">
          Leaderboards
        </h2>
        <label className="flex items-center gap-2 text-sm">
          Board
          <select
            className="admin-select"
            value={boardId}
            onChange={(event) => setBoardId(event.target.value as BoardId)}
          >
            {BOARDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-300">
        Top 50. “Dev tools seemed open” means the browser window looked like developer tools were
        docked during that game. It is a hint to review, not proof, and players never see it.
      </p>
      <ol className="flex flex-col gap-2" aria-label={`${board.label} scores`}>
        {entries === null && <li className="text-sm text-slate-300">Loading…</li>}
        {entries?.length === 0 && <li className="text-sm text-slate-300">No scores yet.</li>}
        {entries?.map((entry, index) => {
          const name = chatNameFor(entry.uid);
          const flagged = flags[entry.uid]?.value === entry.value;
          return (
            <li key={entry.uid} className="admin-person">
              <div className="flex flex-wrap items-center gap-2">
                <span className="leaderboard-rank">{index + 1}</span>
                <strong>{name}</strong>
                <span className="font-semibold">{formatScore(board, entry.value)}</span>
                <code className="break-all text-xs text-slate-400">{entry.uid}</code>
                {flagged && (
                  <StatusIndicator status="warning">Dev tools seemed open</StatusIndicator>
                )}
              </div>
              <div>
                <ConfirmButton
                  small
                  label="Delete score"
                  confirmLabel={`Delete ${name}’s score`}
                  onConfirm={() =>
                    void run(`deleted ${name}’s score`, () =>
                      runtime.leaderboards.deleteScore(boardId, entry.uid),
                    )
                  }
                />
              </div>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}

const ACCOUNT_ID = /^[A-Za-z0-9]{10,128}$/;

function PrivacyLog({ runtime, run }: { runtime: AdminRuntime; run: Run }) {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [uid, setUid] = useState('');
  const [error, setError] = useState('');
  useEffect(() => runtime.admin.watchPrivacyRequests(setRequests), [runtime]);
  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="privacy-log">
      <h2 id="privacy-log" className="text-lg font-semibold">
        Privacy requests
      </h2>
      <p className="text-sm text-slate-300">
        Record a deletion request by account ID (from the person’s email). Completing it erases
        everything the new site holds for that ID: chat messages, timeouts, bans, online entries,
        the slow-mode stamp and leaderboard scores. The log keeps only the ID, status and dates. To
        delete the sign-in account itself, use Firebase console → Authentication. Old-site requests
        stay on the old site.
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const value = uid.trim();
          if (!ACCOUNT_ID.test(value)) return setError('Enter a valid account ID.');
          setError('');
          void run('request recorded', () => runtime.admin.recordPrivacyRequest(value)).then(() =>
            setUid(''),
          );
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Account ID
          <input
            className="admin-input"
            autoComplete="off"
            value={uid}
            onChange={(event) => setUid(event.target.value)}
          />
        </label>
        <PrimaryButton type="submit">Record request</PrimaryButton>
        <span role="alert" className="text-sm text-red-200">
          {error}
        </span>
      </form>
      <ul className="flex flex-col gap-3" aria-label="Privacy requests">
        {requests.length === 0 && <li className="text-sm text-slate-300">No requests.</li>}
        {requests.map((request) => (
          <li key={request.id} className="admin-person">
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all text-xs">{request.uid}</code>
              <StatusIndicator
                status={
                  request.status === 'completed'
                    ? 'success'
                    : request.status === 'processing'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {request.status}
              </StatusIndicator>
              <span className="text-xs text-slate-300">
                received {dateTime.format(request.createdAt)}
                {request.status !== 'pending' && ` · updated ${dateTime.format(request.updatedAt)}`}
              </span>
            </div>
            {request.status !== 'completed' && (
              <div className="flex flex-wrap gap-2">
                {request.status === 'pending' && (
                  <SecondaryButton
                    className="admin-small-button"
                    onClick={() =>
                      void run('marked processing', () => runtime.admin.markProcessing(request.id))
                    }
                  >
                    Mark processing
                  </SecondaryButton>
                )}
                <ConfirmButton
                  small
                  label="Complete and erase data"
                  confirmLabel="Erase this account’s data now"
                  onConfirm={() =>
                    void run('request completed and data erased', () =>
                      runtime.admin.completeAndErase(request),
                    )
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

function Restricted({ children }: { children: ReactNode }) {
  return (
    <GlassPanel className="p-7 sm:p-10">
      <Shield size={36} className="text-brand-violet" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold">Admin only</h2>
      <div className="mt-3 max-w-2xl text-slate-300">{children}</div>
      <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
        <LockKeyhole size={17} aria-hidden="true" /> The database rules allow these tools only for
        the admin account, whatever this page shows.
      </div>
    </GlassPanel>
  );
}

export function AdminWorkspace({
  loadRuntime = loadFirebaseAdmin,
}: {
  loadRuntime?: LoadAdminRuntime;
}) {
  const account = useAccount();
  const { start } = account;
  const [runtime, setRuntime] = useState<AdminRuntime | null>(null);
  const [failed, setFailed] = useState(false);
  const [admins, setAdmins] = useState<Set<string> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<ChatSettings>({ enabled: true, pinned: null });
  const [presence, setPresence] = useState<Presence>({});
  const [moderation, setModeration] = useState<Moderation>({ bans: {}, mutes: {} });
  const [notice, setNotice] = useState('');

  useEffect(() => start(), [start]);
  useEffect(() => {
    let cancelled = false;
    loadRuntime().then(
      (loaded) => !cancelled && setRuntime(loaded),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [loadRuntime]);
  useEffect(() => (runtime ? runtime.chat.watchAdmins(setAdmins) : undefined), [runtime]);

  const identity = account.session.status === 'ready' ? account.session.identity : null;
  const uid = identity && 'uid' in identity ? identity.uid : null;
  const isAdmin = Boolean(uid && admins?.has(uid) && identity?.kind === 'google');

  useEffect(() => {
    if (!runtime || !isAdmin) return;
    const stops = [
      runtime.chat.watchMessages(setMessages, () => {}),
      runtime.chat.watchSettings(setSettings),
      runtime.admin.watchPresence(setPresence),
      runtime.admin.watchModeration(setModeration),
    ];
    return () => stops.forEach((stop) => stop());
  }, [runtime, isAdmin]);

  const run = useCallback<Run>(async (label, action) => {
    try {
      await action();
      setNotice(`Done: ${label}.`);
      return true;
    } catch {
      setNotice(`Failed: ${label} — the database refused it or the connection dropped.`);
      return false;
    }
  }, []);
  const chatService = useMemo(() => (runtime ? async () => runtime.chat : undefined), [runtime]);

  if (failed)
    return <Restricted>The admin tools could not be loaded. Check your connection.</Restricted>;
  const signedInWithGoogle = identity?.kind === 'google';
  if (!identity || (signedInWithGoogle && (!runtime || admins === null)))
    return <p className="text-slate-300">Checking admin access…</p>;
  if (!isAdmin || !runtime || !admins)
    return (
      <Restricted>
        <p>Sign in with the B24DUL Google account to use the moderation tools.</p>
        {!signedInWithGoogle && (
          <PrimaryButton
            className="mt-4"
            disabled={account.pending}
            onClick={account.signInWithGoogle}
          >
            Sign in with Google
          </PrimaryButton>
        )}
      </Restricted>
    );

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="admin-notice" aria-live="polite">
        {notice || 'Signed in as admin. Changes apply immediately for everyone.'}
      </p>
      <PublishedStreamStatus />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatPanel
            loadService={chatService}
            renderActions={(message, name) => (
              <MessageActions
                key={message.id + message.text}
                message={message}
                name={name}
                isAdminAuthor={admins.has(message.uid)}
                moderation={moderation}
                pinnedText={settings.pinned?.text ?? null}
                runtime={runtime}
                run={run}
              />
            )}
          />
        </div>
        <ChatControls
          runtime={runtime}
          settings={settings}
          messageCount={messages.length}
          run={run}
        />
      </div>
      <People
        runtime={runtime}
        messages={messages}
        presence={presence}
        moderation={moderation}
        admins={admins}
        run={run}
      />
      <AdminLeaderboards runtime={runtime} run={run} />
      <PrivacyLog runtime={runtime} run={run} />
    </div>
  );
}
