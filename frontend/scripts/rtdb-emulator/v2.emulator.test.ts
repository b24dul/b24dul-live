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
  limitToFirst,
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
import { createAdminService } from '../../src/services/adminService.ts';
import { createLeaderboardService } from '../../src/services/leaderboardService.ts';
import { BOARDS } from '../../src/features/games/leaderboardBoards.ts';
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

  it('admin tools: the site’s admin service works, and nobody else can use it', async () => {
    const tools = createAdminService(admin.database);
    const notAdmin = createAdminService(alice.database);
    const gina = await googleUser('v2-gina');
    await denied(notAdmin.setChatEnabled(false));
    await denied(notAdmin.pin('x'));
    await denied(notAdmin.ban(gina.uid));
    await denied(notAdmin.mute(gina.uid, 5));
    await denied(notAdmin.deleteAllMessagesFrom(gina.uid));
    await tools.pin('Stream at 7pm');
    assert.equal(
      (await get(ref(bob.database, 'v2/chat/settings/pinned/text'))).val(),
      'Stream at 7pm',
    );
    await tools.unpin();
    await tools.setChatEnabled(false);
    await tools.setChatEnabled(true);
    await slowMode();
    const key = await post(gina, 'first from gina');
    await tools.editMessage(key, 'edited by admin');
    const edited = (await get(ref(admin.database, `v2/chat/messages/${key}`))).val();
    assert.deepEqual([edited.text, edited.edited, edited.uid], ['edited by admin', true, gina.uid]);
    await slowMode();
    await post(gina, 'second from gina');
    assert.equal(await tools.deleteAllMessagesFrom(gina.uid), 2);
    await tools.mute(gina.uid, 1);
    await denied(post(gina, 'muted'));
    await tools.unmute(gina.uid);
    await tools.ban(gina.uid);
    const moderation = await new Promise<{ bans: Record<string, number> }>((resolve) => {
      const stop = tools.watchModeration((value) => {
        if (value.bans[gina.uid]) {
          stop();
          resolve(value);
        }
      });
    });
    assert.equal(typeof moderation.bans[gina.uid], 'number');
    await denied(post(gina, 'banned'));
    await tools.unban(gina.uid);
    await slowMode();
    await post(gina, 'welcome back');
    const stopPresence = createChatService(gina.database).startPresence(gina.uid);
    const online = await new Promise<Record<string, number>>((resolve) => {
      const stop = tools.watchPresence((presence) => {
        if (presence[gina.uid]) {
          stop();
          resolve(presence);
        }
      });
    });
    assert.equal(typeof online[gina.uid], 'number');
    stopPresence();
  });

  it('privacy requests: admin-only log; statuses only move forward; completed is final', async () => {
    const tools = createAdminService(admin.database);
    await denied(createAdminService(alice.database).recordPrivacyRequest(alice.uid));
    await denied(get(ref(alice.database, 'v2/privacyRequests')));
    const requests = ref(admin.database, 'v2/privacyRequests');
    await denied(
      set(push(requests), {
        uid: alice.uid,
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await denied(
      set(push(requests), {
        uid: alice.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        email: 'x',
      }),
    );
    await denied(
      set(push(requests), {
        uid: 'not a uid!',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    const henry = await googleUser('v2-henry');
    await tools.recordPrivacyRequest(henry.uid);
    const [request] = await new Promise<Awaited<ReturnType<typeof listOnce>>>((resolve) =>
      listOnce(tools).then(resolve),
    );
    assert.equal(request!.status, 'pending');
    await denied(
      update(ref(admin.database, `v2/privacyRequests/${request!.id}`), { uid: alice.uid }),
    );
    await tools.markProcessing(request!.id);
    await denied(
      update(ref(admin.database, `v2/privacyRequests/${request!.id}`), {
        status: 'pending',
        updatedAt: serverTimestamp(),
      }),
    );
    // Give henry data in every /v2/ place, then erase it.
    await slowMode();
    await post(henry, 'one');
    await tools.mute(henry.uid, 5);
    await set(push(ref(henry.database, `v2/presence/${henry.uid}`)), serverTimestamp());
    const erased = await tools.completeAndErase({ ...request!, status: 'processing' });
    assert.equal(erased, 1);
    for (const path of [
      `moderation/mutes/${henry.uid}`,
      `presence/${henry.uid}`,
      `chat/lastPost/${henry.uid}`,
    ]) {
      const response = await fetch(`http://127.0.0.1:9000/v2/${path}.json?ns=${NS}`, {
        headers: { Authorization: 'Bearer owner' },
      });
      assert.equal(await response.text(), 'null', path);
    }
    const ids = await get(
      query(ref(admin.database, 'v2/chat/messages'), orderByChild('uid'), equalTo(henry.uid)),
    );
    assert.equal(ids.exists(), false);
    const done = (await get(ref(admin.database, `v2/privacyRequests/${request!.id}`))).val();
    assert.equal(done.status, 'completed');
    await denied(
      update(ref(admin.database, `v2/privacyRequests/${request!.id}`), {
        updatedAt: serverTimestamp(),
      }),
    );
    await denied(remove(ref(admin.database, `v2/privacyRequests/${request!.id}`)));
  });

  it('only the admin can remove someone else’s online entries or slow-mode stamp', async () => {
    await set(push(ref(alice.database, `v2/presence/${alice.uid}`)), serverTimestamp());
    await denied(remove(ref(bob.database, `v2/presence/${alice.uid}`)));
    await denied(remove(ref(bob.database, `v2/chat/lastPost/${alice.uid}`)));
    await denied(set(ref(admin.database, `v2/presence/${alice.uid}/fake`), serverTimestamp()));
    await denied(set(ref(admin.database, `v2/chat/lastPost/${alice.uid}`), serverTimestamp()));
    await remove(ref(admin.database, `v2/presence/${alice.uid}`));
  });

  it('leaderboard limits in the rules match the site', () => {
    const rules = readFileSync(new URL('../../../firebase/v2.rules.json', import.meta.url), 'utf8');
    for (const board of BOARDS) {
      assert.ok(
        rules.includes(`newData.val() >= ${board.min} && newData.val() <= ${board.max}`),
        board.id,
      );
      assert.ok(rules.includes(`newData.val() % ${board.step} === 0`), board.id);
    }
  });

  it('leaderboards: top-50 reads only; your own entry is private', async () => {
    const reader = fixture('v2-lb-reader');
    const board = (who: Fixture) => ref(who.database, 'v2/scores/g2048');
    await get(query(board(reader), orderByChild('value'), limitToLast(10)));
    await get(query(board(reader), orderByChild('value'), limitToFirst(50)));
    await denied(get(query(board(reader), orderByChild('value'), limitToLast(51))));
    await denied(get(board(reader)));
    await denied(get(query(board(reader), limitToLast(10))));
    const ivy = await googleUser('v2-ivy');
    await createLeaderboardService(ivy.database).submit('g2048', ivy.uid, 64, false);
    assert.equal(await createLeaderboardService(ivy.database).myBest('g2048', ivy.uid), 64);
    await denied(get(ref(bob.database, `v2/scores/g2048/${ivy.uid}`)));
    const top = await new Promise<{ uid: string; value: number }[]>((resolve) => {
      const stop = createLeaderboardService(reader.database).watchTop('g2048', false, (entries) => {
        stop();
        resolve(entries);
      });
    });
    assert.ok(top.some((entry) => entry.uid === ivy.uid && entry.value === 64));
    assert.deepEqual(Object.keys(top[0]!).sort(), ['ts', 'uid', 'value']);
  });

  it('leaderboards: impossible values, wrong types and extra fields are refused', async () => {
    const jack = await googleUser('v2-jack');
    const score = (board: string, value: unknown, extra: Record<string, unknown> = {}) =>
      set(ref(jack.database, `v2/scores/${board}/${jack.uid}`), {
        value,
        ts: serverTimestamp(),
        ...extra,
      });
    for (const value of [-4, 0, 2, 2050, 400004, 1.5, '1024', true]) {
      await denied(score('g2048', value));
    }
    await denied(score('sudoku-easy', 29));
    await denied(score('sudoku-medium', 44));
    await denied(score('sudoku-hard', 59));
    await denied(score('sudoku-easy', 86401));
    await denied(score('sudoku-easy', 40.5));
    await denied(score('g2048', 1024, { name: 'Real Name' }));
    await denied(score('chess', 10));
    await denied(set(ref(jack.database, `v2/scores/g2048/${jack.uid}`), { value: 1024, ts: 1 }));
    await denied(
      set(ref(jack.database, `v2/scores/g2048/${alice.uid}`), {
        value: 1024,
        ts: serverTimestamp(),
      }),
    );
    const visitor = await guest('v2-lb-guest');
    await denied(
      createLeaderboardService(visitor.database).submit('g2048', visitor.uid, 1024, false),
    );
    await score('g2048', 400000);
    await score('sudoku-easy', 30);
  });

  it('leaderboards: one best per person, only better scores, at most one write per 10 s', async () => {
    const kim = await googleUser('v2-kim');
    const scores = createLeaderboardService(kim.database);
    await scores.submit('g2048', kim.uid, 1024, false);
    await denied(scores.submit('g2048', kim.uid, 2048, false)); // too soon
    await delay(10100);
    await denied(scores.submit('g2048', kim.uid, 512, false)); // lower
    await denied(scores.submit('g2048', kim.uid, 1024, false)); // equal
    await scores.submit('g2048', kim.uid, 2048, false);
    await scores.submit('sudoku-easy', kim.uid, 300, false); // separate board, separate limit
    await delay(10100);
    await denied(scores.submit('sudoku-easy', kim.uid, 400, false)); // slower
    await scores.submit('sudoku-easy', kim.uid, 200, false);
    await denied(remove(ref(kim.database, `v2/scores/g2048/${kim.uid}`)));
    const banned = await googleUser('v2-lb-banned');
    await createAdminService(admin.database).ban(banned.uid);
    await denied(createLeaderboardService(banned.database).submit('g2048', banned.uid, 8, false));
  });

  it('leaderboards: the dev-tools flag is admin-only, tied to the score, never blocks it', async () => {
    const lee = await googleUser('v2-lee');
    const scores = createLeaderboardService(lee.database);
    await scores.submit('g2048', lee.uid, 4096, true);
    assert.equal(await scores.myBest('g2048', lee.uid), 4096);
    await denied(get(ref(lee.database, `v2/scoreFlags/g2048/${lee.uid}`)));
    await denied(get(ref(lee.database, 'v2/scoreFlags')));
    await denied(remove(ref(lee.database, `v2/scoreFlags/g2048/${lee.uid}`)));
    await denied(
      set(ref(lee.database, `v2/scoreFlags/g2048/${lee.uid}`), { value: 8, ts: serverTimestamp() }),
    );
    await denied(
      set(ref(lee.database, `v2/scoreFlags/g2048/${alice.uid}`), {
        value: 4096,
        ts: serverTimestamp(),
      }),
    );
    const flags = await new Promise<Record<string, { value: number }>>((resolve) => {
      const stop = createLeaderboardService(admin.database).watchFlags('g2048', (value) => {
        if (value[lee.uid]) {
          stop();
          resolve(value);
        }
      });
    });
    assert.equal(flags[lee.uid]!.value, 4096);
    await denied(createLeaderboardService(bob.database).deleteScore('g2048', lee.uid));
    await createLeaderboardService(admin.database).deleteScore('g2048', lee.uid);
    for (const path of [`scores/g2048/${lee.uid}`, `scoreFlags/g2048/${lee.uid}`]) {
      const response = await fetch(`http://127.0.0.1:9000/v2/${path}.json?ns=${NS}`, {
        headers: { Authorization: 'Bearer owner' },
      });
      assert.equal(await response.text(), 'null', path);
    }
  });

  it('privacy erasure also removes leaderboard scores and flags', async () => {
    const mia = await googleUser('v2-mia');
    await createLeaderboardService(mia.database).submit('g2048', mia.uid, 256, true);
    await createLeaderboardService(mia.database).submit('sudoku-hard', mia.uid, 600, false);
    const tools = createAdminService(admin.database);
    await tools.recordPrivacyRequest(mia.uid);
    const all = await new Promise<{ id: string; uid: string }[]>((resolve) => {
      const stop = tools.watchPrivacyRequests((requests) => {
        if (requests.some((item) => item.uid === mia.uid)) {
          stop();
          resolve(requests);
        }
      });
    });
    const request = all.find((item) => item.uid === mia.uid)!;
    await tools.completeAndErase({ ...(request as never), status: 'pending' });
    const paths = [
      `scores/g2048/${mia.uid}`,
      `scoreFlags/g2048/${mia.uid}`,
      `scores/sudoku-hard/${mia.uid}`,
    ];
    for (const path of paths) {
      const response = await fetch(`http://127.0.0.1:9000/v2/${path}.json?ns=${NS}`, {
        headers: { Authorization: 'Bearer owner' },
      });
      assert.equal(await response.text(), 'null', path);
    }
  });

  it('nothing outside the known /v2/ paths can be read or written', async () => {
    await denied(get(ref(alice.database, 'v2')));
    await denied(set(ref(alice.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/moderation/other/x'), 1));
  });
});

function listOnce(tools: ReturnType<typeof createAdminService>) {
  return new Promise<import('../../src/services/adminService.ts').PrivacyRequest[]>((resolve) => {
    const stop = tools.watchPrivacyRequests((requests) => {
      if (requests.length) {
        stop();
        resolve(requests);
      }
    });
  });
}
