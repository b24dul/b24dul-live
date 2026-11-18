import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProductionGates, evaluateProductionGates } from './production-gates.mjs';

test('production deployment is blocked with currently unverified feature parity', () => {
  const gate = checkProductionGates();
  assert.equal(gate.ready, false);
  assert.ok(gate.missing.includes('manifest: not marked ready'));
  assert.ok(gate.missing.some((entry) => entry.startsWith('leaderboards')));
});

test('every gate must be verified and have a real local evidence path', () => {
  const gate = {
    schemaVersion: 1,
    status: 'ready',
    gates: {
      account: { passed: true, evidence: ['src/services/authObserver.test.ts'] },
      chat: { passed: true, evidence: ['e2e/chat.spec.ts'] },
    },
  };
  assert.equal(evaluateProductionGates(gate, () => true).ready, true);
  assert.equal(evaluateProductionGates(gate, (path) => !path.includes('chat')).ready, false);
});

test('a false gate or unsupported evidence never unlocks production', () => {
  const base = {
    schemaVersion: 1,
    status: 'ready',
    gates: { chat: { passed: false, evidence: ['e2e/chat.spec.ts'] } },
  };
  assert.equal(evaluateProductionGates(base, () => true).ready, false);
  base.gates.chat.passed = true;
  base.gates.chat.evidence = ['https://example.com/claimed-success'];
  assert.equal(evaluateProductionGates(base, () => true).ready, false);
  base.gates.chat.evidence = ['../secrets.txt'];
  assert.equal(evaluateProductionGates(base, () => true).ready, false);
});

test('a gate can be marked not applicable only with a written reason', () => {
  const manifest = (gate) => ({
    schemaVersion: 1,
    status: 'ready',
    gates: { chat: { passed: true, evidence: ['e2e/chat.spec.ts'] }, old: gate },
  });
  const reason = 'owner chose a fresh start on 2026-11-18';
  assert.equal(
    evaluateProductionGates(manifest({ notApplicable: true, reason }), () => true).ready,
    true,
  );
  for (const gate of [
    { notApplicable: true },
    { notApplicable: true, reason: ' ' },
    { notApplicable: 'yes', reason },
    { notApplicable: true, reason, passed: true },
  ]) {
    assert.equal(evaluateProductionGates(manifest(gate), () => true).ready, false);
  }
});
