import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectRules } from './rtdb-security-audit.mjs';

const admin = "auth != null && auth.token.email === 'admin@example.test' && auth.token.email_verified === true";
const own = 'auth != null && auth.uid === $uid';
function fixture() {
  return {
    rules: {
      messages: {
        $msgId: {
          '.write': "auth != null && newData.child('uid').val() === auth.uid && root.child('banned') && root.child('timeouts') && 5000",
          '.validate': "newData.child('text')",
        },
      },
      lastPost: { $uid: { '.write': own } },
      banned: { $uid: { '.write': admin } },
      timeouts: { $uid: { '.write': admin } },
      names: { $uid: { '.write': admin } },
      viewers: {
        '.read': admin,
        $uid: { '.read': own, '.write': own + ' || (' + admin + ')' },
      },
      status: { '.read': admin, $uid: { '.write': own } },
      settings: { chatEnabled: { '.write': admin } },
      leaderboard: { $board: { $uid: { '.write': own } } },
      privacyRequests: {
        '.read': admin,
        $requestId: { '.write': admin + ' && newData.exists()' },
      },
    },
  };
}

test('a complete synthetic guarded rule tree passes the static contract', () => {
  const result = inspectRules(fixture());
  assert.equal(result.passed, true, result.errors.join('; '));
  assert.ok(result.warnings.length > 0);
});
test('missing and globally writable rules fail closed', () => {
  assert.equal(inspectRules(null).passed, false);
  const input = fixture();
  input.rules['.write'] = true;
  assert.equal(inspectRules(input).passed, false);
});
test('regression: an unverified admin or unowned user-write fails', () => {
  const input = fixture();
  input.rules.banned.$uid['.write'] = 'auth != null';
  input.rules.status.$uid['.write'] = 'auth != null';
  const out = inspectRules(input);
  assert.equal(out.passed, false);
  assert.ok(out.errors.some((e) => e.includes('administrator-written')));
  assert.ok(out.errors.some((e) => e.includes('Presence writes')));
});
test('regression: privacy request deletion and forged board ownership are caught', () => {
  const input = fixture();
  input.rules.privacyRequests.$requestId['.write'] = admin;
  input.rules.leaderboard.$board.$uid['.write'] = 'auth != null';
  const out = inspectRules(input);
  assert.equal(out.passed, false);
  assert.ok(out.errors.some((e) => e.includes('deletions')));
  assert.ok(out.errors.some((e) => e.includes('Leaderboard')));
});
