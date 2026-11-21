// Adds the /v2/ rules alongside an existing (legacy) RTDB rules file, leaving every legacy rule
// unchanged. Never prints rule contents: the legacy rules are private.
//
//   node scripts/merge-v2-rules.mjs <deployed-rules.json> <v2-rules.json> <output.json>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export function mergeV2Rules(deployedText, v2Text) {
  let deployed;
  try {
    deployed = JSON.parse(deployedText);
  } catch {
    throw new Error('The deployed rules are not plain JSON (comments?). Nothing was written.');
  }
  const v2 = JSON.parse(v2Text);
  const legacy = deployed?.rules;
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy))
    throw new Error('The deployed rules have no "rules" object.');
  if (!v2?.rules?.v2 || Object.keys(v2.rules).length !== 1)
    throw new Error('The v2 rules file must contain exactly rules.v2.');

  const warnings = [];
  const replaced = Object.hasOwn(legacy, 'v2');
  if (replaced) warnings.push('The deployed rules already have a v2 section; it is replaced.');
  // Read/write grants cascade: a grant at the root would also apply inside /v2/.
  for (const key of ['.read', '.write']) {
    if (Object.hasOwn(legacy, key) && legacy[key] !== false)
      warnings.push(
        `The legacy root has a ${key} rule that is not false; it also applies to /v2/.`,
      );
  }

  const merged = { ...deployed, rules: { ...legacy, v2: v2.rules.v2 } };
  const output = JSON.stringify(merged, null, 2) + '\n';

  // Proof that only /v2/ changed.
  const check = JSON.parse(output);
  const before = JSON.parse(deployedText);
  delete check.rules.v2;
  delete before.rules.v2;
  if (!isDeepStrictEqual(check, before)) throw new Error('Merge changed legacy rules.');
  if (!isDeepStrictEqual(JSON.parse(output).rules.v2, v2.rules.v2))
    throw new Error('Merge did not add the v2 rules exactly.');

  return {
    output,
    warnings,
    replaced,
    legacyTopLevelKeys: Object.keys(legacy).filter((k) => k !== 'v2').length,
  };
}

const sha = (text) => createHash('sha256').update(text).digest('hex');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [deployedPath, v2Path, outputPath] = process.argv.slice(2);
  if (!deployedPath || !v2Path || !outputPath) {
    process.stderr.write('Usage: merge-v2-rules.mjs <deployed.json> <v2.json> <output.json>\n');
    process.exit(2);
  }
  const deployedText = readFileSync(deployedPath, 'utf8');
  const { output, warnings, legacyTopLevelKeys } = mergeV2Rules(
    deployedText,
    readFileSync(v2Path, 'utf8'),
  );
  writeFileSync(outputPath, output);
  process.stdout.write(
    [
      `Legacy top-level paths kept unchanged: ${legacyTopLevelKeys}`,
      `Deployed rules sha256: ${sha(deployedText)}`,
      `Merged rules sha256:   ${sha(output)}`,
      ...warnings.map((warning) => `WARNING: ${warning}`),
      '',
    ].join('\n'),
  );
}
