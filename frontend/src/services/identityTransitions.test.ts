import { describe, expect, it, vi } from 'vitest';
import { createIdentityTransitions, type IdentityAdapter } from './identityTransitions';
import type { AuthSession } from './authSession';

function setup(session: AuthSession) {
  const adapter: IdentityAdapter = {
    currentSession: () => session,
    signInAnonymously: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    linkGoogle: vi.fn().mockResolvedValue(undefined),
    signInWithCollidingGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  return { adapter, transitions: createIdentityTransitions(adapter) };
}

describe('identity transitions', () => {
  it('does nothing before authentication has resolved', async () => {
    const { adapter, transitions } = setup({ status: 'checking' });
    expect(await transitions.enterAnonymously()).toEqual({ type: 'unavailable' });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'unavailable' });
    expect(adapter.signInAnonymously).not.toHaveBeenCalled();
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('signs a signed-out visitor in directly with Google', async () => {
    const { adapter, transitions } = setup({ status: 'ready', identity: { kind: 'signed-out' } });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'completed' });
    expect(adapter.signInWithGoogle).toHaveBeenCalledOnce();
    expect(adapter.linkGoogle).not.toHaveBeenCalled();
  });

  it('keeps existing users and links a guest UID only on Google action', async () => {
    const { adapter, transitions } = setup({
      status: 'ready',
      identity: { kind: 'anonymous', uid: 'guest' },
    });
    expect(await transitions.enterAnonymously()).toEqual({ type: 'kept', uid: 'guest' });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'completed' });
    expect(adapter.linkGoogle).toHaveBeenCalledWith('guest');
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('switches to the existing Google account when the credential is already in use', async () => {
    const { adapter, transitions } = setup({
      status: 'ready',
      identity: { kind: 'anonymous', uid: 'guest' },
    });
    const collision = { code: 'auth/credential-already-in-use' };
    vi.mocked(adapter.linkGoogle).mockRejectedValue(collision);
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'switched', from: 'guest' });
    expect(adapter.signInWithCollidingGoogle).toHaveBeenCalledWith(collision);
  });

  it('reports a closed popup as cancelled and other errors as failed', async () => {
    const { adapter, transitions } = setup({ status: 'ready', identity: { kind: 'signed-out' } });
    vi.mocked(adapter.signInWithGoogle).mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user',
    });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'cancelled' });
    vi.mocked(adapter.signInWithGoogle).mockRejectedValueOnce(new Error('network'));
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'failed' });
  });

  it('signs out', async () => {
    const { adapter, transitions } = setup({
      status: 'ready',
      identity: { kind: 'google', uid: 'member' },
    });
    expect(await transitions.signOut()).toEqual({ type: 'signed-out' });
    expect(adapter.signOut).toHaveBeenCalledOnce();
  });

  it('prevents overlapping sign-ins', async () => {
    const { adapter, transitions } = setup({ status: 'ready', identity: { kind: 'signed-out' } });
    let finish!: () => void;
    vi.mocked(adapter.signInAnonymously).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const first = transitions.enterAnonymously();
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'busy' });
    finish();
    expect(await first).toEqual({ type: 'completed' });
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();
  });
});
