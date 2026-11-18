// Real RTDB emulator tests for the /v2/ rules in firebase/v2.rules.json (demo project only).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInAnonymously,
  signInWithCredential,
} from 'firebase/auth';
import {
  get,
  goOffline,
  limitToLast,
  orderByChild,
  equalTo,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { createRtdbEmulatorFixture } from './presenceFixture.ts';
import { createChatService } from '../../src/services/chatService.ts';
import { BLOCKED_WORDS } from '../../src/features/chat/chatPolicy.ts';

const NS = 'demo-b24dul-rtdb-default-rtdb';
type Fixture = ReturnType<typeof createRtdbEmulatorFixture>;
type User = Fixture & { uid: string };
const fixtures: Fixture[] = [];
let alice: User;
let bob: User;
let admin: User;

/** Synthetic Google ID token for the Auth emulator only. */
function googleCredential(subject: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return GoogleAuthProvider.credential(
    `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      iss: 'https://accounts.google.com',
      aud: 'demo-b24dul-rtdb',
      sub: subject,
      email: `${subject}@example.invalid`,
      email_verified: true,
      iat: now,
      exp: now + 3600,
    })}.`,
  );
}

function fixture(name: string) {
  const created = createRtdbEmulatorFixture(name);
  fixtures.push(created);
  return created;
}

/** A Google-signed-in user (the only kind that may talk). */
async function googleUser(name: string): Promise<User> {
  const created = fixture(name);
  const uid = (await signInWithCredential(created.auth, googleCredential(name))).user.uid;
  return Object.assign(created, { uid });
}

async function guest(name: string): Promise<User> {
  const created = fixture(name);
  const uid = (await signInAnonymously(created.auth)).user.uid;
  return Object.assign(created, { uid });
}

/** Seeds data as the emulator owner (bypasses rules), like the Firebase console would. */
async function seed(path: string, value: unknown) {
  const response = await fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: JSON.stringify(value),
  });
  assert.equal(response.status, 200, await response.text());
}

const denied = (promise: Promise<unknown>) => assert.rejects(promise, /permission.denied/i);

function post(who: User, text: string, extra: Record<string, unknown> = {}) {
  const key = push(ref(who.database, 'v2/chat/messages')).key!;
  return update(ref(who.database), {
    [`v2/chat/messages/${key}`]: { uid: who.uid, text, ts: serverTimestamp(), ...extra },
    [`v2/chat/lastPost/${who.uid}`]: serverTimestamp(),
  }).then(() => key);
}

const last100 = (who: Fixture) => query(ref(who.database, 'v2/chat/messages'), limitToLast(100));

/** Waits out the 5-second slow mode for a user. */
const slowMode = () => delay(5100);

before(async () => {
  alice = await googleUser('v2-alice');
  bob = await googleUser('v2-bob');
  admin = await googleUser('v2-admin');
  await seed('v2', null);
  await seed(`v2/admins/${admin.uid}`, true);
});

after(async () => {
  for (const created of fixtures) goOffline(created.database);
  await Promise.all(fixtures.map((created) => created.close()));
});

