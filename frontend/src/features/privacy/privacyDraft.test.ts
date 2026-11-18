import { describe, expect, it } from 'vitest';
import { privacyRequestMailto } from './privacyDraft';

describe('privacy request email draft', () => {
  it('uses the legacy request destination and encodes the visitor ID', () => {
    const draft = privacyRequestMailto('  visitor_123  ');
    expect(draft).not.toBeNull();
    const url = new URL(draft!);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('b24dul@gmail.com');
    expect(url.searchParams.get('subject')).toBe('B24DUL Live - visitor data deletion request');
    expect(url.searchParams.get('body')).toContain('Visitor Firebase UID: visitor_123');
    expect(url.searchParams.get('body')).toContain('public chat messages may need separate review');
  });
  it('rejects missing, malformed and header-injection IDs', () => {
    for (const uid of ['', 'abc', 'a'.repeat(129), 'valid-id\nBcc:other@example.com', 'abc def']) {
      expect(privacyRequestMailto(uid)).toBeNull();
    }
  });
});
