import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { SecondaryButton, StatusIndicator } from '../../components/ui';
import type { AdminRuntime } from '../../services/adminRuntime';
import type {
  Moderation,
  ModerationEntry,
  ModerationLog,
  Presence,
  SeenUser,
  UserScores,
} from '../../services/adminService';
import { ADMIN_CHAT_NAME, chatNameFor } from '../chat/chatPolicy';
import { BOARDS, boardFor, formatScore } from '../games/leaderboardBoards';
import { dateTime, PersonActions, type Run } from './AdminShared';

export type UsersData = {
  users: SeenUser[];
  counts: Record<string, number>;
  log: ModerationLog;
  scores: UserScores;
  presence: Presence;
  moderation: Moderation;
  admins: Set<string>;
};

type Row = {
  uid: string;
  name: string;
  firstSeen: number | null;
  lastSeen: number | null;
  messages: number;
  history: ModerationEntry[];
  scores: Partial<Record<string, number>>;
  online: boolean;
  muted: boolean;
  banned: boolean;
  admin: boolean;
};

const PAGE_SIZE = 25;
const ACTION_LABEL: Record<ModerationEntry['action'], string> = {
  timeout: 'Timed out',
  untimeout: 'Timeout lifted',
  ban: 'Banned',
  unban: 'Unbanned',
  deleteMessages: 'Messages deleted',
};

const when = (value: number | null) => (value ? dateTime.format(value) : '—');

/** Everyone the site knows: seen accounts, plus anyone with messages, scores or moderation. */
export function buildRows(data: UsersData): Row[] {
  const now = Date.now();
  const uids = new Set<string>([
    ...data.users.map((user) => user.uid),
    ...Object.keys(data.counts),
    ...Object.keys(data.log),
    ...Object.keys(data.scores),
    ...Object.keys(data.moderation.bans),
    ...Object.keys(data.moderation.mutes),
    ...Object.keys(data.presence),
  ]);
  const seen = new Map(data.users.map((user) => [user.uid, user]));
  return [...uids]
    .map((uid) => {
      const admin = data.admins.has(uid);
      return {
        uid,
        name: admin ? ADMIN_CHAT_NAME : chatNameFor(uid),
        firstSeen: seen.get(uid)?.firstSeen ?? null,
        lastSeen: seen.get(uid)?.lastSeen ?? null,
        messages: data.counts[uid] ?? 0,
        history: data.log[uid] ?? [],
        scores: data.scores[uid] ?? {},
        online: uid in data.presence,
        muted: (data.moderation.mutes[uid] ?? 0) > now,
        banned: data.moderation.bans[uid] !== undefined,
        admin,
      };
    })
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        (b.lastSeen ?? 0) - (a.lastSeen ?? 0) ||
        b.messages - a.messages,
    );
}

