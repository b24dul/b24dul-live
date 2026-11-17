import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  linkWithCredential,
  signInAnonymously,
  type AuthCredential,
  type User,
} from 'firebase/auth';

/** Disposable Auth emulator only. It cannot be configured to use a real project. */
export function createDisposableAuthEmulator(name: string) {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-b24dul-auth' }, name);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  let pending: Promise<User> | undefined;

  // Deliberate test action only; wait for persisted state and never create a
  // replacement when this Auth instance already has a user.
  function enterAsGuest(): Promise<User> {
    if (pending) return pending;
    pending = (async () => {
      await auth.authStateReady();
      return auth.currentUser ?? (await signInAnonymously(auth)).user;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  }

  async function linkGoogleForTest(expectedUid: string, credential: AuthCredential): Promise<User> {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user || !user.isAnonymous || user.uid !== expectedUid) {
      throw new Error('The anonymous identity changed before linking');
    }
    if (credential.providerId !== GoogleAuthProvider.PROVIDER_ID) {
      throw new Error('Only Google credentials are supported');
    }
    // A collision is propagated to the caller. No fallback sign-in or data merge.
    return (await linkWithCredential(user, credential)).user;
  }

  return { auth, enterAsGuest, linkGoogleForTest, close: () => deleteApp(app) };
}
