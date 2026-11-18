// Chat policy. The database rules (firebase/v2.rules.json) enforce the same word
// lists, limits and patterns; the emulator tests check that both stay in step.

export const MAX_MESSAGE_LENGTH = 200;
export const MAX_MESSAGES_SHOWN = 100;
export const SLOW_MODE_MS = 5000;
export const MUTE_MINUTES = [1, 5, 10, 30, 60] as const;

/** Masked in messages (and rejected by the database rules). */
export const BLOCKED_WORDS = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'wanker',
  'twat',
  'dickhead',
  'nigg',
  'faggot',
  'retard',
  'whore',
  'slut',
  'pussy',
] as const;

const ADJECTIVES = [
  'Quiet',
  'Swift',
  'Lucky',
  'Brave',
  'Sneaky',
  'Chill',
  'Fuzzy',
  'Rapid',
  'Silent',
  'Happy',
  'Cosmic',
  'Frosty',
  'Golden',
  'Mighty',
  'Sleepy',
  'Clever',
  'Wild',
  'Shady',
  'Turbo',
  'Calm',
];
const ANIMALS = [
  'Otter',
  'Fox',
  'Panda',
  'Falcon',
  'Badger',
  'Tiger',
  'Koala',
  'Wolf',
  'Owl',
  'Gecko',
  'Shark',
  'Raven',
  'Bison',
  'Lynx',
  'Moose',
  'Hare',
  'Cobra',
  'Yak',
  'Crab',
  'Heron',
];

/** Shown instead of a generated name for accounts on the admin list. */
export const ADMIN_CHAT_NAME = 'B24DUL';

/**
 * Everyone's chat name is generated from their account ID (e.g. SwiftOtter42), the same on every
 * device. Nobody chooses a name and nothing is stored, so a real name can never appear.
 */
export function chatNameFor(uid: string) {
  // FNV-1a 32-bit hash of the account ID.
  let hash = 0x811c9dc5;
  for (let index = 0; index < uid.length; index++) {
    hash ^= uid.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (
    ADJECTIVES[hash % ADJECTIVES.length]! +
    ANIMALS[(hash >>> 8) % ANIMALS.length]! +
    String(10 + ((hash >>> 16) % 90))
  );
}

/** Collapses whitespace and masks blocked words with asterisks, as on the old site. */
export function cleanMessage(text: string) {
  let out = text.replace(/\s+/g, ' ').trim();
  for (const word of BLOCKED_WORDS)
    out = out.replace(new RegExp(word, 'gi'), '*'.repeat(word.length));
  return out;
}

export const LINK_PATTERN = /(https?:|www\.|\.com|\.co\.uk)/i;
export const EMAIL_PATTERN = /[a-z0-9._-]+@[a-z0-9-]+\.[a-z][a-z]/i;
export const PHONE_PATTERN = /[0-9]([ .-]?[0-9]){9}/;

// From the old site: blocks asking for or sharing personal information.
const PRIVACY_PATTERNS = [
  /\b(what|wats|whats|wat|wht|wuts?)\s*(is|s)?\s*(your|ur|yo)\s*(real\s*|actual\s*)?(name|age|snap|insta|ig|number|num|discord|tiktok|address|school|gamertag|psn|tag)\b/,
  /\bwho\s+(are|r)\s+(you|u|ya)\s*(irl|really|in real life|for real)?\s*$/,
  /\b(are|r)\s+(you|u|ya)\s+(a\s+)?(boy|girl|guy|male|female|man|woman|lad|lass|single|taken)\b/,
  /\b(boy|girl|guy|m|f|male|female)\s+or\s+(boy|girl|guy|m|f|male|female)\b/,
  /\b(asl|a\/s\/l)\b/,
  /\bhow\s+old\s+(are|r|is)\s+(you|u|ya|everyone|people)\b/,
  /\b(your|ur)\s+(age|gender|real\s*name)\b/,
  /\bwhere\s+(do|d)\s+(you|u|ya)\s+(live|stay|go\s+to\s+school|come\s+from)\b/,
  /\bwhere\s+(are|r)\s+(you|u|ya)\s+from\b/,
  /\b(what|which|wat)\s+(school|college|uni|area|city|town)\b/,
  /\b(dm|message|msg|text|call|follow)\s+me\b/,
  /\badd\s+me\s+(on|at|@)\b/,
  /\b(snap|snapchat|sc|insta|instagram|whatsapp|whats\s*app|discord|telegram|kik|tiktok|facebook|fb|psn\s*id)\b/,
  /\b(send|show)\s+(me\s+)?(a\s+|ur\s+|your\s+)?(pic|pics|picture|photo|face|selfie|nudes?)\b/,
  /\bmy\s+(real\s+)?(name|number|snap|insta|discord|address|school)\s+(is|s)\b/,
  /\b(i\s*am|im|i\s*m)\s+\d{1,2}\s*(yo|y\/o|years?|yrs?)\b/,
  /\b(0|\+44)\s*7\d{3}\s*\d{3}\s*\d{3}\b/,
  /\d{3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
  /[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/,
];

// Zero-width space, joiners and byte-order mark (written as code points to keep the source ASCII).
const ZERO_WIDTH = new RegExp(
  '[' +
    String.fromCodePoint(0x200b) +
    '-' +
    String.fromCodePoint(0x200d) +
    String.fromCodePoint(0xfeff) +
    ']',
  'g',
);

function normaliseForPrivacy(text: string) {
  return text
    .toLowerCase()
    .replace(ZERO_WIDTH, '')
    .replace(/[’`']/g, '')
    .replace(/[^a-z0-9@+./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type MessageCheck = { ok: true; text: string } | { ok: false; reason: string };

/** What the chat box does before sending. The database rules re-check length, words, links, emails and phone numbers. */
export function prepareMessage(raw: string): MessageCheck {
  const text = cleanMessage(raw);
  if (!text) return { ok: false, reason: 'Type a message first.' };
  if (text.length > MAX_MESSAGE_LENGTH)
    return { ok: false, reason: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.` };
  if (LINK_PATTERN.test(text)) return { ok: false, reason: 'Links aren’t allowed in chat.' };
  const normalised = normaliseForPrivacy(text);
  if (
    EMAIL_PATTERN.test(text) ||
    PHONE_PATTERN.test(text) ||
    PRIVACY_PATTERNS.some((pattern) => pattern.test(normalised))
  )
    return {
      ok: false,
      reason:
        'Keep personal details out of chat — don’t ask for or share names, ages, places or contacts.',
    };
  return { ok: true, text };
}