function historySummary(history: ModerationEntry[]) {
  const timeouts = history.filter((entry) => entry.action === 'timeout').length;
  const bans = history.filter((entry) => entry.action === 'ban').length;
  if (!timeouts && !bans) return 'None';
  return [
    timeouts && `${timeouts} timeout${timeouts === 1 ? '' : 's'}`,
    bans && `${bans} ban${bans === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(', ');
}

function scoreSummary(scores: Row['scores']) {
  const parts = BOARDS.filter((board) => scores[board.id] !== undefined).map(
    (board) => `${board.label}: ${formatScore(board, scores[board.id]!)}`,
  );
  return parts.length ? parts.join(' · ') : 'None';
}

function Badges({ row }: { row: Row }) {
  return (
    <>
      {row.admin && <StatusIndicator status="neutral">Admin</StatusIndicator>}
      {row.online && <StatusIndicator status="success">Online</StatusIndicator>}
      {row.muted && <StatusIndicator status="warning">Timed out</StatusIndicator>}
      {row.banned && <StatusIndicator status="danger">Banned</StatusIndicator>}
    </>
  );
}

function UserDetail({
  row,
  data,
  runtime,
  run,
  onClose,
}: {
  row: Row;
  data: UsersData;
  runtime: AdminRuntime;
  run: Run;
  onClose: () => void;
}) {
  return (
    <section className="admin-user-detail" aria-labelledby="user-detail-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="user-detail-title" className="text-2xl">
            {row.name}
          </h3>
          <code className="break-all text-xs text-slate-300">{row.uid}</code>
        </div>
        <SecondaryButton className="ui-icon-button" aria-label="Close details" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </SecondaryButton>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badges row={row} />
      </div>
      <dl className="admin-facts">
        <dt>First seen</dt>
        <dd>{when(row.firstSeen)}</dd>
        <dt>Last seen</dt>
        <dd>{when(row.lastSeen)}</dd>
        <dt>Chat messages</dt>
        <dd>{row.messages}</dd>
        {BOARDS.map((board) => (
          <div key={board.id} className="contents">
            <dt>{board.label}</dt>
            <dd>
              {row.scores[board.id] !== undefined
                ? formatScore(boardFor(board.id), row.scores[board.id]!)
                : '—'}
            </dd>
          </div>
        ))}
      </dl>
      <div>
        <h4 className="font-semibold">Moderation history</h4>
        {row.history.length === 0 ? (
          <p className="text-sm text-slate-300">No timeouts, bans or deletions recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm" aria-label="Moderation history">
            {row.history.map((entry) => (
              <li key={entry.id}>
                <strong>{ACTION_LABEL[entry.action]}</strong> · {dateTime.format(entry.at)}
                {entry.until !== undefined && ` · until ${dateTime.format(entry.until)}`}
                {entry.count !== undefined &&
                  ` · ${entry.count} message${entry.count === 1 ? '' : 's'}`}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!row.admin && (
        <PersonActions
          uid={row.uid}
          name={row.name}
          moderation={data.moderation}
          runtime={runtime}
          run={run}
        />
      )}
    </section>
  );
}

export function AdminUsers({
  data,
  runtime,
  run,
}: {
  data: UsersData;
  runtime: AdminRuntime;
  run: Run;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useMemo(() => buildRows(data), [data]);
  const term = search.trim().toLowerCase();
  const shown = rows.filter(
    (row) => !term || row.name.toLowerCase().includes(term) || row.uid.toLowerCase().includes(term),
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const detail = rows.find((row) => row.uid === selected);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300">
        Signed-in accounts by generated name. First/last seen is recorded for Google sign-ins from
        now on; older accounts show “—”. No Google names, emails, IP addresses or device details are
        stored.
      </p>
      <label className="flex max-w-md flex-col gap-1 text-sm">
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
      <div
        className={detail ? 'admin-users-layout admin-users-layout--detail' : 'admin-users-layout'}
      >
        <div className="overflow-x-auto">
          <table className="admin-users-table">
            <caption className="sr-only">Signed-in users</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Account ID</th>
                <th scope="col">First seen</th>
                <th scope="col">Last seen</th>
                <th scope="col">Messages</th>
                <th scope="col">Moderation</th>
                <th scope="col">Scores</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7}>Nobody matches.</td>
                </tr>
              )}
              {shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((row) => (
                <tr key={row.uid} aria-selected={row.uid === selected}>
                  <th scope="row">
                    <button
                      type="button"
                      className="admin-user-open"
                      onClick={() => setSelected(row.uid)}
                      aria-label={`Open details for ${row.name}`}
                    >
                      {row.name}
                    </button>
                    <span className="mt-1 flex flex-wrap gap-2">
                      <Badges row={row} />
                    </span>
                  </th>
                  <td>
                    <code className="text-xs">{row.uid.slice(0, 10)}…</code>
                  </td>
                  <td>{when(row.firstSeen)}</td>
                  <td>{when(row.lastSeen)}</td>
                  <td>{row.messages}</td>
                  <td>{historySummary(row.history)}</td>
                  <td>{scoreSummary(row.scores)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detail && (
          <UserDetail
            row={detail}
            data={data}
            runtime={runtime}
            run={run}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-3">
          <SecondaryButton disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </SecondaryButton>
          <span className="text-sm">
            Page {current + 1} of {pages} · {shown.length} accounts
          </span>
          <SecondaryButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Next
          </SecondaryButton>
        </div>
      )}
    </div>
  );
}
