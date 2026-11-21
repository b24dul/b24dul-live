// This browser fixture only runs on loopback against the disposable demo emulator.
if (location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') {
  throw new Error('The Auth test fixture only runs on localhost');
}

const legacy = new URLSearchParams(location.search).get('sdk') === 'legacy';
const appSdk = legacy ? await import('firebase-legacy/app') : await import('firebase/app');
const authSdk = legacy ? await import('firebase-legacy/auth') : await import('firebase/auth');
const app = appSdk.initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-b24dul-auth',
});
const auth = authSdk.getAuth(app);
authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const state = document.querySelector<HTMLOutputElement>('#state')!;
const errorOutput = document.querySelector<HTMLOutputElement>('#error')!;
let ready = false;
// Linking changes the token without changing the UID, so observe token changes.
authSdk.onIdTokenChanged(auth, (user) => {
  ready = true;
  state.dataset.status = 'ready';
  state.dataset.uid = user?.uid ?? '';
  state.dataset.kind = user ? (user.isAnonymous ? 'anonymous' : 'linked') : 'signed-out';
});
const run = (operation: () => Promise<unknown>) => {
  operation().catch((error: unknown) => {
    errorOutput.textContent = error instanceof Error ? error.message : 'Test action failed';
  });
};
document.querySelector('#guest')!.addEventListener('click', () => {
  if (ready && !auth.currentUser) run(() => authSdk.signInAnonymously(auth));
});
document
  .querySelector('#signout')!
  .addEventListener('click', () => run(() => authSdk.signOut(auth)));
document.querySelector('#link')!.addEventListener('click', () => {
  const user = auth.currentUser;
  if (!ready || !user?.isAnonymous) return;
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const subject = new URLSearchParams(location.search).get('subject') ?? 'browser-test-google';
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: 'https://accounts.google.com',
    aud: 'demo-b24dul-auth',
    sub: subject,
    email: `${subject}@example.invalid`,
    email_verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.`;
  const credential = authSdk.GoogleAuthProvider.credential(token);
  run(() => authSdk.linkWithCredential(user, credential));
});
