import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AdminRuntime } from '../../services/adminRuntime';
import type { AdminService, PrivacyRequest } from '../../services/adminService';
import type { AuthIdentity } from '../../services/authSession';
import type { ChatMessage, ChatService } from '../../services/chatService';
import { chatNameFor } from '../chat/chatPolicy';
import { AdminWorkspace } from './AdminWorkspace';

vi.mock('../../components/PublishedStreamStatus', () => ({
  PublishedStreamStatus: () => <p>Stream preview</p>,
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

function fakeRuntime({ requests = [] as PrivacyRequest[] } = {}) {
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
  return { chat, admin, leaderboards } as unknown as AdminRuntime & {
    admin: typeof admin;
    leaderboards: typeof leaderboards;
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

describe('AdminWorkspace', () => {
  it('is closed to signed-out visitors, guests and non-admin Google users', async () => {
    await renderAdmin({ kind: 'signed-out' });
    expect(await screen.findByRole('heading', { name: 'Admin only' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('is closed to a Google user who is not on the admin list', async () => {
    await renderAdmin({ kind: 'google', uid: 'someone' });
    expect(await screen.findByRole('heading', { name: 'Admin only' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Chat controls' })).not.toBeInTheDocument();
  });

  it('gives the admin chat controls, with a confirmation before clearing', async () => {
    const runtime = await renderAdmin({ kind: 'google', uid: 'owner' });
    expect(await screen.findByRole('heading', { name: 'Chat controls' })).toBeInTheDocument();
    expect(screen.getByText('Stream preview')).toBeInTheDocument();
    await click(screen.getByRole('button', { name: 'Turn chat off' }));
    expect(runtime.admin.setChatEnabled).toHaveBeenCalledWith(false);
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

  it('lists people (online, recent, banned) with search and filters', async () => {
    await renderAdmin({ kind: 'google', uid: 'owner' });
    const people = await screen.findByRole('list', { name: 'People' });
    expect(await within(people).findByText('online000001')).toBeInTheDocument();
    expect(within(people).getByText('visitor1234')).toBeInTheDocument();
    expect(within(people).getByText('banned00001')).toBeInTheDocument();
    expect(screen.getByText('1 online with chat open')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'banned' } });
    expect(within(people).queryByText('visitor1234')).not.toBeInTheDocument();
    expect(within(people).getByRole('button', { name: 'Unban' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search name or account ID'), {
      target: { value: chatNameFor('online000001').slice(0, 6) },
    });
    expect(within(people).getByText('online000001')).toBeInTheDocument();
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
