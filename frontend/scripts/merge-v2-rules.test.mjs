import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { mergeV2Rules } from './merge-v2-rules.mjs';

const v2 = readFileSync(new URL('../../firebase/v2.rules.json', import.meta.url), 'utf8');
const legacy = readFileSync(
  new URL('./rtdb-emulator/synthetic.rules.json', import.meta.url),
  'utf8',
);

describe('merge-v2-rules', () => {
  it('adds /v2/ and keeps every legacy rule exactly', () => {
    const { output, warnings, replaced } = mergeV2Rules(legacy, v2);
    const merged = JSON.parse(output);
    const original = JSON.parse(legacy);
    assert.deepEqual(Object.keys(merged.rules), [...Object.keys(original.rules), 'v2']);
    for (const key of Object.keys(original.rules))
      assert.deepEqual(merged.rules[key], original.rules[key]);
    assert.deepEqual(merged.rules.v2, JSON.parse(v2).rules.v2);
    assert.deepEqual(warnings, []);
    assert.equal(replaced, false);
  });

  it('is repeatable: merging again replaces only /v2/', () => {
    const once = mergeV2Rules(legacy, v2).output;
    const twice = mergeV2Rules(once, v2);
    assert.equal(twice.output, once);
    assert.equal(twice.replaced, true);
  });

  it('warns when a legacy root grant would cascade into /v2/', () => {
    const open = JSON.stringify({ rules: { '.read': 'auth != null', messages: {} } });
    assert.match(mergeV2Rules(open, v2).warnings.join('\n'), /root has a \.read rule/);
  });

  it('refuses input that is not plain JSON, without echoing it', () => {
    assert.throws(
      () => mergeV2Rules('{ // secret\n "rules": {} }', v2),
      (error) => {
        assert.doesNotMatch(error.message, /secret/);
        return true;
      },
    );
    assert.throws(() => mergeV2Rules('{"notRules": {}}', v2), /no "rules" object/);
  });
});
