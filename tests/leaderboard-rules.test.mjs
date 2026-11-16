import { before, beforeEach, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, set, remove, get, serverTimestamp } from 'firebase/database';

// Emulator-only, synthetic project. No production credentials.
let env;
const score = (name, value) => ({ name, value, ts: serverTimestamp() });
const board = (db, name, uid) => ref(db, 'leaderboard/' + name + '/' + uid);
const visitor = (uid) => env.authenticatedContext(uid).database();
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-b24dul-leaderboard-rules',
    database: { rules: readFileSync('firebase/database.rules.proposed.json', 'utf8') }
  });
});
beforeEach(async () => env.clearDatabase());
after(async () => { if (env) await env.cleanup(); });
async function seed(name, uid, value) {
  await env.withSecurityRulesDisabled(async c =>
    set(board(c.database(), name, uid), { name: 'BraveOtter27', value, ts: Date.now() - 60000 }));
}

test('normal Sudoku and 2048 submissions work', async () => {
  await assertSucceeds(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 125)));
  await assertSucceeds(set(board(visitor('alice'), 'g2048', 'alice'), score('BraveOtter27', 1024)));
});
test('public board remains readable', async () => {
  await seed('easy', 'alice', 125);
  const snap = await assertSucceeds(get(ref(env.unauthenticatedContext().database(), 'leaderboard/easy')));
  assert.equal(snap.child('alice/value').val(), 125);
});
test('unauthenticated and cross-user writes blocked', async () => {
  await assertFails(set(board(env.unauthenticatedContext().database(), 'easy', 'alice'), score('BraveOtter27', 125)));
  await assertFails(set(board(visitor('alice'), 'easy', 'bob'), score('BraveOtter27', 125)));
});
test('banned visitor cannot submit', async () => {
  await env.withSecurityRulesDisabled(async c => set(ref(c.database(), 'banned/alice'), true));
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 125)));
});
test('Sudoku worse or equal blocked, better accepted', async () => {
  await seed('easy', 'alice', 100);
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 120)));
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 100)));
  await assertSucceeds(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 90)));
});
test('2048 worse blocked, better accepted', async () => {
  await seed('g2048', 'alice', 512);
  await assertFails(set(board(visitor('alice'), 'g2048', 'alice'), score('BraveOtter27', 256)));
  await assertSucceeds(set(board(visitor('alice'), 'g2048', 'alice'), score('BraveOtter27', 1024)));
});
test('deletion, extra fields, missing fields, unknown boards rejected', async () => {
  await seed('easy', 'alice', 125);
  await assertFails(remove(board(visitor('alice'), 'easy', 'alice')));
  await assertFails(set(board(visitor('alice'), 'medium', 'alice'), { ...score('BraveOtter27', 125), verified: true }));
  await assertFails(set(board(visitor('alice'), 'medium', 'alice'), { name: 'BraveOtter27', value: 125 }));
  await assertFails(set(board(visitor('alice'), 'other', 'alice'), score('BraveOtter27', 125)));
});
test('numeric and name format checks', async () => {
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 1.5)));
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('BraveOtter27', 86401)));
  await assertFails(set(board(visitor('alice'), 'g2048', 'alice'), score('BraveOtter27', 5)));
  await assertFails(set(board(visitor('alice'), 'easy', 'alice'), score('Fake Name', 125)));
  await env.withSecurityRulesDisabled(async c => set(ref(c.database(), 'names/alice'), 'HelpfulPlayer'));
  await assertSucceeds(set(board(visitor('alice'), 'easy', 'alice'), score('HelpfulPlayer', 125)));
});
