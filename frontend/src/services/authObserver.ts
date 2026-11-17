import {
  normaliseAuthIdentity,
  type AuthSession,
} from './authSession';

export type ObservedUser = { uid: string; isAnonymous: boolean } | null;
export type ObserverUnsubscribe = () => void;
export type AuthObserver = (
  onUser: (user: ObservedUser) => void,
  onError: (error: unknown) => void,
) => ObserverUnsubscribe;

/**
 * Bridges an SDK auth observer to the preview's session model.
 * This module does not initialise Firebase, sign in, store credentials or
 * read/write the Realtime Database.
 */
export function subscribeToAuthSession(
  observer: AuthObserver,
  onSession: (session: AuthSession) => void,
): ObserverUnsubscribe {
  let active = true;
  onSession({ status: 'checking' });

  const onUser = (user: ObservedUser) => {
    if (!active) return;
    try {
      onSession({
        status: 'ready',
        identity: normaliseAuthIdentity(user),
      });
    } catch {
      onSession({ status: 'error', reason: 'Invalid authentication identity' });
    }
  };

  const onError = (_error: unknown) => {
    if (!active) return;
    onSession({ status: 'error', reason: 'Authentication state unavailable' });
  };

  let unsubscribe: ObserverUnsubscribe;
  try {
    unsubscribe = observer(onUser, onError);
  } catch {
    onError(null);
    unsubscribe = () => {};
  }

  return () => {
    if (!active) return;
    active = false;
    unsubscribe();
  };
}
