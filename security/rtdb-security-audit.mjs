import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const owned = (expr) => typeof expr === 'string' && expr.includes('auth.uid === $uid');
const admin = (expr) =>
  typeof expr === 'string' &&
  expr.includes('auth.token.email') &&
  expr.includes('auth.token.email_verified === true');
const guarded = (expr) => typeof expr === 'string' && expr.includes('auth != null');

export function inspectRules(payload) {
  const rules = payload?.rules;
  const errors = [];
  const warnings = [];
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    return { passed: false, errors: ['Missing Realtime Database rules root'], warnings };
  }
  const requireRule = (label, condition) => {
    if (!condition) errors.push(label);
  };
  requireRule('Root must not allow global read access', rules['.read'] !== true);
  requireRule('Root must not allow global write access', rules['.write'] !== true);
  for (const key of [
    'messages',
    'lastPost',
    'banned',
    'timeouts',
    'names',
    'viewers',
    'status',
    'settings',
    'leaderboard',
    'privacyRequests',
  ]) {
    requireRule('Missing ' + key + ' rules', Boolean(rules[key]));
  }
  const msg = rules.messages?.$msgId;
  requireRule('Messages must have user/auth write restrictions', guarded(msg?.['.write']));
  requireRule('Messages must verify message ownership', msg?.['.write']?.includes("child('uid').val() === auth.uid"));
  requireRule('Chat must enforce a rate-limit timestamp', msg?.['.write']?.includes('5000'));
  requireRule('Chat must check banned users', msg?.['.write']?.includes("child('banned')"));
  requireRule('Chat must check timeouts', msg?.['.write']?.includes("child('timeouts')"));
  requireRule('Chat must validate message content', msg?.['.validate']?.includes("child('text')"));
  requireRule('Ordinary users may only write their own rate-limit path', owned(rules.lastPost?.$uid?.['.write']));
  requireRule('Viewer record reads must be owner-restricted', owned(rules.viewers?.$uid?.['.read']));
  requireRule('Viewer record writes must be owner/admin-restricted', owned(rules.viewers?.$uid?.['.write']) && admin(rules.viewers?.$uid?.['.write']));
  requireRule('Presence writes must be owner-only', owned(rules.status?.$uid?.['.write']));
  requireRule('Bans must be administrator-written', admin(rules.banned?.$uid?.['.write']));
  requireRule('Timeouts must be administrator-written', admin(rules.timeouts?.$uid?.['.write']));
  requireRule('Public names must be administrator-written', admin(rules.names?.$uid?.['.write']));
  requireRule('Admin viewer reads must require verified identity', admin(rules.viewers?.['.read']));
  requireRule('Admin presence reads must require verified identity', admin(rules.status?.['.read']));
  requireRule('Leaderboard writes must be owner-only', owned(rules.leaderboard?.$board?.$uid?.['.write']));
  requireRule('Privacy requests must require verified admin', admin(rules.privacyRequests?.['.read']) && admin(rules.privacyRequests?.$requestId?.['.write']));
  requireRule('Privacy request deletions must not be accepted', rules.privacyRequests?.$requestId?.['.write']?.includes('newData.exists()'));
  requireRule('Chat settings writes must require verified admin', admin(rules.settings?.chatEnabled?.['.write']));
  warnings.push('Static inspection cannot establish what rules are actually deployed or enforce them like the Firebase emulator.');
  warnings.push('Leaderboard client-side scores lack gameplay attestation; range checks do not prevent forged results.');
  warnings.push('Owner-writable viewer subtrees may be deleted using parent writes; Firebase validate does not run on deletion.');
  warnings.push('Administrator status is based on one verified email, not a dedicated immutable custom claim.');
  return { passed: errors.length === 0, errors, warnings };
}

export function loadRules(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

if (process.argv[1] && /rtdb-security-audit\.mjs$/.test(process.argv[1])) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node security/rtdb-security-audit.mjs /path/to/private-rules.json');
    process.exitCode = 2;
  } else {
    try {
      const result = inspectRules(loadRules(path));
      console.log(JSON.stringify(result, null, 2));
      if (!result.passed) process.exitCode = 1;
    } catch (error) {
      console.error('Could not inspect supplied snapshot:', error.message);
      process.exitCode = 2;
    }
  }
}
