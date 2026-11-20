import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AdminRuntime } from '../../services/adminRuntime';
import type { AdminService, PrivacyRequest } from '../../services/adminService';
import type { AuthIdentity } from '../../services/authSession';
import type { ChatMessage, ChatService } from '../../services/chatService';
import { statsDay } from '../../services/dailyTotals';
import { chatNameFor } from '../chat/chatPolicy';
import type { PrivateList, PublicList } from '../checklist/checklistModel';
import { AdminWorkspace } from './AdminWorkspace';

vi.mock('../stream/WatchStream', () => ({
  WatchStream: () => <p>Stream preview</p>,
}));

function account(identity: AuthIdentity): AccountRuntime {
  return {
    subscribe: (onSession) => {
      onSession({ status: 'ready', identity }, null);
      return () => {};
    },
    transitions: {
      enterAnonymously: async () => ({ type: 'completed' }),
      enterWithGoogle: async () => ({ type: 'completed' }),
      signOut: async () => ({ type: 'signed-out' }),
    },
  };
}

const message = (id: string, uid: string, text: string): ChatMessage => ({
  id,
  uid,
  text,
  ts: Date.UTC(2026, 10, 18, 12, 0),
});

type AdminCallback<K extends keyof AdminService> = Parameters<AdminService[K]>[0] extends infer C
  ? C extends (...args: never[]) => unknown
    ? C
    : never
  : never;

const sampleList: PublicList = {
  id: 'l00',
  title: 'Part 1 progress',
  sections: { s00: { title: 'During the first job', order: 0 } },
  items: {
    i00: { title: 'Grab the keys', section: 's00', order: 0, done: true, doneAt: 1 },
    i01: { title: 'Open the safe', section: 's00', order: 1, missable: true },
    i02: { title: 'Leave by boat', section: 's00', order: 2 },
  },
};

function fakeRuntime({ requests = [] as PrivacyRequest[], active = null as string | null } = {}) {
  const messages = [message('m1', 'visitor1234', 'hello'), message('m2', 'owner', 'welcome')];
  const chat: ChatService = {
    watchMessages: (onMessages) => (onMessages(messages), () => {}),
    watchSettings: (onSettings) => (onSettings({ enabled: true, pinned: null }), () => {}),
    watchAdmins: (onAdmins) => (onAdmins(new Set(['owner'])), () => {}),
    watchOwnModeration: (_uid, onModeration) => (
      onModeration({ banned: false, mutedUntil: null }),
      () => {}
    ),
    send: vi.fn(async () => 'key'),
    startPresence: vi.fn(() => () => {}),
  };
  const done = vi.fn(async () => {});
  const admin = {
    setChatEnabled: done,
    pin: vi.fn(async () => {}),
    unpin: done,
    clearChat: vi.fn(async () => {}),
    editMessage: vi.fn(async () => {}),
    deleteMessage: vi.fn(async () => {}),
    deleteAllMessagesFrom: vi.fn(async () => 1),
    mute: vi.fn(async () => {}),
    unmute: done,
    ban: vi.fn(async () => {}),
    unban: done,
    watchModeration: (onModeration: AdminCallback<'watchModeration'>) => (
      onModeration({ bans: { banned00001: 1 }, mutes: {} }),
      () => {}
    ),
    watchPresence: (onPresence: AdminCallback<'watchPresence'>) => (
      onPresence({ online000001: 1 }),
      () => {}
    ),
    watchPrivacyRequests: (onRequests: AdminCallback<'watchPrivacyRequests'>) => (
      onRequests(requests),
      () => {}
    ),
    watchStats: (onDays: AdminCallback<'watchStats'>) => (
      onDays([
        {
          day: statsDay(),
          totals: {
            visits: 12,
            siteMinutes: 80,
            liveMinutes: 30,
            devicePhone: 9,
            deviceDesktop: 3,
          },
        },
        {
          day: statsDay(new Date(Date.now() - 86_400_000)),
          totals: { visits: 8, videoPlays: 4, sourceYoutube: 8, sudokuStarts: 2, g2048Starts: 1 },
        },
      ]),
      () => {}
    ),
    watchUsers: (onUsers: AdminCallback<'watchUsers'>) => (
      onUsers([
        { uid: 'visitor1234', firstSeen: Date.UTC(2026, 10, 1), lastSeen: Date.UTC(2026, 10, 18) },
        { uid: 'online000001', firstSeen: Date.UTC(2026, 10, 2), lastSeen: Date.UTC(2026, 10, 17) },
      ]),
      () => {}
    ),
    watchMessageCounts: (onCounts: AdminCallback<'watchMessageCounts'>) => (
      onCounts({ visitor1234: 7, owner: 2 }),
      () => {}
    ),
    watchModerationLog: (onLog: AdminCallback<'watchModerationLog'>) => (
      onLog({
        visitor1234: [
          { id: 'l2', action: 'ban', at: Date.UTC(2026, 10, 18, 9) },
          {
            id: 'l1',
            action: 'timeout',
            at: Date.UTC(2026, 10, 17, 9),
            until: Date.UTC(2026, 10, 17, 10),
          },
        ],
      }),
      () => {}
    ),
    watchAllScores: (onScores: AdminCallback<'watchAllScores'>) => (
      onScores({ visitor1234: { g2048: 4096, 'sudoku-easy': 95 } }),
      () => {}
    ),
    recordPrivacyRequest: vi.fn(async () => {}),
    markProcessing: vi.fn(async () => {}),
    completeAndErase: vi.fn(async () => 0),
  } as unknown as AdminService & Record<string, ReturnType<typeof vi.fn>>;
  const leaderboards = {
    watchTop: (_board: string, _lower: boolean, onEntries: (entries: unknown[]) => void) => (
      onEntries([
        { uid: 'player00001', value: 2048, ts: 1 },
        { uid: 'player00002', value: 1024, ts: 1 },
      ]),
      () => {}
    ),
    watchFlags: (_board: string, onFlags: (flags: unknown) => void) => (
      onFlags({ player00001: { value: 2048, ts: 1 }, player00002: { value: 999, ts: 1 } }),
      () => {}
    ),
    deleteScore: vi.fn(async () => {}),
    myBest: vi.fn(async () => null),
    submit: vi.fn(async () => {}),
  };
  const checklists = {
    watchLists: (onLists: (lists: PublicList[]) => void) => (onLists([sampleList]), () => {}),
    watchPrivate: (onPrivate: (lists: Record<string, PrivateList>) => void) => (
      onPrivate({
        l00: {
          gameName: 'Sample',
          items: { i01: { steps: ['Find the code', 'Turn the dial'], deadline: 'before dawn' } },
        },
      }),
      () => {}
    ),
    watchActive: (onActive: (id: string | null) => void) => (onActive(active), () => {}),
    watchPrompt: (onTemplate: (template: string | null) => void) => (onTemplate(null), () => {}),
    tick: vi.fn(async () => {}),
  };
  return { chat, admin, leaderboards, checklists } as unknown as AdminRuntime & {
    admin: typeof admin;
    leaderboards: typeof leaderboards;
    checklists: typeof checklists;
  };
}

