import { planAnonymousEntry, planGoogleEntry, type AuthSession } from './authSession';

/**
 * Sign-in coordinator for the fresh-start (v2) site. The caller supplies an SDK adapter.
 *
 * - A guest who chooses Google is linked, keeping the same UID, when that Google
 *   account is new to Firebase.
 * - If the Google account already belongs to a Firebase user, the browser signs in to
 *   that account instead. Nothing is merged: the guest identity is left behind.
 *   (Legacy accounts are not carried over; see docs/legacy-removal-checklist.md.)
 */
export interface IdentityAdapter {
  currentSession(): AuthSession;
  signInAnonymously(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  linkGoogle(uid: string): Promise<void>;
  /** Sign in with the Google credential carried by an `auth/credential-already-in-use` error. */
  signInWithCollidingGoogle(error: unknown): Promise<void>;
  signOut(): Promise<void>;
}

export type TransitionResult =
  | { type: 'completed' }
  | { type: 'kept'; uid: string }
  | { type: 'switched'; from: string }
  | { type: 'signed-out' }
  | { type: 'cancelled' }
  | { type: 'unavailable' }
  | { type: 'busy' }
  | { type: 'failed' };

const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

export function createIdentityTransitions(adapter: IdentityAdapter) {
  let busy = false;
  async function exclusive(action: () => Promise<TransitionResult>): Promise<TransitionResult> {
    if (busy) return { type: 'busy' };
    busy = true;
    try {
      return await action();
    } catch (error) {
      return CANCELLED.has(errorCode(error)) ? { type: 'cancelled' } : { type: 'failed' };
    } finally {
      busy = false;
    }
  }

  const enterAnonymously = () =>
    exclusive(async () => {
      const plan = planAnonymousEntry(adapter.currentSession());
      if (plan.type === 'wait-for-auth-observer') return { type: 'unavailable' };
      if (plan.type === 'keep-existing-session') return { type: 'kept', uid: plan.uid };
      await adapter.signInAnonymously();
      return { type: 'completed' };
    });

  const enterWithGoogle = () =>
    exclusive(async () => {
      const plan = planGoogleEntry(adapter.currentSession());
      if (plan.type === 'wait-for-auth-observer') return { type: 'unavailable' };
      if (plan.type === 'keep-existing-session') return { type: 'kept', uid: plan.uid };
      if (plan.type === 'offer-google-sign-in') {
        await adapter.signInWithGoogle();
        return { type: 'completed' };
      }
      if (plan.type !== 'offer-google-linking') return { type: 'unavailable' };
      try {
        await adapter.linkGoogle(plan.uid);
        return { type: 'completed' };
      } catch (error) {
        if (errorCode(error) !== 'auth/credential-already-in-use') throw error;
        await adapter.signInWithCollidingGoogle(error);
        return { type: 'switched', from: plan.uid };
      }
    });

  const signOut = () =>
    exclusive(async () => {
      await adapter.signOut();
      return { type: 'signed-out' };
    });

  return { enterAnonymously, enterWithGoogle, signOut };
}
