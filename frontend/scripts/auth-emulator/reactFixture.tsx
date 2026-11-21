import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import type { AuthSession } from '../../src/services/authSession';
import { FIREBASE_APP_NAME } from '../../src/services/firebaseConfig';
import { createFirebaseIdentity, type GoogleFlow } from '../../src/services/firebaseIdentity';
import type { TransitionResult } from '../../src/services/identityTransitions';

if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
  throw new Error('This preview requires localhost');
}
// Same app name as production (separate persistence from legacy sessions), demo project only.
const auth = getAuth(
  initializeApp(
    { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: 'demo-b24dul-auth' },
    FIREBASE_APP_NAME,
  ),
);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

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

// The emulator cannot show a Google popup, so the Google step uses synthetic ID tokens.
// Its collision errors also omit the OAuth token that GoogleAuthProvider.credentialFromError
// reads, so the fixture re-creates the same synthetic credential. Production uses
// credentialFromError on the popup error (verified manually; see the slice test list).
const syntheticGoogle: GoogleFlow = {
  signIn: (target) => signInWithCredential(target, credential()),
  link: (user) => linkWithCredential(user, credential()),
  credentialFromCollision: () => credential(),
};
const identity = createFirebaseIdentity(auth, syntheticGoogle);

function Preview() {
  const [state, setState] = useState<AuthSession>({ status: 'checking' });
  const [result, setResult] = useState<TransitionResult>();
  const [pending, setPending] = useState(false);
  useEffect(() => identity.subscribe((next) => setState(next)), []);
  const run = async (action: () => Promise<TransitionResult>) => {
    setPending(true);
    try {
      setResult(await action());
    } finally {
      setPending(false);
    }
  };
  const current = state.status === 'ready' ? state.identity : undefined;
  return (
    <main>
      <h1>React identity emulator preview</h1>
      <p>Disposable test accounts only.</p>
      <output
        id="state"
        data-status={state.status}
        data-kind={current?.kind ?? ''}
        data-uid={current && 'uid' in current ? current.uid : ''}
      >
        {current?.kind ?? state.status}
      </output>
      <button
        disabled={pending || state.status !== 'ready'}
        onClick={() => void run(identity.transitions.enterAnonymously)}
      >
        Continue as guest
      </button>
      <button
        disabled={pending || state.status !== 'ready'}
        onClick={() => void run(identity.transitions.enterWithGoogle)}
      >
        Connect test Google account
      </button>
      <button
        disabled={pending || state.status !== 'ready'}
        onClick={() => void run(identity.transitions.signOut)}
      >
        Sign out
      </button>
      <p role="status" data-result={result?.type ?? ''}>
        {result?.type === 'switched'
          ? 'Signed in to the existing Google account. The guest session was not merged.'
          : result?.type === 'failed'
            ? 'Sign-in did not finish. Your existing identity has been kept.'
            : (result?.type ?? '')}
      </p>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
