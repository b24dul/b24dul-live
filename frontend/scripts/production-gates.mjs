/* global process, console */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function evaluateProductionGates(manifest, evidenceExists) {
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    !manifest.gates ||
    typeof manifest.gates !== 'object' ||
    Array.isArray(manifest.gates)
  ) {
    throw new Error('Invalid production gate manifest');
  }
  const names = Object.keys(manifest.gates);
  if (names.length === 0) throw new Error('Production gate list cannot be empty');
  const missing = [];
  for (const name of names) {
    const gate = manifest.gates[name];
    if (!gate || gate.passed !== true) {
      missing.push(name + ': not verified');
      continue;
    }
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      missing.push(name + ': no verification evidence');
      continue;
    }
    for (const path of gate.evidence) {
      // Only repository-local evidence can unlock a gate. URL claims cannot.
      if (
        typeof path !== 'string' ||
        !/^(src|e2e|scripts|tests)\/[A-Za-z0-9_./-]+$/.test(path) ||
        path.split('/').includes('..') ||
        !evidenceExists(path)
      ) {
        missing.push(name + ': missing local evidence ' + String(path));
      }
    }
  }
  if (manifest.status !== 'ready') {
    missing.push('manifest: not marked ready');
  }
  return { ready: missing.length === 0, missing };
}

export function checkProductionGates() {
  const manifest = JSON.parse(readFileSync(resolve(root, 'production-gates.json'), 'utf8'));
  return evaluateProductionGates(manifest, (path) => existsSync(resolve(root, path)));
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const outcome = checkProductionGates();
  if (!outcome.ready) {
    console.error('Production cutover BLOCKED; unresolved gates:');
    for (const reason of outcome.missing) console.error('- ' + reason);
    process.exitCode = 1;
  } else {
    console.log('Production feature parity gate passed; proceed to controlled deploy checks.');
  }
}
