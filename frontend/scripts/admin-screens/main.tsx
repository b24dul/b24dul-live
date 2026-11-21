// Screenshot and browser-test harness for the admin control centre: renders the real
// AdminWorkspace with made-up sample data (no Firebase). Not part of the published site; run with
//   npx vite --config scripts/admin-screens/vite.config.ts
// Query options: ?as=member (a signed-in Google user who is not the admin), ?view=public (the
// public chat as shown on Watch and Community), ?tab=... (screenshot label only).
// Test accounts only: every email here is fake (example.invalid).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './harness.css';
import { AccountProvider } from '../../src/contexts/AccountContext';
import { LiveStatusProvider } from '../../src/contexts/LiveStatusContext';
import { AdminWorkspace } from '../../src/features/admin/AdminWorkspace';
import { ChatPanel } from '../../src/features/chat/ChatPanel';
import type { AdminRuntime } from '../../src/services/adminRuntime';
import type { StatsDay } from '../../src/services/adminService';
import { statsDay } from '../../src/services/dailyTotals';

const now = Date.now();
const H = 3_600_000;
const D = 24 * H;
const uids = Array.from({ length: 14 }, (_, i) => `sampleUser${String(i + 1).padStart(4, '0')}x`);
const owner = 'sampleOwner000001';
const online = uids.slice(0, 5);
// Fake Google emails for test accounts (the last two accounts have none recorded yet).
const fakeEmails: Record<string, string> = Object.fromEntries(
  uids
    .slice(0, 12)
    .map((uid, i) => [uid, `test.user${String(i + 1).padStart(2, '0')}@example.invalid`]),
);
const params = new URLSearchParams(location.search);
const asMember = params.get('as') === 'member';
const publicView = params.get('view') === 'public';
const signedIn = asMember ? uids[0]! : owner;
const ownProfile = {
  displayName: asMember ? 'Test Member' : 'Test Owner',
  email: asMember ? 'member.tester@example.invalid' : 'owner.tester@example.invalid',
};
// Calls the page made, so browser tests can check that emails are loaded only on demand.
const emailCalls: string[] = [];
(window as unknown as { emailCalls: string[] }).emailCalls = emailCalls;

const texts = [
  'evening all!',
  'that horde night was wild',
  'gg on the last stream',
  'is the bunker finished yet?',
  'lol the zombie dog',
  'first time catching it live',
  'nice base',
  'how many days survived now?',
];
const messages = texts.map((text, i) => ({
  id: `m${i}`,
  uid: i === 6 ? owner : uids[i % 7]!,
  text,
  ts: now - (texts.length - i) * 90_000,
}));

// 30 days of plausible totals (deterministic).
const days: StatsDay[] = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin(i / 2.3) * 0.5 + 1;
  const live = i % 3 === 0 ? 1 : 0.3;
  const visits = Math.round(40 + 25 * wave + 30 * live);
  return {
    day: statsDay(new Date(now - i * D)),
    totals: {
      visits,
      siteMinutes: Math.round(visits * 6.5),
      liveMinutes: Math.round(visits * 4 * live),
      videoPlays: Math.round(visits * 0.35),
      subscribeClicks: Math.round(visits * 0.05),
      sudokuStarts: Math.round(visits * 0.12),
      g2048Starts: Math.round(visits * 0.18),
      devicePhone: Math.round(visits * 0.62),
      deviceTablet: Math.round(visits * 0.08),
      deviceDesktop: Math.round(visits * 0.3),
      sourceYoutube: Math.round(visits * 0.55),
      sourceSearch: Math.round(visits * 0.12),
      sourceDirect: Math.round(visits * 0.28),
      sourceOther: Math.round(visits * 0.05),
    },
  };
});

