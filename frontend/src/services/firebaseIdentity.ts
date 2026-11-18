import {
  GoogleAuthProvider,
  linkWithPopup,
  onIdTokenChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type Auth,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { subscribeToAuthSession } from './authObserver';
import type { AuthSession } from './authSession';
import { createIdentityTransitions, type IdentityAdapter } from './identityTransitions';

/** How a Google credential is obtained. Production uses a popup; the emulator fixture injects tokens. */
export type GoogleFlow = {
  signIn(auth: Auth): Promise<unknown>;
  link(user: User): Promise<unknown>;
  /** The Google credential carried by an `auth/credential-already-in-use` link error. */
  credentialFromCollision(error: unknown): AuthCredential | null;
};

/** Google provider that always shows the account chooser, so people can pick or switch accounts. */
export function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export const googlePopupFlow: GoogleFlow = {
  signIn: (auth) => signInWithPopup(auth, googleProvider()),
  link: (user) => linkWithPopup(user, googleProvider()),
  credentialFromCollision: (error) =>
    GoogleAuthProvider.credentialFromError(
      error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
    ),
};

export type AccountProfile = { displayName: string | null; email: string | null } | null;

/** Wires Firebase Auth to the session observer and the sign-in coordinator. */
export function createFirebaseIdentity(auth: Auth, google: GoogleFlow = googlePopupFlow) {
  let session: AuthSession = { status: 'checking' };
  const adapter: IdentityAdapter = {
    currentSession: () => session,
    signInAnonymously: async () => {
      await signInAnonymously(auth);
    },
    signInWithGoogle: async () => {
      await google.signIn(auth);
    },
    linkGoogle: async (uid) => {
      const user = auth.currentUser;
      if (!user?.isAnonymous || user.uid !== uid)
        throw new Error('Identity changed before linking');
      await google.link(user);
    },
    signInWithCollidingGoogle: async (error) => {
      const credential = google.credentialFromCollision(error);
      if (!credential) throw new Error('The Google credential was not returned');
      await signInWithCredential(auth, credential);
    },
    signOut: () => signOut(auth),
  };
  const transitions = createIdentityTransitions(adapter);

  /** Observes ID-token changes so linking (same UID, new provider) is reported. */
  function subscribe(onSession: (session: AuthSession, profile: AccountProfile) => void) {
    return subscribeToAuthSession(
      (next, error) => onIdTokenChanged(auth, next, error),
      (next) => {
        session = next;
        const user = auth.currentUser;
        const profile =
          next.status === 'ready' && user && !user.isAnonymous
            ? { displayName: user.displayName, email: user.email }
            : null;
        onSession(next, profile);
      },
    );
  }

  return { subscribe, transitions };
}
