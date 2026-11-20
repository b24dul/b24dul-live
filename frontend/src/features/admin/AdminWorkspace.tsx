import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { LockKeyhole, Shield } from 'lucide-react';
import { GlassPanel, PrimaryButton, SecondaryButton, StatusIndicator } from '../../components/ui';
import { useAccount } from '../../contexts/AccountContext';
import { useLiveStatus } from '../../contexts/LiveStatusContext';
import type { AdminRuntime } from '../../services/adminRuntime';
import type {
  Moderation,
  ModerationLog,
  Presence,
  PrivacyRequest,
  SeenUser,
  StatsDay,
  UserScores,
} from '../../services/adminService';
import type { ChatMessage, ChatSettings } from '../../services/chatService';
import { statsDay } from '../../services/dailyTotals';
import type { ScoreEntry, ScoreFlag } from '../../services/leaderboardService';
import { BOARDS, boardFor, formatScore, type BoardId } from '../games/leaderboardBoards';
import { ChatPanel } from '../chat/ChatPanel';
import { ADMIN_CHAT_NAME, chatNameFor } from '../chat/chatPolicy';
import { AdminAnalytics } from './AdminAnalytics';
import {
  ChatControls,
  ConfirmButton,
  dateTime,
  MessageActions,
  PersonActions,
  type Run,
} from './AdminShared';
import { AdminUsers } from './AdminUsers';
import { ChecklistTab, UpNextCard, type ChecklistData } from '../checklist/ChecklistAdmin';

export type LoadAdminRuntime = () => Promise<AdminRuntime>;
const loadFirebaseAdmin: LoadAdminRuntime = () =>
  import('../../services/adminRuntime').then((module) => module.startAdminRuntime());

