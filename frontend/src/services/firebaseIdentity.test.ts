import { describe, expect, it } from 'vitest';
import { googleProvider } from './firebaseIdentity';

describe('Google provider', () => {
  it('always shows the Google account chooser', () => {
    expect(googleProvider().getCustomParameters()).toEqual({ prompt: 'select_account' });
  });
});
