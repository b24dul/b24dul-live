import { describe, expect, it, vi } from 'vitest';
import { subscribeToAuthSession, type AuthObserver, type ObservedUser } from './authObserver';
import type { AuthSession } from './authSession';

function createObserverHarness() {
  let userListener: (user: ObservedUser) => void = () => {};
  let errorListener: (error: unknown) => void = () => {};
  const unsubscribe = vi.fn();
  const observer: AuthObserver = (onUser, onError) => {
    userListener = onUser;
    errorListener = onError;
    return unsubscribe;
  };
  return {
    observer,
    unsubscribe,
    emitUser: (user: ObservedUser) => userListener(user),
    emitError: (error: unknown) => errorListener(error),
  };
}

describe('non-destructive Firebase auth observer adapter', () => {
  it('starts in checking state until the first SDK callback', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    expect(sessions).toEqual([{ status: 'checking' }]);
  });

  it('keeps the same anonymous UID on repeat session emissions', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    harness.emitUser({ uid: 'restored-uid', isAnonymous: true });
    harness.emitUser({ uid: 'restored-uid', isAnonymous: true });
    expect(sessions.slice(1)).toEqual([
      { status: 'ready', identity: { kind: 'anonymous', uid: 'restored-uid' } },
      { status: 'ready', identity: { kind: 'anonymous', uid: 'restored-uid' } },
    ]);
  });

  it('distinguishes signed-out and Google user states without signing in', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    harness.emitUser(null);
    harness.emitUser({ uid: 'google-uid', isAnonymous: false });
    expect(sessions.slice(1)).toEqual([
      { status: 'ready', identity: { kind: 'signed-out' } },
      { status: 'ready', identity: { kind: 'google', uid: 'google-uid' } },
    ]);
  });

  it('reports SDK observer errors without creating a replacement anonymous account', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    harness.emitError(new Error('offline'));
    expect(sessions.at(-1)).toEqual({
      status: 'error',
      reason: 'Authentication state unavailable',
    });
  });

  it('handles invalid restored identities as an error', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    harness.emitUser({ uid: ' ', isAnonymous: true });
    expect(sessions.at(-1)).toEqual({
      status: 'error',
      reason: 'Invalid authentication identity',
    });
  });

  it('stops observing on teardown and ignores stale callbacks', () => {
    const harness = createObserverHarness();
    const sessions: AuthSession[] = [];
    const stop = subscribeToAuthSession(harness.observer, (session) => sessions.push(session));
    stop();
    stop();
    harness.emitUser({ uid: 'stale-uid', isAnonymous: true });
    harness.emitError(new Error('late'));
    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessions).toEqual([{ status: 'checking' }]);
  });

  it('handles synchronous observer setup failures safely', () => {
    const sessions: AuthSession[] = [];
    const stop = subscribeToAuthSession(
      () => {
        throw new Error('SDK initialization failed');
      },
      (session) => sessions.push(session),
    );
    expect(sessions).toEqual([
      { status: 'checking' },
      { status: 'error', reason: 'Authentication state unavailable' },
    ]);
    expect(stop).not.toThrow();
  });
});
