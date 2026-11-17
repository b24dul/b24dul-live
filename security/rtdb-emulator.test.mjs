import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getDatabase, ref, get, set, update, remove, serverTimestamp } from 'firebase/database';

const path = process.env.RTDB_RULES_PATH;
if (!path) throw new Error('RTDB_RULES_PATH must point to the private owner-supplied rules snapshot');
const ruleSource = readFileSync(path, 'utf8');
const parsed = JSON.parse(ruleSource);
const claim = parsed.rules?.privacyRequests?.['.read']?.match(/auth\.token\.email === '([^']+)'/);
if (!claim) throw new Error('Unable to derive the legacy administrator email from rule snapshot');
const adminEmail = claim[1];

let environment;
let guest;
let user;
let other;
let admin;
const db = (context) => context.database();

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-b24dul-security',
    database: { host: '127.0.0.1', port: 9000, rules: ruleSource },
  });
  guest = environment.unauthenticatedContext();
  user = environment.authenticatedContext('visitor-a');
  other = environment.authenticatedContext('visitor-b');
  admin = environment.authenticatedContext('admin-user', {
    email: adminEmail,
    email_verified: true,
  });
  await environment.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(db(ctx), 'viewers/visitor-a/realName'), 'Test User');
    await set(ref(db(ctx), 'settings/chatEnabled'), true);
  });
});
after(async () => {
  if (environment) await environment.cleanup();
});

test('public messages readable; private viewer records are owner/admin-only', async () => {
  await assertSucceeds(get(ref(db(guest), 'messages')));
  await assertSucceeds(get(ref(db(user), 'viewers/visitor-a')));
  await assertFails(get(ref(db(user), 'viewers/visitor-b')));
  await assertFails(get(ref(db(guest), 'viewers/visitor-a')));
  await assertSucceeds(get(ref(db(admin), 'viewers')));
});

test('presence and viewer writes are isolated by UID', async () => {
  await assertSucceeds(set(ref(db(user), 'status/visitor-a'), Date.now()));
  await assertFails(set(ref(db(user), 'status/visitor-b'), Date.now()));
  await assertFails(set(ref(db(other), 'viewers/visitor-a/realName'), 'Other Name'));
  await assertFails(get(ref(db(user), 'status')));
});

test('moderation changes and privacy history are administrator-only', async () => {
  await assertFails(set(ref(db(user), 'banned/visitor-b'), true));
  await assertSucceeds(set(ref(db(admin), 'banned/visitor-b'), true));
  await assertFails(get(ref(db(user), 'privacyRequests')));
  await assertSucceeds(get(ref(db(admin), 'privacyRequests')));
  await assertFails(set(ref(db(user), 'privacyRequests/request-123'), {
    uid: 'visitor-a',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
});

test('a visitor cannot write another visitor\'s leaderboard entry', async () => {
  await assertFails(set(ref(db(user), 'leaderboard/g2048/visitor-b'), {
    name: 'AlphaBravo12',
    value: 4,
    ts: serverTimestamp(),
  }));
});

test('current rules allow owners to delete their own viewer subtree', async () => {
  // Regression documenting a real design risk, not desired future behaviour.
  await assertSucceeds(remove(ref(db(user), 'viewers/visitor-a')));
});
