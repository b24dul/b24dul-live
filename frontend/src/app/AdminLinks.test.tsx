import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../contexts/AccountContext';
import type { AccountRuntime } from '../services/accountRuntime';
import type { AuthIdentity } from '../services/authSession';

const loaded = vi.fn();
vi.mock('../services/chatRuntime', () => ({
  startChatRuntime: () => {
    loaded();
    return {
      watchAdmins: (onAdmins: (uids: Set<string>) => void) => {
        onAdmins(new Set(['owner']));
        return () => {};
      },
    };
  },
}));
const { App } = await import('./App');

function runtimeFor(identity: AuthIdentity): () => Promise<AccountRuntime> {
  return async () => ({
    subscribe: (onSession) => {
      onSession({ status: 'ready', identity }, null);
      return () => {};
    },
    transitions: {
      enterAnonymously: async () => ({ type: 'failed' }),
      enterWithGoogle: async () => ({ type: 'failed' }),
      signOut: async () => ({ type: 'failed' }),
    },
  });
}

// The account page starts the session, as it does on the site.
function renderAs(identity: AuthIdentity) {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <AccountProvider loadRuntime={runtimeFor(identity)}>
        <App />
      </AccountProvider>
    </MemoryRouter>,
  );
}

const footer = () => screen.getByRole('navigation', { name: 'More pages' });

describe('Admin links', () => {
  it('are shown in the footer and menu only to an admin', async () => {
    renderAs({ kind: 'google', uid: 'owner' });
    expect(await within(footer()).findByRole('link', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(
      within(screen.getByRole('navigation', { name: 'Site menu' })).getByRole('link', {
        name: 'Admin',
      }),
    ).toBeInTheDocument();
  });

  it('are hidden from other Google users', async () => {
    renderAs({ kind: 'google', uid: 'someone-else' });
    await screen.findByRole('heading', { name: 'Your account' });
    await vi.waitFor(() => expect(loaded).toHaveBeenCalled());
    expect(within(footer()).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('are hidden from guests, who load nothing for the check', async () => {
    loaded.mockClear();
    renderAs({ kind: 'anonymous', uid: 'guest' });
    await screen.findByRole('heading', { name: 'Your account' });
    expect(within(footer()).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(loaded).not.toHaveBeenCalled();
  });
});
