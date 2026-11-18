/**
 * Identity policy for the isolated React preview.
 *
 * This module is pure: it does not contact Firebase, sign users in, change
 * persistence, or modify existing records. Firebase Auth will supply the
 * actual user once the isolated integration has passed review.
 */
export type AuthIdentity =
  | { kind: 'anonymous'; uid: string }
  | { kind: 'google'; uid: string }
  | { kind: 'authenticated'; uid: string }
  | { kind: 'signed-out' };

export type AuthSession =
  | { status: 'checking' }
  | { status: 'ready'; identity: AuthIdentity }
  | { status: 'error'; reason: string };

export type AuthAction =
  | { type: 'wait-for-auth-observer' }
  | { type: 'keep-existing-session'; uid: string }
  | { type: 'offer-anonymous-sign-in' }
  | { type: 'offer-google-linking'; uid: string }
  | { type: 'offer-google-sign-in' };

export function normaliseAuthIdentity(
  user: {
    uid: string;
    isAnonymous: boolean;
    providerData?: readonly { providerId: string }[];
  } | null,
): AuthIdentity {
  if (user === null) return { kind: 'signed-out' };
  if (!user.uid.trim()) throw new Error('Firebase user UID must not be empty');
  if (user.isAnonymous) return { kind: 'anonymous', uid: user.uid };
  return {
    kind: user.providerData?.some((provider) => provider.providerId === 'google.com')
      ? 'google'
      : 'authenticated',
    uid: user.uid,
  };
}

/** Never start a second anonymous session until Firebase resolves persistence. */
export function planAnonymousEntry(session: AuthSession): AuthAction {
  if (session.status !== 'ready') return { type: 'wait-for-auth-observer' };
  if (session.identity.kind !== 'signed-out') {
    return { type: 'keep-existing-session', uid: session.identity.uid };
  }
  return { type: 'offer-anonymous-sign-in' };
}

/**
 * Google sign-in cannot silently discard an anonymous UID.
 * Linking must be handled by the future Firebase adapter with collision
 * recovery and an explicit user choice.
 */
export function planGoogleEntry(session: AuthSession): AuthAction {
  if (session.status !== 'ready') return { type: 'wait-for-auth-observer' };
  if (session.identity.kind === 'anonymous') {
    return { type: 'offer-google-linking', uid: session.identity.uid };
  }
  if (session.identity.kind !== 'signed-out') {
    return { type: 'keep-existing-session', uid: session.identity.uid };
  }
  return { type: 'offer-google-sign-in' };
}
