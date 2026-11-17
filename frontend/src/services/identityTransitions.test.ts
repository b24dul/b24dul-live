import { describe, expect, it, vi } from 'vitest';
import { createIdentityTransitions, type IdentityAdapter } from './identityTransitions';
import type { AuthSession } from './authSession';

function setup(session: AuthSession) {
  const adapter: IdentityAdapter = {
    currentSession: () => session,
    signInAnonymously: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    linkGoogle: vi.fn().mockResolvedValue(undefined),
  };
  return { adapter, transitions: createIdentityTransitions(adapter) };
}

describe('identity transitions', () => {
  it('does nothing before authentication has resolved', async () => {
    const { adapter, transitions } = setup({ status: 'checking' });
    expect(await transitions.enterAnonymously()).toEqual({ type: 'unavailable' });
    expect(adapter.signInAnonymously).not.toHaveBeenCalled();
  });
  it('keeps existing users and links an anonymous UID only on Google action', async () => {
    const { adapter, transitions } = setup({
      status: 'ready',
      identity: { kind: 'anonymous', uid: 'old' },
    });
    expect(await transitions.enterAnonymously()).toEqual({ type: 'kept', uid: 'old' });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'completed' });
    expect(adapter.linkGoogle).toHaveBeenCalledWith('old');
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();
  });
  it('reports a collision without switching accounts or exposing credentials', async () => {
    const { adapter, transitions } = setup({
      status: 'ready',
      identity: { kind: 'anonymous', uid: 'old' },
    });
    vi.mocked(adapter.linkGoogle).mockRejectedValue({
      code: 'auth/credential-already-in-use',
      credential: 'secret',
    });
    expect(await transitions.enterWithGoogle()).toEqual({ type: 'collision', uid: 'old' });
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();
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
