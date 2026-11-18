import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AuthIdentity } from '../../services/authSession';
import type {
  ChatMessage,
  ChatService,
  ChatSettings,
  OwnModeration,
} from '../../services/chatService';
import { ChatPanel } from './ChatPanel';

function account(identity: AuthIdentity, displayName: string | null = null): AccountRuntime {
  return {
    subscribe: (onSession) => {
      onSession(
        { status: 'ready', identity },
        displayName ? { displayName, email: 'person@example.invalid' } : null,
      );
      return () => {};
    },
    transitions: {
      enterAnonymously: async () => ({ type: 'completed' }),
      enterWithGoogle: async () => ({ type: 'completed' }),
      signOut: async () => ({ type: 'signed-out' }),
    },
  };
}

function fakeChat({
  messages = [] as ChatMessage[],
  settings = { enabled: true, pinned: null } as ChatSettings,
  nicknames = {} as Record<string, string | null>,
  admins = [] as string[],
  moderation = { banned: false, mutedUntil: null } as OwnModeration,
} = {}) {
  const service: ChatService = {
    watchMessages: (onMessages) => (onMessages(messages), () => {}),
    watchSettings: (onSettings) => (onSettings(settings), () => {}),
    watchAdmins: (onAdmins) => (onAdmins(new Set(admins)), () => {}),
    watchNickname: (uid, onNickname) => (onNickname(nicknames[uid] ?? null), () => {}),
    watchOwnModeration: (_uid, onModeration) => (onModeration(moderation), () => {}),
    setNickname: vi.fn(async () => {}),
    send: vi.fn(async () => 'key'),
    startPresence: vi.fn(() => () => {}),
  };
  return service;
}

async function renderChat(runtime: AccountRuntime, service: ChatService) {
  render(
    <MemoryRouter>
      <AccountProvider loadRuntime={async () => runtime}>
        <ChatPanel loadService={async () => service} />
      </AccountProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('log', { name: 'Chat messages' });
}

const message = (id: string, uid: string, text: string): ChatMessage => ({
  id,
  uid,
  text,
  ts: Date.UTC(2026, 10, 18, 12, 0),
});

describe('ChatPanel', () => {
  it('shows messages with nicknames, the pin and the admin badge to visitors who are not signed in', async () => {
    const service = fakeChat({
      messages: [message('1', 'owner', 'Welcome'), message('2', 'guest', 'hi all')],
      nicknames: { owner: 'B24DUL', guest: 'CalmHeron10' },
      admins: ['owner'],
      settings: { enabled: true, pinned: { text: 'Be kind', ts: 1 } },
    });
    await renderChat(account({ kind: 'signed-out' }), service);
    expect(await screen.findByText('CalmHeron10')).toBeInTheDocument();
    expect(screen.getByText('hi all')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Be kind');
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeEnabled();
    expect(service.startPresence).not.toHaveBeenCalled();
  });

  it('asks for a nickname first and saves only the nickname — never the Google name', async () => {
    const service = fakeChat();
    await renderChat(account({ kind: 'google', uid: 'member' }, 'Sam Member'), service);
    const input = await screen.findByLabelText('Choose a nickname');
    expect(screen.queryByText(/Sam Member/)).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save nickname' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/staff or B24DUL/);
    expect(service.setNickname).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'QuietOwl12' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save nickname' }));
    });
    expect(service.setNickname).toHaveBeenCalledWith('member', 'QuietOwl12');
    expect(service.startPresence).toHaveBeenCalledWith('member');
  });

  it('masks swearing, blocks links and personal details before sending', async () => {
    const service = fakeChat({ nicknames: { guest: 'CalmHeron10' } });
    await renderChat(account({ kind: 'anonymous', uid: 'guest' }), service);
    const input = await screen.findByLabelText('Message');
    expect(screen.getByText('CalmHeron10')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'go to www.example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Links aren/);
    fireEvent.change(input, { target: { value: 'how old are you' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Keep personal details/);
    expect(service.send).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'that was shit' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    });
    expect(service.send).toHaveBeenCalledWith('guest', 'that was ****');
    expect(screen.getByRole('button', { name: /Wait \ds/ })).toBeDisabled();
  });

  it('explains bans, mutes and chat being switched off', async () => {
    await renderChat(
      account({ kind: 'anonymous', uid: 'guest' }),
      fakeChat({
        nicknames: { guest: 'CalmHeron10' },
        moderation: { banned: true, mutedUntil: null },
      }),
    );
    expect(await screen.findByText('You can’t post in this chat.')).toBeInTheDocument();
  });

  it('shows when chat is off or the user is muted', async () => {
    await renderChat(
      account({ kind: 'anonymous', uid: 'guest' }),
      fakeChat({
        nicknames: { guest: 'CalmHeron10' },
        moderation: { banned: false, mutedUntil: Date.now() + 60000 },
      }),
    );
    expect(await screen.findByText(/You’re muted until/)).toBeInTheDocument();
  });

  it('shows when chat is switched off', async () => {
    await renderChat(
      account({ kind: 'anonymous', uid: 'guest' }),
      fakeChat({ nicknames: { guest: 'CalmHeron10' }, settings: { enabled: false, pinned: null } }),
    );
    expect(await screen.findByText('Chat is switched off right now.')).toBeInTheDocument();
  });
});
