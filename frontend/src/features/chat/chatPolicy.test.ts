import { describe, expect, it } from 'vitest';
import { checkNickname, cleanMessage, prepareMessage, suggestNickname } from './chatPolicy';

describe('nicknames', () => {
  it.each([
    'ab',
    'a'.repeat(21),
    'has space',
    'Admin',
    'ADM1N',
    'B24DUL',
    'b_24-dul',
    'b24du1',
    'Moderator7',
    'Mod_Sam',
    'chatmod',
    'TheOwner',
    'B24DUL_Support',
    'Fuck_off',
    'sh1thead',
  ])('rejects %s', (nickname) => expect(checkNickname(nickname).ok).toBe(false));

  it.each(['CalmHeron10', 'modern_art', 'Abdul_99', 'x-y-z'])('accepts %s', (nickname) =>
    expect(checkNickname(nickname)).toEqual({ ok: true }),
  );

  it('suggests valid anonymous nicknames like SwiftOtter42', () => {
    for (let index = 0; index < 50; index++) {
      const nickname = suggestNickname();
      expect(nickname).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
      expect(checkNickname(nickname)).toEqual({ ok: true });
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
