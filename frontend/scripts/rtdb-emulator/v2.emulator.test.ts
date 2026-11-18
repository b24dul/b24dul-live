// Real RTDB emulator tests for the /v2/ rules in firebase/v2.rules.json (demo project only).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { signInAnonymously } from 'firebase/auth';
import { get, goOffline, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { createRtdbEmulatorFixture } from './presenceFixture.ts';
import { createChatService } from '../../src/services/chatService.ts';
import { BLOCKED_WORDS, RESERVED_NICKNAME } from '../../src/features/chat/chatPolicy.ts';

const NS = 'demo-b24dul-rtdb-default-rtdb';
type Fixture = ReturnType<typeof createRtdbEmulatorFixture>;
const fixtures: Fixture[] = [];
let alice: Fixture & { uid: string };
let bob: Fixture & { uid: string };
let admin: Fixture & { uid: string };

async function user(name: string) {
  const fixture = createRtdbEmulatorFixture(name);
  fixtures.push(fixture);
  const uid = (await signInAnonymously(fixture.auth)).user.uid;
  return Object.assign(fixture, { uid });
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

function post(who: Fixture & { uid: string }, text: string, extra: Record<string, unknown> = {}) {
  const key = push(ref(who.database, 'v2/chat/messages')).key!;
  return update(ref(who.database), {
    [`v2/chat/messages/${key}`]: { uid: who.uid, text, ts: serverTimestamp(), ...extra },
    [`v2/chat/lastPost/${who.uid}`]: serverTimestamp(),
  }).then(() => key);
}

/** Waits out the 5-second slow mode for a user. */
const slowMode = () => delay(5100);

before(async () => {
  alice = await user('v2-alice');
  bob = await user('v2-bob');
  admin = await user('v2-admin');
  await seed('v2', null);
  await seed(`v2/admins/${admin.uid}`, true);
});

after(async () => {
  for (const fixture of fixtures) goOffline(fixture.database);
  await Promise.all(fixtures.map((fixture) => fixture.close()));
});

describe('/v2/ rules', { timeout: 120000 }, () => {
  it('keep client and rules word lists in step', () => {
    const rules = readFileSync(new URL('../../../firebase/v2.rules.json', import.meta.url), 'utf8');
    assert.ok(rules.includes('(' + BLOCKED_WORDS.join('|') + ')'), 'blocked words differ');
    for (const pattern of RESERVED_NICKNAME)
      assert.ok(rules.includes('/' + pattern.source + '/'), 'reserved pattern differs');
  });

  it('nobody can make themselves an admin; the admin list is public', async () => {
    await denied(set(ref(alice.database, `v2/admins/${alice.uid}`), true));
    assert.equal((await get(ref(bob.database, `v2/admins/${admin.uid}`))).val(), true);
  });

  it('profiles hold only a nickname: no Google name, email or photo', async () => {
    const mine = ref(alice.database, `v2/profiles/${alice.uid}`);
    await set(mine, { nickname: 'SwiftOtter42' });
    for (const field of ['displayName', 'email', 'photoURL', 'name', 'realName']) {
      await denied(set(mine, { nickname: 'SwiftOtter42', [field]: 'x' }));
      await denied(set(ref(alice.database, `v2/profiles/${alice.uid}/${field}`), 'x'));
    }
    await denied(set(mine, { email: 'a' }));
    await denied(set(ref(bob.database, `v2/profiles/${alice.uid}`), { nickname: 'Hijack' }));
    assert.deepEqual((await get(ref(bob.database, `v2/profiles/${alice.uid}`))).val(), {
      nickname: 'SwiftOtter42',
    });
  });

  it('nicknames: length, characters, impersonation and profanity', async () => {
    const nick = ref(bob.database, `v2/profiles/${bob.uid}`);
    for (const bad of [
      'ab',
      'a'.repeat(21),
      'has space',
      'emoji😀',
      'Admin',
      'the_admin',
      'ADM1N',
      'B24DUL',
      'b_24-dul',
      'b24du1',
      'Moderator7',
      'Mod_Sam',
      'chatmod',
      'TheOwner',
      'Official',
      'B24DUL_Support',
      'Fuck_off',
      'sh1thead',
      'Wank3r',
    ]) {
      await denied(set(nick, { nickname: bad }));
    }
    for (const ok of ['CalmHeron10', 'modern_art', 'Abdul_99', 'x-y-z']) {
      await set(nick, { nickname: ok });
    }
  });

  it('the admin may use B24DUL as a nickname; nobody else may', async () => {
    await set(ref(admin.database, `v2/profiles/${admin.uid}`), { nickname: 'B24DUL' });
    await denied(set(ref(alice.database, `v2/profiles/${alice.uid}`), { nickname: 'B24DUL' }));
  });

  it('messages need a nickname, the right UID and an atomic slow-mode stamp', async () => {
    const carol = await user('v2-carol');
    await denied(post(carol, 'hello'));
    await set(ref(carol.database, `v2/profiles/${carol.uid}`), { nickname: 'CarolCrab11' });
    const key = await post(carol, 'hello');
    const saved = (await get(ref(bob.database, `v2/chat/messages/${key}`))).val();
    assert.deepEqual(Object.keys(saved).sort(), ['text', 'ts', 'uid']);
    await slowMode();
    // Without the lastPost stamp.
    const lone = push(ref(carol.database, 'v2/chat/messages')).key;
    await denied(
      set(ref(carol.database, `v2/chat/messages/${lone}`), {
        uid: carol.uid,
        text: 'x',
        ts: serverTimestamp(),
      }),
    );
    // Spoofing another UID, a client timestamp, or extra fields.
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
    for (const field of ['name', 'nick', 'email', 'displayName', 'photoURL']) {
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
      Array.from({ length: 12 }, async (_, index) => {
        const who = await user(`v2-poster-${index}`);
        await set(ref(who.database, `v2/profiles/${who.uid}`), { nickname: `Poster${index}x` });
        return who;
      }),
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
    for (const [index, text] of bad.entries()) await denied(post(posters[index], text));
    await post(posters[10], 'a'.repeat(200));
    await post(posters[11], 'GG! 2048 score 123456789 in 3 minutes');
  });

  it('users cannot edit or delete messages; the admin can', async () => {
    await slowMode();
    const key = await post(bob, 'original');
    const message = ref(bob.database, `v2/chat/messages/${key}`);
    await denied(update(message, { text: 'changed' }));
    await denied(remove(message));
    await denied(remove(ref(alice.database, `v2/chat/messages/${key}`)));
    await update(ref(admin.database, `v2/chat/messages/${key}`), { text: 'edited', edited: true });
    const saved = (await get(message)).val();
    assert.equal(saved.text, 'edited');
    assert.equal(saved.uid, bob.uid);
    await denied(update(ref(admin.database, `v2/chat/messages/${key}`), { uid: alice.uid }));
    await remove(ref(admin.database, `v2/chat/messages/${key}`));
    assert.equal((await get(message)).val(), null);
    await denied(remove(ref(alice.database, 'v2/chat/messages')));
  });

  it('only the admin can switch chat off, pin and clear the chat', async () => {
    const settings = ref(alice.database, 'v2/chat/settings');
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
    assert.equal((await get(settings)).val().pinned.text, 'Welcome! Be kind.');
    await slowMode();
    await denied(post(alice, 'chat is off'));
    await set(ref(admin.database, 'v2/chat/settings/enabled'), true);
    await post(alice, 'chat is on');
    await remove(ref(admin.database, 'v2/chat/messages'));
    assert.equal((await get(ref(bob.database, 'v2/chat/messages'))).val(), null);
  });

  it('bans: admin only; a banned user cannot post or rename; only they and the admin can see it', async () => {
    const dave = await user('v2-dave');
    await set(ref(dave.database, `v2/profiles/${dave.uid}`), { nickname: 'DaveDuck' });
    await denied(set(ref(alice.database, `v2/moderation/bans/${dave.uid}`), serverTimestamp()));
    await set(ref(admin.database, `v2/moderation/bans/${dave.uid}`), serverTimestamp());
    assert.equal(
      typeof (await get(ref(dave.database, `v2/moderation/bans/${dave.uid}`))).val(),
      'number',
    );
    await denied(get(ref(alice.database, `v2/moderation/bans/${dave.uid}`)));
    await denied(get(ref(alice.database, 'v2/moderation')));
    await denied(post(dave, 'am I banned'));
    await denied(set(ref(dave.database, `v2/profiles/${dave.uid}`), { nickname: 'NewDave' }));
    await denied(remove(ref(dave.database, `v2/moderation/bans/${dave.uid}`)));
    // Rename by the admin, then unban.
    await set(ref(admin.database, `v2/profiles/${dave.uid}/nickname`), 'Renamed1');
    await remove(ref(admin.database, `v2/moderation/bans/${dave.uid}`));
    await post(dave, 'back again');
  });

  it('mutes: admin only, up to 24 hours; a muted user cannot post until it ends', async () => {
    const erin = await user('v2-erin');
    await set(ref(erin.database, `v2/profiles/${erin.uid}`), { nickname: 'ErinEel' });
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
    const response = await fetch(
      `http://127.0.0.1:9000/v2/chat/messages.json?ns=${NS}&orderBy=%22uid%22&equalTo=%22${bob.uid}%22`,
      { headers: { Authorization: 'Bearer owner' } },
    );
    const keys = Object.keys(await response.json());
    assert.ok(keys.length >= 2);
    await update(
      ref(admin.database, 'v2/chat/messages'),
      Object.fromEntries(keys.map((key) => [key, null])),
    );
  });

  it('presence: each user writes only their own connections; only the admin can read', async () => {
    const connection = push(ref(alice.database, `v2/presence/${alice.uid}`));
    await set(connection, serverTimestamp());
    await denied(set(ref(bob.database, `v2/presence/${alice.uid}/fake`), serverTimestamp()));
    await denied(set(ref(alice.database, `v2/presence/${alice.uid}/x`), 'online'));
    await denied(get(ref(bob.database, 'v2/presence')));
    assert.ok((await get(ref(admin.database, `v2/presence/${alice.uid}`))).exists());
    await remove(connection);
  });

  it('the site’s own chat service works within the rules', async () => {
    const frank = await user('v2-frank');
    const chat = createChatService(frank.database);
    const observer = createChatService(bob.database);
    await denied(chat.send(frank.uid, 'no nickname yet'));
    await chat.setNickname(frank.uid, 'FrankFox12');
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
  });

  it('nothing outside the known /v2/ paths can be read or written', async () => {
    await denied(get(ref(alice.database, 'v2')));
    await denied(set(ref(alice.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/moderation/other/x'), 1));
  });
});
