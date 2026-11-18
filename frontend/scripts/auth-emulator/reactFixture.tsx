import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  onIdTokenChanged,
  signInAnonymously,
  signInWithCredential,
} from 'firebase/auth';
import { subscribeToAuthSession } from '../../src/services/authObserver';
import type { AuthSession } from '../../src/services/authSession';
import {
  createIdentityTransitions,
  type TransitionResult,
} from '../../src/services/identityTransitions';

if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
  throw new Error('This preview requires localhost');
}
const auth = getAuth(
  initializeApp({ apiKey: 'demo-api-key', authDomain: 'localhost', projectId: 'demo-b24dul-auth' }),
);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
let session: AuthSession = { status: 'checking' };
function credential() {
  if (new URLSearchParams(location.search).has('fail'))
    throw new Error('Simulated cancelled sign-in');
  const subject = new URLSearchParams(location.search).get('subject') ?? 'react-preview';
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return GoogleAuthProvider.credential(
    `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: 'https://accounts.google.com', aud: 'demo-b24dul-auth', sub: subject, email: `${subject}@example.invalid`, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.`,
  );
}
const transitions = createIdentityTransitions({
  currentSession: () => session,
  signInAnonymously: async () => {
    await signInAnonymously(auth);
  },
  signInWithGoogle: async () => {
    await signInWithCredential(auth, credential());
  },
  linkGoogle: async (uid) => {
    const user = auth.currentUser;
    if (!user?.isAnonymous || user.uid !== uid) throw new Error('Identity changed before linking');
    await linkWithCredential(user, credential());
  },
});
function Preview() {
  const [state, setState] = useState<AuthSession>(session);
  const [result, setResult] = useState<TransitionResult>();
  const [pending, setPending] = useState(false);
  useEffect(
    () =>
      subscribeToAuthSession(
        (next, error) => onIdTokenChanged(auth, next, error),
        (next) => {
          session = next;
          setState(next);
        },
      ),
    [],
  );
  const run = async (action: () => Promise<TransitionResult>) => {
    setPending(true);
    try {
      setResult(await action());
    } finally {
      setPending(false);
    }
  };
  const identity = state.status === 'ready' ? state.identity : undefined;
  return (
    <main>
      <h1>React identity emulator preview</h1>
      <p>Disposable test accounts only.</p>
      <output
        id="state"
        data-status={state.status}
        data-kind={identity?.kind ?? ''}
        data-uid={identity && 'uid' in identity ? identity.uid : ''}
      >
        {identity?.kind ?? state.status}
      </output>
      <button
        disabled={pending || state.status !== 'ready'}
        onClick={() => void run(transitions.enterAnonymously)}
      >
        Continue as guest
      </button>
      <button
        disabled={pending || state.status !== 'ready'}
        onClick={() => void run(transitions.enterWithGoogle)}
      >
        Connect test Google account
      </button>
      <p role="status">
        {result?.type === 'collision'
          ? 'This Google account is already linked. Your guest identity has been kept.'
          : result?.type === 'failed'
            ? 'Sign-in did not finish. Your existing identity has been kept.'
            : (result?.type ?? '')}
      </p>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
