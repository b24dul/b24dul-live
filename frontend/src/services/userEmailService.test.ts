import { describe, expect, it } from 'vitest';
import { tokenEmail } from './userEmailService';

const user = (claims: Record<string, unknown>, isAnonymous = false) => ({
  isAnonymous,
  getIdTokenResult: async () => ({ claims }),
});

describe('tokenEmail', () => {
  it('takes the email from a Google sign-in token', async () => {
    const claims = {
      email: 'tester@example.invalid',
      firebase: { sign_in_provider: 'google.com' },
    };
    expect(await tokenEmail(user(claims))).toBe('tester@example.invalid');
  });

  it('returns nothing for guests or other sign-in methods', async () => {
    expect(
      await tokenEmail(user({ firebase: { sign_in_provider: 'anonymous' } }, true)),
    ).toBeNull();
    expect(
      await tokenEmail(
        user({ email: 'x@example.invalid', firebase: { sign_in_provider: 'password' } }),
      ),
    ).toBeNull();
    expect(await tokenEmail(user({ firebase: { sign_in_provider: 'google.com' } }))).toBeNull();
  });
});
