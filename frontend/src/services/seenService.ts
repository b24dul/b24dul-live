// Loaded on demand for Google sign-ins only. Records when the account was first and last seen,
// so the admin can see who uses the site. No names, emails, IP addresses or device details.
import { get, ref, serverTimestamp, set, update, type Database } from 'firebase/database';

const MIN_GAP_MS = 60_000; // the rules refuse updates closer together than this

export async function recordSeen(database: Database, uid: string, now = Date.now()) {
  const at = ref(database, `v2/users/${uid}`);
  const current = (await get(at)).val() as { lastSeen?: number } | null;
  if (!current) return set(at, { firstSeen: serverTimestamp(), lastSeen: serverTimestamp() });
  if (current.lastSeen !== undefined && now - current.lastSeen < MIN_GAP_MS) return;
  return update(at, { lastSeen: serverTimestamp() });
}
