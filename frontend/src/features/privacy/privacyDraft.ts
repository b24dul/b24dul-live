/** Builds the existing visitor-data request without creating an account or making a network call. */
export function privacyRequestMailto(input: string): string | null {
  const uid = input.trim();
  if (!/^[A-Za-z0-9:_-]{6,128}$/.test(uid)) return null;
  const subject = 'B24DUL Live - visitor data deletion request';
  const body = [
    'Please review and delete my private B24DUL Live visitor record,',
    'including my real name, visitor analytics and activity history.',
    'Please also review any leaderboard entries associated with this ID.',
    'I understand public chat messages may need separate review.',
    '',
    `Visitor Firebase UID: ${uid}`,
    '',
    'Please confirm when the request has been handled.',
  ].join('\n');
  return `mailto:b24dul@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
