import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider, useAccount } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AuthIdentity } from '../../services/authSession';
import { useEffect } from 'react';

const recordSeenNow = vi.fn(async () => {});
vi.mock('../../services/seenRuntime', () => ({ recordSeenNow }));
const { useRecordSeen } = await import('./useRecordSeen');

function Probe() {
  const { start } = useAccount();
  useEffect(() => start(), [start]);
  useRecordSeen();
  return null;
}

function renderAs(identity: AuthIdentity) {
  const runtime = async (): Promise<AccountRuntime> => ({
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
  render(
    <MemoryRouter>
      <AccountProvider loadRuntime={runtime}>
        <Probe />
      </AccountProvider>
    </MemoryRouter>,
  );
}

describe('first/last seen', () => {
  it('is recorded for Google sign-ins, by account ID only', async () => {
    renderAs({ kind: 'google', uid: 'member' });
    await vi.waitFor(() => expect(recordSeenNow).toHaveBeenCalledWith('member'));
  });

  it('is never recorded for guests or signed-out visitors', async () => {
    recordSeenNow.mockClear();
    renderAs({ kind: 'anonymous', uid: 'guest' });
    renderAs({ kind: 'signed-out' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(recordSeenNow).not.toHaveBeenCalled();
  });
});