describe('/v2/ rules', { timeout: 120000 }, () => {
  it('keep client and rules word lists in step', () => {
    const rules = readFileSync(new URL('../../../firebase/v2.rules.json', import.meta.url), 'utf8');
    assert.ok(rules.includes('(' + BLOCKED_WORDS.join('|') + ')'), 'blocked words differ');
  });

  it('nobody can make themselves an admin; the admin list is public', async () => {
    await denied(set(ref(alice.database, `v2/admins/${alice.uid}`), true));
    assert.equal((await get(ref(bob.database, `v2/admins/${admin.uid}`))).val(), true);
  });

  it('no names are stored: there is no profile or nickname path', async () => {
    for (const path of ['profiles', 'names', 'nicknames', 'users']) {
      await denied(set(ref(alice.database, `v2/${path}/${alice.uid}`), { nickname: 'Me' }));
      await denied(set(ref(admin.database, `v2/${path}/${alice.uid}`), { nickname: 'Me' }));
    }
  });

  it('reads: anyone can read the last 100 messages, but not more and not unbounded', async () => {
    await slowMode();
    await post(alice, 'readable');
    const visitor = fixture('v2-signed-out-reader'); // never signs in
    assert.ok((await get(last100(visitor))).exists());
    for (const reader of [visitor, alice]) {
      await denied(get(query(ref(reader.database, 'v2/chat/messages'), limitToLast(101))));
      await denied(get(ref(reader.database, 'v2/chat/messages')));
      await denied(
        get(query(ref(reader.database, 'v2/chat/messages'), orderByChild('uid'), equalTo(bob.uid))),
      );
      await denied(get(ref(reader.database, 'v2/chat/messages/anything')));
    }
    // The admin may read without a limit (to find one person's messages).
    assert.ok((await get(ref(admin.database, 'v2/chat/messages'))).exists());
  });

  it('only Google-signed-in users can post; guests can read', async () => {
    const visitor = await guest('v2-guest');
    assert.ok((await get(last100(visitor))).exists() !== undefined);
    await denied(post(visitor, 'guest message'));
    const linked = await guest('v2-linked-guest');
    await linkWithCredential(linked.auth.currentUser!, googleCredential('v2-linked-guest'));
    await linked.auth.currentUser!.getIdToken(true);
    await post(linked, 'linked guest is now a Google user');
  });

  it('messages hold only uid, text and server time; the stamp must be atomic', async () => {
    const carol = await googleUser('v2-carol');
    const key = await post(carol, 'hello');
    const saved = (await get(ref(admin.database, `v2/chat/messages/${key}`))).val();
    assert.deepEqual(Object.keys(saved).sort(), ['text', 'ts', 'uid']);
    await slowMode();
    const lone = push(ref(carol.database, 'v2/chat/messages')).key;
    await denied(
      set(ref(carol.database, `v2/chat/messages/${lone}`), {
        uid: carol.uid,
        text: 'x',
        ts: serverTimestamp(),
      }),
    );
    await denied(
      update(ref(carol.database), {
        [`v2/chat/messages/${lone}`]: { uid: alice.uid, text: 'x', ts: serverTimestamp() },
        [`v2/chat/lastPost/${carol.uid}`]: serverTimestamp(),
      }),
    );
    await denied(
      update(ref(carol.database), {
        [`v2/chat/messages/${lone}`]: { uid: carol.uid, text: 'x', ts: 1 },
        [`v2/chat/lastPost/${carol.uid}`]: serverTimestamp(),
      }),
    );
    for (const field of ['name', 'nick', 'nickname', 'email', 'displayName', 'photoURL']) {
      await denied(post(carol, 'x', { [field]: 'Real Person' }));
    }
  });

  it('slow mode: one message per 5 seconds, and the stamp cannot be deleted', async () => {
    await slowMode();
    await post(alice, 'first');
    await denied(post(alice, 'too soon'));
    await denied(remove(ref(alice.database, `v2/chat/lastPost/${alice.uid}`)));
    await denied(set(ref(alice.database, `v2/chat/lastPost/${alice.uid}`), 1));
    await denied(get(ref(bob.database, `v2/chat/lastPost/${alice.uid}`)));
    await slowMode();
    await post(alice, 'later');
  });

  it('message text: length, blocked words, links, emails and phone numbers', async () => {
    const posters = await Promise.all(
      Array.from({ length: 12 }, (_, index) => googleUser(`v2-poster-${index}`)),
    );
    const bad = [
      '',
      'a'.repeat(201),
      'what the FUCK',
      'you twat',
      'see https://example.org',
      'go to www.example.org',
      'site.com',
      'mail me at someone@example.org',
      'call 07700 900123',
      'ring 555-123-4567',
    ];
    for (const [index, text] of bad.entries()) await denied(post(posters[index]!, text));
    await post(posters[10]!, 'a'.repeat(200));
    await post(posters[11]!, 'GG! 2048 score 123456789 in 3 minutes');
  });

  it('users cannot edit or delete messages; the admin can', async () => {
    await slowMode();
    const key = await post(bob, 'original');
    const message = ref(bob.database, `v2/chat/messages/${key}`);
    await denied(update(message, { text: 'changed' }));
    await denied(remove(message));
    await denied(remove(ref(alice.database, `v2/chat/messages/${key}`)));
    await update(ref(admin.database, `v2/chat/messages/${key}`), { text: 'edited', edited: true });
    const saved = (await get(ref(admin.database, `v2/chat/messages/${key}`))).val();
    assert.equal(saved.text, 'edited');
    assert.equal(saved.uid, bob.uid);
    await denied(update(ref(admin.database, `v2/chat/messages/${key}`), { uid: alice.uid }));
    await remove(ref(admin.database, `v2/chat/messages/${key}`));
    assert.equal((await get(ref(admin.database, `v2/chat/messages/${key}`))).val(), null);
    await denied(remove(ref(alice.database, 'v2/chat/messages')));
  });

  it('only the admin can switch chat off, pin and clear the chat', async () => {
    await denied(set(ref(alice.database, 'v2/chat/settings/enabled'), false));
    await denied(
      set(ref(alice.database, 'v2/chat/settings/pinned'), { text: 'hi', ts: serverTimestamp() }),
    );
    await set(ref(admin.database, 'v2/chat/settings/pinned'), {
      text: 'Welcome! Be kind.',
      ts: serverTimestamp(),
    });
    await denied(
      set(ref(admin.database, 'v2/chat/settings/pinned'), {
        text: 'x'.repeat(201),
        ts: serverTimestamp(),
      }),
    );
    await set(ref(admin.database, 'v2/chat/settings/enabled'), false);
    const settings = (await get(ref(alice.database, 'v2/chat/settings'))).val();
    assert.equal(settings.pinned.text, 'Welcome! Be kind.');
    await slowMode();
    await denied(post(alice, 'chat is off'));
    await set(ref(admin.database, 'v2/chat/settings/enabled'), true);
    await post(alice, 'chat is on');
    await remove(ref(admin.database, 'v2/chat/messages'));
    assert.equal((await get(last100(bob))).val(), null);
  });

  it('bans: admin only; a banned user cannot post; only they and the admin can see it', async () => {
    const dave = await googleUser('v2-dave');
    await denied(set(ref(alice.database, `v2/moderation/bans/${dave.uid}`), serverTimestamp()));
    await set(ref(admin.database, `v2/moderation/bans/${dave.uid}`), serverTimestamp());
    const ban = (await get(ref(dave.database, `v2/moderation/bans/${dave.uid}`))).val();
    assert.equal(typeof ban, 'number');
    await denied(get(ref(alice.database, `v2/moderation/bans/${dave.uid}`)));
    await denied(get(ref(alice.database, 'v2/moderation')));
    await denied(post(dave, 'am I banned'));
    await denied(remove(ref(dave.database, `v2/moderation/bans/${dave.uid}`)));
    await remove(ref(admin.database, `v2/moderation/bans/${dave.uid}`));
    await post(dave, 'back again');
  });

  it('mutes: admin only, up to 24 hours; a muted user cannot post until it ends', async () => {
    const erin = await googleUser('v2-erin');
    const mute = (who: Fixture, until: number) =>
      set(ref(who.database, `v2/moderation/mutes/${erin.uid}`), until);
    await denied(mute(alice, Date.now() + 60000));
    await denied(mute(admin, Date.now() + 25 * 3600000));
    await mute(admin, Date.now() + 3000);
    await denied(post(erin, 'muted'));
    await delay(3500);
    await post(erin, 'unmuted by time');
  });

  it('the admin can find and delete all of one person’s messages', async () => {
    await slowMode();
    await post(bob, 'one');
    await slowMode();
    await post(bob, 'two');
    const mine = await get(
      query(ref(admin.database, 'v2/chat/messages'), orderByChild('uid'), equalTo(bob.uid)),
    );
    const keys = Object.keys(mine.val());
    assert.ok(keys.length >= 2);
    await update(
      ref(admin.database, 'v2/chat/messages'),
      Object.fromEntries(keys.map((key) => [key, null])),
    );
  });

  it('presence: each user writes only their own connections; only the admin can read', async () => {
    const visitor = await guest('v2-presence-guest');
    for (const who of [alice, visitor]) {
      const connection = push(ref(who.database, `v2/presence/${who.uid}`));
      await set(connection, serverTimestamp());
      await remove(connection);
    }
    await denied(set(ref(bob.database, `v2/presence/${alice.uid}/fake`), serverTimestamp()));
    await denied(set(ref(alice.database, `v2/presence/${alice.uid}/x`), 'online'));
    await denied(get(ref(bob.database, 'v2/presence')));
    await set(push(ref(alice.database, `v2/presence/${alice.uid}`)), serverTimestamp());
    assert.ok((await get(ref(admin.database, `v2/presence/${alice.uid}`))).exists());
  });

  it('the site’s own chat service works within the rules', async () => {
    const frank = await googleUser('v2-frank');
    const chat = createChatService(frank.database);
    const observer = createChatService(fixture('v2-observer').database); // signed out
    const seen = new Promise<string[]>((resolve) => {
      const stop = observer.watchMessages(
        (messages) => {
          const texts = messages.map((m) => m.text);
          if (texts.includes('hello from the client')) {
            stop();
            resolve(texts);
          }
        },
        () => {},
      );
    });
    await chat.send(frank.uid, 'hello from the client');
    assert.ok((await seen).includes('hello from the client'));
    await denied(chat.send(frank.uid, 'too soon'));
    const stopPresence = chat.startPresence(frank.uid);
    await delay(500);
    assert.ok((await get(ref(admin.database, `v2/presence/${frank.uid}`))).exists());
    stopPresence();
    await delay(500);
    assert.equal((await get(ref(admin.database, `v2/presence/${frank.uid}`))).exists(), false);
    const moderation = await new Promise((resolve) =>
      chat.watchOwnModeration(frank.uid, (value) => resolve(value)),
    );
    assert.deepEqual(moderation, { banned: false, mutedUntil: null });
    const visitor = await guest('v2-guest-client');
    await denied(createChatService(visitor.database).send(visitor.uid, 'guest via the client'));
  });

  it('nothing outside the known /v2/ paths can be read or written', async () => {
    await denied(get(ref(alice.database, 'v2')));
    await denied(set(ref(alice.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/moderation/other/x'), 1));
  });
});
