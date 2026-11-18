import { describe, expect, it } from 'vitest';
import {
  normaliseAuthIdentity,
  planAnonymousEntry,
  planGoogleEntry,
  type AuthSession,
} from './authSession';

const checking: AuthSession = { status: 'checking' };
const anonymous: AuthSession = {
  status: 'ready',
  identity: { kind: 'anonymous', uid: 'existing-anon-uid' },
};
const google: AuthSession = {
  status: 'ready',
  identity: { kind: 'google', uid: 'existing-google-uid' },
};
const signedOut: AuthSession = { status: 'ready', identity: { kind: 'signed-out' } };

describe('Firebase session preservation policy', () => {
  it('waits for the auth observer before attempting sign-in', () => {
    expect(planAnonymousEntry(checking)).toEqual({ type: 'wait-for-auth-observer' });
    expect(planGoogleEntry(checking)).toEqual({ type: 'wait-for-auth-observer' });
    expect(planAnonymousEntry({ status: 'error', reason: 'network' })).toEqual({
      type: 'wait-for-auth-observer',
    });
  });

  it('preserves a restored anonymous UID rather than creating another user', () => {
    expect(planAnonymousEntry(anonymous)).toEqual({
      type: 'keep-existing-session',
      uid: 'existing-anon-uid',
    });
  });

  it('preserves a restored Google account without swapping identities', () => {
    expect(planAnonymousEntry(google)).toEqual({
      type: 'keep-existing-session',
      uid: 'existing-google-uid',
    });
    expect(planGoogleEntry(google)).toEqual({
      type: 'keep-existing-session',
      uid: 'existing-google-uid',
    });
  });

  it('keeps an authenticated UID even when its provider is unknown', () => {
    const unknown: AuthSession = {
      status: 'ready',
      identity: { kind: 'authenticated', uid: 'existing-uid' },
    };
    expect(planAnonymousEntry(unknown)).toEqual({
      type: 'keep-existing-session',
      uid: 'existing-uid',
    });
    expect(planGoogleEntry(unknown)).toEqual({
      type: 'keep-existing-session',
      uid: 'existing-uid',
    });
    expect(normaliseAuthIdentity({ uid: 'existing-uid', isAnonymous: false })).toEqual({
      kind: 'authenticated',
      uid: 'existing-uid',
    });
    expect(
      normaliseAuthIdentity({
        uid: 'other',
        isAnonymous: false,
        providerData: [{ providerId: 'other.example' }],
      }),
    ).toEqual({
      kind: 'authenticated',
      uid: 'other',
    });
  });

  it('only offers anonymous sign-in after an observer-confirmed signed-out state', () => {
    expect(planAnonymousEntry(signedOut)).toEqual({ type: 'offer-anonymous-sign-in' });
  });

  it('requires explicit linking before replacing an anonymous user with Google', () => {
    expect(planGoogleEntry(anonymous)).toEqual({
      type: 'offer-google-linking',
      uid: 'existing-anon-uid',
    });
    expect(planGoogleEntry(signedOut)).toEqual({ type: 'offer-google-sign-in' });
  });

  it('does not infer a Google account from an anonymous Firebase identity', () => {
    expect(normaliseAuthIdentity({ uid: 'a', isAnonymous: true })).toEqual({
      kind: 'anonymous',
      uid: 'a',
    });
    expect(
      normaliseAuthIdentity({
        uid: 'g',
        isAnonymous: false,
        providerData: [{ providerId: 'google.com' }],
      }),
    ).toEqual({
      kind: 'google',
      uid: 'g',
    });
    expect(normaliseAuthIdentity(null)).toEqual({ kind: 'signed-out' });
    expect(() => normaliseAuthIdentity({ uid: ' ', isAnonymous: true })).toThrow();
  });
});
