// Loaded on demand (dynamic import) for Google sign-ins only.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { recordSeen } from './seenService';

export function recordSeenNow(uid: string) {
  return recordSeen(getDatabase(firebaseApp()), uid);
}
