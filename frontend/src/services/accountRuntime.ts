// Loaded on demand (dynamic import) so Firebase is not part of the initial page bundle.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FIREBASE_APP_NAME, firebaseConfig } from './firebaseConfig';
import { createFirebaseIdentity } from './firebaseIdentity';

export function startAccountRuntime() {
  const app = getApps().some((existing) => existing.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(firebaseConfig, FIREBASE_APP_NAME);
  return createFirebaseIdentity(getAuth(app));
}

export type AccountRuntime = ReturnType<typeof startAccountRuntime>;
