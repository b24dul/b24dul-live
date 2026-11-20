/* eslint-disable react-refresh/only-export-components -- page entry point, not a component module */
// Browser-test and screenshot page for the stream checklist. Renders the real admin and viewer
// components on top of an in-memory stand-in for the database (no Firebase, sample data only).
// Served by the dev server at /b24dul-live/e2e/harness/checklist.html; never built or published.
//   ?view=test   admin checklist tools and the viewer panel side by side (default)
//   ?view=admin  the whole admin page with an active sample list (for screenshots)
//   ?view=watch  the Watch page content while live, with the active list (for screenshots)
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/styles/index.css';
import { AccountProvider } from '../../src/contexts/AccountContext';
import { LiveStatusProvider } from '../../src/contexts/LiveStatusContext';
import { PageHeader } from '../../src/components/ui';
import { AdminWorkspace } from '../../src/features/admin/AdminWorkspace';
import type { Run } from '../../src/features/admin/AdminShared';
import { ChatPanel } from '../../src/features/chat/ChatPanel';
import { WatchStream } from '../../src/features/stream/WatchStream';
import {
  ChecklistTab,
  UpNextCard,
  type ChecklistData,
} from '../../src/features/checklist/ChecklistAdmin';
import { StreamChecklist } from '../../src/features/checklist/ChecklistViewer';
import { parseChecklist } from '../../src/features/checklist/checklistParser';
import type { AdminRuntime } from '../../src/services/adminRuntime';
import type { ChatService } from '../../src/services/chatService';
import fixture from '../../src/features/checklist/fixtures/gta6-chapter1-checklist.txt?raw';
import { createMemoryChecklist } from './memoryChecklist';

const view = new URLSearchParams(location.search).get('view') ?? 'test';
const store = createMemoryChecklist();
const now = Date.now();
const owner = 'sampleOwner000001';
const noop = () => () => {};
const ok = async () => {};

async function seedSample() {
  const id = await store.createList(parseChecklist(fixture), {
    gameName: 'Sample game',
    showUpcoming: false,
    existing: [],
  });
  await store.setActive(id);
  for (const item of ['i00', 'i01', 'i02', 'i03']) await store.tick(id, item);
}
if (view !== 'test') await seedSample();

const messages = ['evening all!', 'is that the scooter one?', 'gg', 'nice, 4 down already'].map(
  (text, i) => ({ id: `m${i}`, uid: `sampleUser000${i}x`, text, ts: now - (4 - i) * 60_000 }),
);
const chat = {
  watchMessages: (on: (m: typeof messages) => void) => (on(messages), noop()),
  watchSettings: (on: (s: unknown) => void) => (on({ enabled: true, pinned: null }), noop()),
  watchAdmins: (on: (s: Set<string>) => void) => (on(new Set([owner])), noop()),
  watchOwnModeration: (_uid: string, on: (m: unknown) => void) => (
    on({ banned: false, mutedUntil: null }),
    noop()
  ),
  send: async () => 'key',
  startPresence: noop,
} as unknown as ChatService;
const empty = (value: unknown) => (on: (v: unknown) => void) => (on(value), noop());
const runtime = {
  chat,
  admin: {
    watchModeration: empty({ bans: {}, mutes: {} }),
    watchPresence: empty({}),
    watchUsers: empty([]),
    watchMessageCounts: empty({}),
    watchModerationLog: empty({}),
    watchAllScores: empty({}),
    watchStats: empty([]),
    watchPrivacyRequests: empty([]),
    setChatEnabled: ok,
  },
  leaderboards: {},
  checklists: store,
} as unknown as AdminRuntime;

function account(kind: 'google' | 'guest') {
  return async () => ({
    subscribe: (onSession: (session: unknown, error: null) => void) => {
      onSession(
        {
          status: 'ready',
          identity:
            kind === 'google'
              ? { kind: 'google', uid: owner }
              : { kind: 'anonymous', uid: 'sampleGuest00001x' },
        },
        null,
      );
      return () => {};
    },
    transitions: {
      enterAnonymously: async () => ({ type: 'failed' }),
      enterWithGoogle: async () => ({ type: 'failed' }),
      signOut: async () => ({ type: 'failed' }),
    },
  });
}

/** Admin checklist tools and the viewer panel side by side, sharing the in-memory store. */
function TestView() {
  const [data, setData] = useState<ChecklistData>({
    lists: [],
    privates: {},
    active: null,
    template: null,
  });
  const [notice, setNotice] = useState('');
  useState(() => {
    store.watchLists((lists) => setData((d) => ({ ...d, lists })));
    store.watchPrivate((privates) => setData((d) => ({ ...d, privates })));
    store.watchActive((active) => setData((d) => ({ ...d, active })));
    store.watchPrompt((template) => setData((d) => ({ ...d, template })));
  });
  const run = useCallback<Run>(async (label, action) => {
    try {
      await action();
      setNotice(`Done: ${label}.`);
      return true;
    } catch {
      setNotice(`Failed: ${label}.`);
      return false;
    }
  }, []);
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section aria-label="Admin" className="admin-centre">
        <p role="status" className="admin-notice">
          {notice}
        </p>
        <UpNextCard data={data} tools={store} run={run} />
        <ChecklistTab data={data} tools={store} run={run} />
      </section>
      <section aria-label="Viewer">
        <StreamChecklist loadService={async () => store} />
      </section>
    </div>
  );
}

function Page() {
  if (view === 'admin')
    return (
      <>
        <h1 className="mb-6">Admin</h1>
        <AdminWorkspace loadRuntime={async () => runtime} />
      </>
    );
  if (view === 'watch')
    return (
      <section className="flex min-w-0 flex-col gap-8">
        <PageHeader
          title="Watch"
          description="Live streams from B24DUL, with chat beside the stream."
        />
        <WatchStream
          chat={<ChatPanel loadService={async () => chat} />}
          checklist={<StreamChecklist loadService={async () => store} />}
        />
      </section>
    );
  return <TestView />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter>
      <AccountProvider loadRuntime={account(view === 'watch' ? 'guest' : 'google') as never}>
        <LiveStatusProvider
          fetchStatus={async () => ({
            state: 'live',
            checkedAt: now,
            videoId: new URLSearchParams(location.search).get('video') ?? 'sampleVideo',
          })}
        >
          <div className="app-layout">
            <main id="route-content" className="app-page-container">
              <p className="mb-4 font-bold text-amber-200">
                Sample data for tests and screenshots.
              </p>
              <Page />
            </main>
          </div>
        </LiveStatusProvider>
      </AccountProvider>
    </MemoryRouter>
  </StrictMode>,
);