async function renderAdmin(identity: AuthIdentity, runtime = fakeRuntime()) {
  render(
    <MemoryRouter>
      <AccountProvider loadRuntime={async () => account(identity)}>
        <AdminWorkspace loadRuntime={async () => runtime} />
      </AccountProvider>
    </MemoryRouter>,
  );
  return runtime;
}

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const openTab = async (name: string) => click(await screen.findByRole('tab', { name }));

describe('AdminWorkspace', () => {
  it('tabs: Checklist, Users, Analytics, Leaderboards and Privacy requests, with arrow keys', async () => {
    await renderAdmin({ kind: 'google', uid: 'owner' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Checklist',
      'Users',
      'Analytics',
      'Leaderboards',
      'Privacy requests',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();
    fireEvent.keyDown(tabs[2]!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Privacy requests' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows the Up next card first when a checklist is active, and ticks with Done', async () => {
    const runtime = await renderAdmin(
      { kind: 'google', uid: 'owner' },
      fakeRuntime({ active: 'l00' }),
    );
    const card = await screen.findByRole('region', { name: /Up next/ });
    expect(card.compareDocumentPosition(screen.getByRole('region', { name: 'Status' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(within(card).getByText('1/3')).toBeInTheDocument();
    expect(within(card).getByText(/Open the safe/)).toBeInTheDocument();
    expect(within(card).getByText('Missable')).toBeInTheDocument();
    expect(within(card).getByText('Turn the dial')).toBeInTheDocument();
    expect(within(card).getByText('before dawn')).toBeInTheDocument();
    expect(within(card).getByText(/Leave by boat/)).toBeInTheDocument();
    await click(within(card).getByRole('button', { name: 'Done' }));
    expect(runtime.checklists.tick).toHaveBeenCalledWith('l00', 'i01');
  });

  it('shows no Up next card when no checklist is active', async () => {
    await renderAdmin({ kind: 'google', uid: 'owner' });
    await screen.findByRole('region', { name: 'Status' });
    expect(screen.queryByRole('region', { name: /Up next/ })).not.toBeInTheDocument();
  });

  it('is closed to signed-out visitors, guests and non-admin Google users', async () => {
    await renderAdmin({ kind: 'signed-out' });
    expect(await screen.findByRole('heading', { name: 'Admin only' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('top strip: stream status, viewers (honestly not available), chat switch, visits today', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    const strip = await screen.findByRole('region', { name: 'Status' });
    expect(within(strip).getByText('Not available')).toBeInTheDocument();
    expect(await within(strip).findByText(/1\s*signed in on the site/)).toBeInTheDocument();
    expect(within(strip).getByText('12')).toBeInTheDocument();
    const chat = within(strip).getByRole('switch', { name: 'Chat on' });
    expect(chat).toHaveAttribute('aria-checked', 'true');
    await click(chat);
    expect(runtime.admin.setChatEnabled).toHaveBeenCalledWith(false);
  });

  it('analytics: 7 and 30 day charts, a table view, breakdowns and the GoatCounter link', async () => {
    await renderAdmin({ kind: 'google', uid: 'owner' });
    await openTab('Analytics');
    const visits = screen.getByRole('figure', { name: /Visits/ });
    expect(visits).toHaveTextContent('20');
    expect(screen.getByRole('figure', { name: /Game starts/ })).toHaveTextContent('3');
    expect(screen.getByRole('region', { name: 'Visits by device' })).toHaveTextContent(
      /Phone\s*9 · 75%/,
    );
    expect(screen.getByRole('link', { name: /GoatCounter/ })).toHaveAttribute(
      'href',
      'https://b24dul.goatcounter.com',
    );
    await click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await click(screen.getByRole('button', { name: 'Show table' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(31);
    expect(rows[1]).toHaveTextContent(statsDay());
  });

  it('is closed to a Google user who is not on the admin list', async () => {
    await renderAdmin({ kind: 'google', uid: 'someone' });
    expect(await screen.findByRole('heading', { name: 'Admin only' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Chat controls' })).not.toBeInTheDocument();
  });

  it('gives the admin chat controls, with a confirmation before clearing', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    expect(await screen.findByRole('heading', { name: 'Chat controls' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stream' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pinned message'), { target: { value: 'Live at 7' } });
    await click(screen.getByRole('button', { name: 'Pin announcement' }));
    expect(runtime.admin.pin).toHaveBeenCalledWith('Live at 7');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Done: message pinned.');
    // An empty box explains itself instead of doing nothing.
    await click(screen.getByRole('button', { name: 'Pin announcement' }));
    expect(screen.getByText('Type the announcement in the box first.')).toBeInTheDocument();
    expect(runtime.admin.pin).toHaveBeenCalledTimes(1);
    await click(screen.getByRole('button', { name: 'Clear chat' }));
    expect(runtime.admin.clearChat).not.toHaveBeenCalled();
    await click(screen.getByRole('button', { name: /Delete every message/ }));
    expect(runtime.admin.clearChat).toHaveBeenCalled();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Done: chat cleared.');
  });

  it('moderates a message and its author; the admin’s own messages have no person actions', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    const log = await screen.findByRole('log', { name: 'Chat messages' });
    await within(log).findByText('hello');
    const [visitorMessage, ownMessage] = within(log).getAllByRole('listitem');
    expect(within(ownMessage!).queryByRole('button', { name: 'Ban' })).not.toBeInTheDocument();
    const actions = within(visitorMessage!);
    await click(actions.getByRole('button', { name: 'Delete' }));
    await click(actions.getByRole('button', { name: 'Delete message' }));
    expect(runtime.admin.deleteMessage).toHaveBeenCalledWith('m1');
    fireEvent.change(actions.getByLabelText(/Timeout length/), { target: { value: '30' } });
    await click(actions.getByRole('button', { name: 'Timeout' }));
    expect(runtime.admin.mute).toHaveBeenCalledWith('visitor1234', 30);
    await click(actions.getByRole('button', { name: 'Ban' }));
    expect(runtime.admin.ban).not.toHaveBeenCalled();
    await click(actions.getByRole('button', { name: `Ban ${chatNameFor('visitor1234')}` }));
    expect(runtime.admin.ban).toHaveBeenCalledWith('visitor1234');
    await click(actions.getByRole('button', { name: 'Pin' }));
    expect(runtime.admin.pin).toHaveBeenCalledWith('hello');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Done: message pinned.');
    await click(actions.getByRole('button', { name: 'Edit' }));
    fireEvent.change(actions.getByLabelText('Edit message'), { target: { value: 'oh shit' } });
    await click(actions.getByRole('button', { name: 'Save' }));
    expect(runtime.admin.editMessage).toHaveBeenCalledWith('m1', 'oh ****');
  });

  it('online now: lists who is online with quick timeout and ban', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    const online = await screen.findByRole('list', { name: 'People online now' });
    const name = chatNameFor('online000001');
    expect(await within(online).findByText(name)).toBeInTheDocument();
    await click(within(online).getByRole('button', { name: 'Timeout' }));
    expect(runtime.admin.mute).toHaveBeenCalledWith('online000001', expect.any(Number));
    expect(within(online).queryByRole('button', { name: 'Delete all their messages' })).toBeNull();
  });

  it('users: search, first/last seen, messages, moderation history, scores and details', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    await openTab('Users');
    const table = await screen.findByRole('table');
    const name = chatNameFor('visitor1234');
    const row = (
      await within(table).findByRole('button', { name: `Open details for ${name}` })
    ).closest('tr')!;
    expect(row).toHaveTextContent('7');
    expect(row).toHaveTextContent('1 timeout, 1 ban');
    expect(row).toHaveTextContent('2048: 4,096');
    expect(within(table).getByText('banned0000…')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search name or account ID'), {
      target: { value: 'online0000' },
    });
    expect(within(table).queryByText(name)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search name or account ID'), { target: { value: '' } });
    await click(within(table).getByRole('button', { name: `Open details for ${name}` }));
    const detail = screen.getByRole('region', { name });
    expect(within(detail).getByText('visitor1234')).toBeInTheDocument();
    const history = within(detail).getByRole('list', { name: 'Moderation history' });
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Banned');
    expect(within(history).getAllByRole('listitem')[1]).toHaveTextContent(/Timed out.*until/);
    await click(within(detail).getByRole('button', { name: 'Ban' }));
    await click(within(detail).getByRole('button', { name: `Ban ${name}` }));
    expect(runtime.admin.ban).toHaveBeenCalledWith('visitor1234');
    await click(within(detail).getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
  });

  it('records privacy requests by valid account ID and confirms before erasing', async () => {
    const pending: PrivacyRequest = {
      id: 'r1',
      uid: 'visitor1234',
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
    };
    const runtime = await renderAdmin(
      { kind: 'google', uid: 'owner' },
      fakeRuntime({ requests: [pending] }),
    );
    await openTab('Privacy requests');
    const field = await screen.findByLabelText('Account ID');
    fireEvent.change(field, { target: { value: 'bad id!' } });
    await click(screen.getByRole('button', { name: 'Record request' }));
    expect(screen.getByText('Enter a valid account ID.')).toBeInTheDocument();
    expect(runtime.admin.recordPrivacyRequest).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: 'abcdefghij1234' } });
    await click(screen.getByRole('button', { name: 'Record request' }));
    expect(runtime.admin.recordPrivacyRequest).toHaveBeenCalledWith('abcdefghij1234');
    const log = screen.getByRole('list', { name: 'Privacy requests' });
    await click(within(log).getByRole('button', { name: 'Mark processing' }));
    expect(runtime.admin.markProcessing).toHaveBeenCalledWith('r1');
    await click(within(log).getByRole('button', { name: 'Complete and erase data' }));
    expect(runtime.admin.completeAndErase).not.toHaveBeenCalled();
    await click(within(log).getByRole('button', { name: 'Erase this account’s data now' }));
    expect(runtime.admin.completeAndErase).toHaveBeenCalledWith(pending);
  });
});

describe('AdminWorkspace failures', () => {
  it('says when the database refuses a pin, and keeps the typed text', async () => {
    const runtime = fakeRuntime();
    runtime.admin.pin = vi.fn(async () => {
      throw new Error('PERMISSION_DENIED');
    });
    await renderAdmin({ kind: 'google', uid: 'owner' }, runtime);
    const box = await screen.findByLabelText('Pinned message');
    fireEvent.change(box, { target: { value: 'Live at 7' } });
    await click(screen.getByRole('button', { name: 'Pin announcement' }));
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/^Failed: message pinned/);
    expect(box).toHaveValue('Live at 7');
  });
});

describe('AdminWorkspace leaderboards', () => {
  it('shows the dev-tools hint only on the flagged current score and deletes after confirming', async () => {
    const runtime = fakeRuntime();
    await renderAdmin({ kind: 'google', uid: 'owner' }, runtime);
    await openTab('Leaderboards');
    const list = await screen.findByRole('list', { name: '2048 scores' });
    await within(list).findByText('1,024');
    const [first, second] = within(list).getAllByRole('listitem');
    expect(within(first!).getByText('Dev tools seemed open')).toBeInTheDocument();
    expect(within(first!).getByText('2,048')).toBeInTheDocument();
    // An old flag for a different value is not shown.
    expect(within(second!).queryByText('Dev tools seemed open')).not.toBeInTheDocument();
    await click(within(first!).getByRole('button', { name: 'Delete score' }));
    expect(runtime.leaderboards.deleteScore).not.toHaveBeenCalled();
    await click(within(first!).getByRole('button', { name: /^Delete .*’s score$/ }));
    expect(runtime.leaderboards.deleteScore).toHaveBeenCalledWith('g2048', 'player00001');
  });
});