const noop = () => () => {};
const ok = async () => {};
const runtime = {
  chat: {
    watchMessages: (onMessages: (m: typeof messages) => void) => (onMessages(messages), noop()),
    watchSettings: (on: (s: unknown) => void) => (
      on({ enabled: true, pinned: { text: 'Stream tonight at 8pm UK time!', ts: now } }),
      noop()
    ),
    watchAdmins: (on: (s: Set<string>) => void) => (on(new Set([owner])), noop()),
    watchOwnModeration: (_uid: string, on: (m: unknown) => void) => (
      on({ banned: false, mutedUntil: null }),
      noop()
    ),
    send: async () => 'key',
    startPresence: noop,
  },
  admin: {
    setChatEnabled: ok,
    pin: ok,
    unpin: ok,
    clearChat: ok,
    editMessage: ok,
    deleteMessage: ok,
    deleteAllMessagesFrom: async () => 0,
    mute: ok,
    unmute: ok,
    ban: ok,
    unban: ok,
    watchModeration: (on: (m: unknown) => void) => (
      on({ bans: { [uids[9]!]: now - 5 * D }, mutes: { [uids[3]!]: now + 20 * 60_000 } }),
      noop()
    ),
    watchPresence: (on: (p: Record<string, number>) => void) => (
      on(Object.fromEntries(online.map((uid, i) => [uid, now - i * 60_000]))),
      noop()
    ),
    watchUsers: (on: (u: unknown[]) => void) => (
      on(
        uids.map((uid, i) => ({
          uid,
          firstSeen: now - (40 - i * 2) * D,
          lastSeen: now - i * 3 * H,
        })),
      ),
      noop()
    ),
    watchMessageCounts: (on: (c: Record<string, number>) => void) => (
      on(Object.fromEntries(uids.slice(0, 9).map((uid, i) => [uid, 40 - i * 4]))),
      noop()
    ),
    watchModerationLog: (on: (l: unknown) => void) => (
      on({
        [uids[3]!]: [
          { id: 'a', action: 'timeout', at: now - 10 * 60_000, until: now + 20 * 60_000 },
          { id: 'b', action: 'timeout', at: now - 3 * D, until: now - 3 * D + 5 * 60_000 },
        ],
        [uids[9]!]: [
          { id: 'c', action: 'ban', at: now - 5 * D },
          { id: 'd', action: 'deleteMessages', at: now - 5 * D, count: 6 },
        ],
      }),
      noop()
    ),
    watchAllScores: (on: (s: unknown) => void) => (
      on({
        [uids[0]!]: { g2048: 8192, 'sudoku-easy': 212 },
        [uids[1]!]: { g2048: 4096 },
        [uids[2]!]: { 'sudoku-medium': 498 },
      }),
      noop()
    ),
    watchStats: (on: (d: StatsDay[]) => void) => (on(days), noop()),
    watchPrivacyRequests: (on: (r: unknown[]) => void) => (
      on([{ id: 'r1', uid: uids[12]!, status: 'pending', createdAt: now - D, updatedAt: now - D }]),
      noop()
    ),
    recordPrivacyRequest: ok,
    markProcessing: ok,
    completeAndErase: async () => 0,
    userEmail: async (uid: string) => {
      emailCalls.push(`userEmail:${uid}`);
      return fakeEmails[uid] ?? null;
    },
    findByEmail: async (text: string) => {
      emailCalls.push(`findByEmail:${text}`);
      return Object.keys(fakeEmails).filter((uid) => fakeEmails[uid]!.startsWith(text));
    },
  },
  leaderboards: {
    watchTop: (_b: string, _l: boolean, on: (e: unknown[]) => void) => (
      on([
        { uid: uids[0], value: 8192, ts: now },
        { uid: uids[1], value: 4096, ts: now },
      ]),
      noop()
    ),
    watchFlags: (_b: string, on: (f: unknown) => void) => (on({}), noop()),
    deleteScore: ok,
    myBest: async () => null,
    submit: ok,
  },
} as unknown as AdminRuntime;

const tab = params.get('tab');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter>
      <AccountProvider
        loadRuntime={async () => ({
          subscribe: (onSession) => {
            onSession({ status: 'ready', identity: { kind: 'google', uid: signedIn } }, ownProfile);
            return () => {};
          },
          transitions: {
            enterAnonymously: async () => ({ type: 'failed' }),
            enterWithGoogle: async () => ({ type: 'failed' }),
            signOut: async () => ({ type: 'failed' }),
          },
        })}
      >
        <LiveStatusProvider
          fetchStatus={async () => ({ state: 'live', checkedAt: now, videoId: '1yVlKouJnag' })}
        >
          <div className="app-layout" data-tab={tab ?? 'users'}>
            <main id="route-content" className="app-page-container">
              <p className="sample-banner">
                Sample data for screenshots — test accounts with fake emails, not real users.
              </p>
              {publicView ? (
                <>
                  <h1 className="mb-6">Community</h1>
                  <ChatPanel loadService={async () => runtime.chat} />
                </>
              ) : (
                <>
                  <h1 className="mb-6">Admin</h1>
                  <AdminWorkspace loadRuntime={async () => runtime} />
                </>
              )}
            </main>
          </div>
        </LiveStatusProvider>
      </AccountProvider>
    </MemoryRouter>
  </StrictMode>,
);
