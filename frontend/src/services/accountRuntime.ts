// Loaded on demand (dynamic import) so Firebase is not part of the initial page bundle.
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebaseApp';
import { createFirebaseIdentity } from './firebaseIdentity';

export function startAccountRuntime() {
  return createFirebaseIdentity(getAuth(firebaseApp()));
}

export type AccountRuntime = ReturnType<typeof startAccountRuntime>;
