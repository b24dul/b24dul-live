import { planAnonymousEntry, planGoogleEntry, type AuthSession } from './authSession';

/** An isolated transition coordinator. The caller must provide an SDK adapter. */
export interface IdentityAdapter {
  currentSession(): AuthSession;
  signInAnonymously(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  linkGoogle(uid: string): Promise<void>;
}

export type TransitionResult =
  | { type: 'completed' }
  | { type: 'kept'; uid: string }
  | { type: 'unavailable' }
  | { type: 'busy' }
  | { type: 'collision'; uid: string }
  | { type: 'failed' };

/** All methods require a deliberate user action; collisions never trigger account switching. */
export function createIdentityTransitions(adapter: IdentityAdapter) {
  let busy = false;
  async function run(provider: 'anonymous' | 'google'): Promise<TransitionResult> {
    if (busy) return { type: 'busy' };
    busy = true;
    try {
      const session = adapter.currentSession();
      const plan =
        provider === 'anonymous' ? planAnonymousEntry(session) : planGoogleEntry(session);
      if (plan.type === 'wait-for-auth-observer') return { type: 'unavailable' };
      if (plan.type === 'keep-existing-session') return { type: 'kept', uid: plan.uid };
      if (plan.type === 'offer-anonymous-sign-in') await adapter.signInAnonymously();
      if (plan.type === 'offer-google-sign-in') await adapter.signInWithGoogle();
      if (plan.type === 'offer-google-linking') {
        try {
          await adapter.linkGoogle(plan.uid);
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'auth/credential-already-in-use'
          ) {
            return { type: 'collision', uid: plan.uid };
          }
          throw error;
        }
      }
      return { type: 'completed' };
    } catch {
      return { type: 'failed' };
    } finally {
      busy = false;
    }
  }
  return { enterAnonymously: () => run('anonymous'), enterWithGoogle: () => run('google') };
}
