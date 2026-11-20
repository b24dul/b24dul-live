// Google sign-ins only: keeps the Google account's email address at an admin-only path
// (/v2/userEmails/{uid}), for moderation and privacy requests. No name or photo. The rules accept
// only the signed-in account's own entry, only for Google sign-ins, and only the exact email in
// its sign-in token, so it cannot be faked.
import { ref, serverTimestamp, set, type Database } from 'firebase/database';

/** The email in a Google sign-in token, or null (guests have none). */
export async function tokenEmail(user: {
  isAnonymous: boolean;
  getIdTokenResult(): Promise<{ claims: Record<string, unknown> }>;
}) {
  if (user.isAnonymous) return null;
  const { claims } = await user.getIdTokenResult();
  const provider = (claims.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
  return provider === 'google.com' && typeof claims.email === 'string' ? claims.email : null;
}

export function recordEmail(database: Database, uid: string, email: string) {
  return set(ref(database, `v2/userEmails/${uid}`), { email, updatedAt: serverTimestamp() });
}