/** Right column: people with chat open right now, with quick timeout and ban. */
function OnlineNow({
  presence,
  moderation,
  admins,
  runtime,
  run,
}: {
  presence: Presence;
  moderation: Moderation;
  admins: Set<string>;
  runtime: AdminRuntime;
  run: Run;
}) {
  const online = Object.entries(presence).sort((a, b) => b[1] - a[1]);
  return (
    <GlassPanel as="section" className="admin-column p-4" aria-labelledby="online-now">
      <h2 id="online-now" className="text-xl">
        Online now <span className="admin-count">{online.length}</span>
      </h2>
      <p className="text-xs text-slate-300">Signed-in people with the site open.</p>
      <ul className="flex flex-col gap-3" aria-label="People online now">
        {online.length === 0 && <li className="text-sm text-slate-300">Nobody right now.</li>}
        {online.map(([uid]) => {
          const name = admins.has(uid) ? ADMIN_CHAT_NAME : chatNameFor(uid);
          return (
            <li key={uid} className="admin-person">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{name}</strong>
                {(moderation.mutes[uid] ?? 0) > Date.now() && (
                  <StatusIndicator status="warning">Timed out</StatusIndicator>
                )}
                {moderation.bans[uid] !== undefined && (
                  <StatusIndicator status="danger">Banned</StatusIndicator>
                )}
              </div>
              {!admins.has(uid) && (
                <PersonActions
                  uid={uid}
                  name={name}
                  moderation={moderation}
                  runtime={runtime}
                  run={run}
                  compact
                />
              )}
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}

/** Left column: a small, muted preview just to confirm the stream is running. */
function StreamPreview() {
  const status = useLiveStatus();
  return (
    <GlassPanel as="section" className="admin-column p-4" aria-labelledby="stream-preview">
      <h2 id="stream-preview" className="text-xl">
        Stream
      </h2>
      {status.state === 'live' ? (
        <div className="admin-preview">
          <iframe
            title="Stream preview (muted)"
            src={`https://www.youtube-nocookie.com/embed/${status.videoId}?autoplay=1&mute=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="admin-preview admin-preview--off">
          {status.state === 'offline'
            ? 'Offline'
            : status.state === 'checking'
              ? 'Checking…'
              : 'Status unavailable'}
        </div>
      )}
      <p className="text-xs text-slate-300">Muted preview, YouTube privacy-enhanced mode.</p>
    </GlassPanel>
  );
}

/** Top strip: live status, viewers, chat on/off and today's visits. */
function TopStrip({
  settings,
  onlineCount,
  visitsToday,
  runtime,
  run,
}: {
  settings: ChatSettings;
  onlineCount: number;
  visitsToday: number | null;
  runtime: AdminRuntime;
  run: Run;
}) {
  const status = useLiveStatus();
  return (
    <section className="admin-strip" aria-label="Status">
      <div className="admin-stat">
        <span className="admin-stat-label">Stream</span>
        {status.state === 'live' ? (
          <span className="live-pill">
            <span className="live-dot" aria-hidden="true" /> LIVE
          </span>
        ) : (
          <span className="offline-pill">
            {status.state === 'offline'
              ? 'Offline'
              : status.state === 'checking'
                ? 'Checking…'
                : 'Unknown'}
          </span>
        )}
      </div>
      <div className="admin-stat">
        <span className="admin-stat-label">Viewers watching</span>
        <span
          className="admin-stat-value admin-stat-value--muted"
          title="YouTube does not share the live viewer count with the site"
        >
          Not available
        </span>
        <span className="text-xs text-slate-300">
          {status.state === 'live' ? (
            <span className="admin-live-count">{onlineCount}</span>
          ) : (
            onlineCount
          )}{' '}
          signed in on the site
        </span>
      </div>
      <div className="admin-stat">
        <span className="admin-stat-label">Chat</span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          className={settings.enabled ? 'admin-switch admin-switch--on' : 'admin-switch'}
          onClick={() =>
            void run(settings.enabled ? 'Chat turned off' : 'Chat turned on', () =>
              runtime.admin.setChatEnabled(!settings.enabled),
            )
          }
        >
          <span className="admin-switch-knob" aria-hidden="true" />
          Chat {settings.enabled ? 'on' : 'off'}
        </button>
      </div>
      <div className="admin-stat">
        <span className="admin-stat-label">Visits today</span>
        <span className="admin-stat-value">{visitsToday === null ? '…' : visitsToday}</span>
      </div>
    </section>
  );
}

type Tab = 'checklist' | 'users' | 'analytics' | 'leaderboards' | 'privacy';
const TABS: { id: Tab; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'users', label: 'Users' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'leaderboards', label: 'Leaderboards' },
  { id: 'privacy', label: 'Privacy requests' },
];

function Tabs({ panels }: { panels: Record<Tab, ReactNode> }) {
  const [tab, setTab] = useState<Tab>('checklist');
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(TABS[next]!.id);
    buttons.current[TABS[next]!.id]?.focus();
  }
  return (
    <GlassPanel as="section" className="admin-tabs p-4 sm:p-5" aria-label="Admin sections">
      <div role="tablist" aria-label="Admin sections" className="admin-tablist" onKeyDown={onKey}>
        {TABS.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            ref={(element) => {
              buttons.current[item.id] = element;
            }}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
        {panels[tab]}
      </div>
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
    <section className="flex flex-col gap-4" aria-labelledby="admin-lb">
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
    </section>
  );
}

const ACCOUNT_ID = /^[A-Za-z0-9]{10,128}$/;

function PrivacyLog({ runtime, run }: { runtime: AdminRuntime; run: Run }) {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [uid, setUid] = useState('');
  const [error, setError] = useState('');
  useEffect(() => runtime.admin.watchPrivacyRequests(setRequests), [runtime]);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="privacy-log">
      <h2 id="privacy-log" className="text-lg font-semibold">
        Privacy requests
      </h2>
      <p className="text-sm text-slate-300">
        Record a deletion request by account ID (from the person’s email). Completing it erases
        everything the new site holds for that ID: chat messages, timeouts, bans, online entries,
        the slow-mode stamp, leaderboard scores, first/last seen times and moderation history. The
        log keeps only the ID, status and dates. To delete the sign-in account itself, use Firebase
        console → Authentication.
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
    </section>
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
  const [users, setUsers] = useState<SeenUser[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [log, setLog] = useState<ModerationLog>({});
  const [scores, setScores] = useState<UserScores>({});
  const [days, setDays] = useState<StatsDay[] | null>(null);
  const [notice, setNotice] = useState('');
  const [checklists, setChecklists] = useState<ChecklistData>({
    lists: [],
    privates: {},
    active: null,
    template: null,
  });

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
      runtime.admin.watchUsers(setUsers),
      runtime.admin.watchMessageCounts(setCounts),
      runtime.admin.watchModerationLog(setLog),
      runtime.admin.watchAllScores(setScores),
      runtime.admin.watchStats(setDays, 30),
      runtime.checklists.watchLists((lists) => setChecklists((data) => ({ ...data, lists }))),
      runtime.checklists.watchPrivate((privates) =>
        setChecklists((data) => ({ ...data, privates })),
      ),
      runtime.checklists.watchActive((active) => setChecklists((data) => ({ ...data, active }))),
      runtime.checklists.watchPrompt((template) =>
        setChecklists((data) => ({ ...data, template })),
      ),
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
  const usersData = useMemo(
    () => ({
      users,
      counts,
      log,
      scores,
      presence,
      moderation,
      admins: admins ?? new Set<string>(),
    }),
    [users, counts, log, scores, presence, moderation, admins],
  );

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

  const today = days?.find((day) => day.day === statsDay())?.totals.visits ?? (days ? 0 : null);
  return (
    <div className="admin-centre">
      <p role="status" className="admin-notice" aria-live="polite">
        {notice || 'Signed in as admin. Changes apply immediately for everyone.'}
      </p>
      <UpNextCard data={checklists} tools={runtime.checklists} run={run} />
      <TopStrip
        settings={settings}
        onlineCount={Object.keys(presence).length}
        visitsToday={today}
        runtime={runtime}
        run={run}
      />
      <div className="admin-columns">
        <div className="admin-side-column">
          <StreamPreview />
          <ChatControls
            runtime={runtime}
            settings={settings}
            messageCount={messages.length}
            run={run}
          />
        </div>
        <div className="admin-chat-column">
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
        <OnlineNow
          presence={presence}
          moderation={moderation}
          admins={admins}
          runtime={runtime}
          run={run}
        />
      </div>
      <Tabs
        panels={{
          checklist: <ChecklistTab data={checklists} tools={runtime.checklists} run={run} />,
          users: <AdminUsers data={usersData} runtime={runtime} run={run} />,
          analytics: <AdminAnalytics days={days} />,
          leaderboards: <AdminLeaderboards runtime={runtime} run={run} />,
          privacy: <PrivacyLog runtime={runtime} run={run} />,
        }}
      />
    </div>
  );
}
