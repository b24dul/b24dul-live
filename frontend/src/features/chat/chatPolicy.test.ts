import { describe, expect, it } from 'vitest';
import { BLOCKED_WORDS, chatNameFor, cleanMessage, prepareMessage } from './chatPolicy';

describe('generated chat names', () => {
  it('are made from the account ID, the same every time, like SwiftOtter42', () => {
    expect(chatNameFor('abc123')).toBe(chatNameFor('abc123'));
    const names = new Set<string>();
    for (let index = 0; index < 500; index++) {
      const name = chatNameFor('uid-' + index + '-' + Math.random().toString(36).slice(2));
      expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+[1-9][0-9]$/);
      names.add(name);
    }
    expect(names.size).toBeGreaterThan(450);
  });

  it('can never spell a blocked word or look like staff', () => {
    const name = chatNameFor('anything').toLowerCase();
    expect(name).not.toMatch(/admin|b24dul|mod|owner|staff|official/);
    for (let index = 0; index < 2000; index++) {
      const generated = chatNameFor(String(index)).toLowerCase();
      for (const word of BLOCKED_WORDS) expect(generated).not.toContain(word);
      expect(generated).not.toMatch(/admin|b24dul|moderat|owner|staff|official/);
    }
  });
});

describe('messages', () => {
  it('masks blocked words and tidies whitespace', () => {
    expect(cleanMessage('  what   the FUCK  ')).toBe('what the ****');
  });

  it.each([
    ['', /Type a message/],
    ['a'.repeat(201), /200 characters/],
    ['see https://example.org', /Links/],
    ['site.com', /Links/],
    ['mail me at someone@example.org', /personal details/],
    ['call 07700 900123', /personal details/],
    ['whats your name', /personal details/],
    ['how old are you', /personal details/],
    ['add me on snap', /personal details/],
    ['i am 14 years old', /personal details/],
  ])('rejects %j', (text, reason) => {
    const result = prepareMessage(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it('allows ordinary chat, including scores', () => {
    expect(prepareMessage('GG! 2048 score 123456789 in 3 minutes')).toEqual({
      ok: true,
      text: 'GG! 2048 score 123456789 in 3 minutes',
    });
  });
});
