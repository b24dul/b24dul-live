import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AuthSession } from '../../services/authSession';
import type { AccountProfile } from '../../services/firebaseIdentity';
import type { TransitionResult } from '../../services/identityTransitions';
import { AccountPanel } from './AccountPanel';

function fakeRuntime(google: TransitionResult = { type: 'completed' }) {
  let emit: (session: AuthSession, profile: AccountProfile) => void = () => {};
  const runtime: AccountRuntime = {
    subscribe: (onSession) => {
      emit = onSession;
      onSession({ status: 'ready', identity: { kind: 'signed-out' } }, null);
      return () => {};
    },
    transitions: {
      enterAnonymously: vi.fn(async () => {
        emit({ status: 'ready', identity: { kind: 'anonymous', uid: 'guest' } }, null);
        return { type: 'completed' } as const;
      }),
      enterWithGoogle: vi.fn(async () => {
        emit(
          { status: 'ready', identity: { kind: 'google', uid: 'member' } },
          {
            displayName: 'Sam Member',
            email: 'sam@example.invalid',
          },
        );
        return google;
      }),
      signOut: vi.fn(async () => {
        emit({ status: 'ready', identity: { kind: 'signed-out' } }, null);
        return { type: 'signed-out' } as const;
      }),
    },
  };
  return runtime;
}

function renderPanel(runtime: AccountRuntime) {
  const load = vi.fn(async () => runtime);
  render(
    <MemoryRouter>
      <AccountProvider loadRuntime={load}>
        <AccountPanel />
      </AccountProvider>
    </MemoryRouter>,
  );
  return load;
}

describe('AccountPanel', () => {
  it('loads Firebase only when shown, then offers guest and Google sign-in', async () => {
    const load = renderPanel(fakeRuntime());
    expect(await screen.findByRole('heading', { name: 'Not signed in' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('moves from guest to Google and back to signed out', async () => {
    renderPanel(fakeRuntime());
    const button = await screen.findByRole('button', { name: 'Continue as guest' });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('heading', { name: 'Signed in as a guest' })).toBeInTheDocument();
    expect(screen.getByText('guest', { selector: 'code' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue as guest' })).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    });
    expect(screen.getByRole('heading', { name: 'Sam Member' })).toBeInTheDocument();
    expect(screen.getByText('Signed in with Google')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    });
    expect(screen.getByRole('heading', { name: 'Not signed in' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('signed out');
  });

  it('explains when an existing Google account was used instead of the guest', async () => {
    renderPanel(fakeRuntime({ type: 'switched', from: 'guest' }));
    const button = await screen.findByRole('button', { name: 'Sign in with Google' });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('status')).toHaveTextContent('already had an account here');
  });

  it('shows an error state when sign-in cannot be loaded', async () => {
    render(
      <MemoryRouter>
        <AccountProvider loadRuntime={() => Promise.reject(new Error('offline'))}>
          <AccountPanel />
        </AccountProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Sign-in is unavailable right now' }),
    ).toBeInTheDocument();
  });
});
