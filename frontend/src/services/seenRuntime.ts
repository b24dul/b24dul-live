// Loaded on demand (dynamic import) for Google sign-ins only.
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { recordSeen } from './seenService';
import { recordEmail, tokenEmail } from './userEmailService';

export function recordSeenNow(uid: string) {
  return recordSeen(getDatabase(firebaseApp()), uid);
}

/** Saves the Google email of the account signed in right now (admin-only path). */
export async function recordEmailNow(uid: string) {
  const user = getAuth(firebaseApp()).currentUser;
  if (!user || user.uid !== uid) return;
  const email = await tokenEmail(user);
  if (email) await recordEmail(getDatabase(firebaseApp()), uid, email);
}
