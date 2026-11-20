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
import { addToTotals, METRICS, type TotalsTarget } from '../../src/services/dailyTotals.ts';
import { recordSeen } from '../../src/services/seenService.ts';

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

  it('first/last seen: Google users record only their own times; only the admin reads them', async () => {
    const nia = await googleUser('v2-nia');
    const users = 'v2/users';
    await recordSeen(nia.database, nia.uid);
    const first = (await get(ref(nia.database, `${users}/${nia.uid}`))).val();
    assert.deepEqual(Object.keys(first).sort(), ['firstSeen', 'lastSeen']);
    assert.equal(first.firstSeen, first.lastSeen);
    // Within a minute the site skips the update, and the rules refuse a direct one.
    await recordSeen(nia.database, nia.uid);
    await denied(update(ref(nia.database, `${users}/${nia.uid}`), { lastSeen: serverTimestamp() }));
    // firstSeen never changes; no other fields (names, emails, devices) can be stored.
    await denied(update(ref(nia.database, `${users}/${nia.uid}`), { firstSeen: 1 }));
    await denied(
      set(ref(nia.database, `${users}/${nia.uid}`), {
        firstSeen: first.firstSeen,
        lastSeen: serverTimestamp(),
        name: 'Nia',
      }),
    );
    // Nobody else can write or read someone's times; guests record nothing; admin reads all.
    await denied(set(ref(bob.database, `${users}/${nia.uid}`), { firstSeen: 1, lastSeen: 1 }));
    await denied(get(ref(bob.database, `${users}/${nia.uid}`)));
    await denied(get(ref(bob.database, users)));
    const visitor = await guest('v2-seen-guest');
    await denied(recordSeen(visitor.database, visitor.uid));
    assert.ok((await get(ref(admin.database, users))).child(nia.uid).exists());
    await denied(set(ref(nia.database, `${users}/${nia.uid}`), null));
    await set(ref(admin.database, `${users}/${nia.uid}`), null);
    assert.equal((await get(ref(admin.database, `${users}/${nia.uid}`))).exists(), false);
  });

  it('moderation history: written with each action, admin-only, entries never edited', async () => {
    const ola = await googleUser('v2-ola');
    const tools = createAdminService(admin.database);
    await post(ola, 'history test');
    await tools.mute(ola.uid, 5);
    await tools.unmute(ola.uid);
    await tools.ban(ola.uid);
    await tools.unban(ola.uid);
    assert.equal(await tools.deleteAllMessagesFrom(ola.uid), 1);
    const log = await new Promise<import('../../src/services/adminService.ts').ModerationLog>(
      (resolve) => {
        const stop = tools.watchModerationLog((entries) => {
          if ((entries[ola.uid]?.length ?? 0) >= 5) {
            stop();
            resolve(entries);
          }
        });
      },
    );
    const entries = log[ola.uid]!;
    assert.deepEqual(entries.map((entry) => entry.action).sort(), [
      'ban',
      'deleteMessages',
      'timeout',
      'unban',
      'untimeout',
    ]);
    const timeout = entries.find((entry) => entry.action === 'timeout')!;
    assert.ok(timeout.until! > timeout.at);
    assert.equal(entries.find((entry) => entry.action === 'deleteMessages')!.count, 1);
    // Only the admin can read it; nobody can add made-up entries or edit one.
    const path = `v2/moderationLog/${ola.uid}`;
    await denied(get(ref(ola.database, path)));
    await denied(get(ref(bob.database, 'v2/moderationLog')));
    await denied(set(ref(bob.database, `${path}/fake`), { action: 'ban', at: serverTimestamp() }));
    await denied(set(ref(admin.database, `${path}/${timeout.id}/action`), 'ban'));
    await denied(
      set(ref(admin.database, `${path}/new1`), { action: 'warn', at: serverTimestamp() }),
    );
    await denied(
      set(ref(admin.database, `${path}/new2`), { action: 'ban', at: serverTimestamp(), note: 'x' }),
    );
    await denied(
      set(ref(admin.database, `${path}/new3`), { action: 'ban', at: serverTimestamp(), until: 1 }),
    );
    // Privacy erasure removes the history and the seen times too.
    await recordSeen(ola.database, ola.uid);
    await tools.recordPrivacyRequest(ola.uid);
    const all = await new Promise<{ id: string; uid: string }[]>((resolve) => {
      const stop = tools.watchPrivacyRequests((requests) => {
        if (requests.some((item) => item.uid === ola.uid)) {
          stop();
          resolve(requests);
        }
      });
    });
    const request = all.find((item) => item.uid === ola.uid)!;
    await tools.completeAndErase({ ...(request as never), status: 'pending' });
    for (const erased of [`moderationLog/${ola.uid}`, `users/${ola.uid}`]) {
      const response = await fetch(`http://127.0.0.1:9000/v2/${erased}.json?ns=${NS}`, {
        headers: { Authorization: 'Bearer owner' },
      });
      assert.equal(await response.text(), 'null', erased);
    }
  });

  it('admin readers: users, message counts and everyone’s scores', async () => {
    const pia = await googleUser('v2-pia');
    await recordSeen(pia.database, pia.uid);
    await post(pia, 'count me');
    await createLeaderboardService(pia.database).submit('g2048', pia.uid, 512, false);
    const tools = createAdminService(admin.database);
    const once = <T>(watch: (on: (value: T) => void) => () => void, ready: (value: T) => boolean) =>
      new Promise<T>((resolve) => {
        const stop = watch((value) => {
          if (ready(value)) {
            stop();
            resolve(value);
          }
        });
      });
    const users = await once(tools.watchUsers, (list) => list.some((user) => user.uid === pia.uid));
    assert.ok(users.find((user) => user.uid === pia.uid)!.firstSeen > 0);
    const counts = await once(tools.watchMessageCounts, (all) => (all[pia.uid] ?? 0) >= 1);
    assert.equal(counts[pia.uid], 1);
    const scores = await once(tools.watchAllScores, (all) => all[pia.uid]?.g2048 === 512);
    assert.equal(scores[pia.uid]!.g2048, 512);
    for (const reader of [
      () => get(ref(pia.database, 'v2/users')),
      () => get(ref(pia.database, 'v2/scores/g2048')),
    ])
      await denied(reader());
  });

  it('daily totals: anyone can add exactly 1; only the admin can read or delete a day', async () => {
    const DAY = '2026-11-18';
    const site: TotalsTarget = { databaseURL: 'http://127.0.0.1:9000', ns: NS, fetch };
    const days = `v2/stats/days`;
    // A visitor who never signs in, using the site's own request code.
    assert.equal(await addToTotals(['visits', 'devicePhone', 'sourceYoutube'], site, DAY), true);
    assert.equal(await addToTotals(['visits', 'siteMinutes', 'liveMinutes'], site, DAY), true);
    assert.equal(await addToTotals([...METRICS], site, DAY), true);
    const totals = (await get(ref(admin.database, `${days}/${DAY}`))).val();
    assert.equal(totals.visits, 3);
    assert.equal(totals.devicePhone, 2);
    assert.equal(totals.liveMinutes, 2);
    assert.equal(totals.subscribeClicks, 1);
    // Signed in or not, it can't be set, raised by more than 1, lowered, or deleted.
    const visitor = fixture('v2-stats-visitor');
    for (const who of [visitor, alice]) {
      await denied(set(ref(who.database, `${days}/${DAY}/visits`), 100));
      await denied(set(ref(who.database, `${days}/${DAY}/visits`), 5));
      await denied(set(ref(who.database, `${days}/${DAY}/visits`), 2));
      await denied(set(ref(who.database, `${days}/${DAY}/visits`), null));
      await denied(set(ref(who.database, `${days}/${DAY}`), null));
      await denied(set(ref(who.database, `${days}/${DAY}/visits`), '4'));
    }
    // Only the listed counters, only real dates.
    const raw = (path: string, body: unknown) =>
      fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((response) => response.status);
    const plusOne = { '.sv': { increment: 1 } };
    assert.equal(await raw(`${days}/${DAY}`, { visitorName: plusOne }), 401);
    assert.equal(await raw(`${days}/${DAY}`, { visits: plusOne, uid: 'abc' }), 401);
    assert.equal(await raw(`${days}/2026-13-01`, { visits: plusOne }), 401);
    assert.equal(await raw(`${days}/yesterday`, { visits: plusOne }), 401);
    assert.equal(await raw(`${days}/${DAY}`, { visits: { '.sv': { increment: 2 } } }), 401);
    assert.equal(await raw(`${days}/${DAY}`, { visits: { '.sv': { increment: -1 } } }), 401);
    assert.equal(await raw(`v2/stats/other`, { visits: plusOne }), 401);
    // Reading: admin only, and the admin service sees the newest day first.
    await denied(get(ref(visitor.database, `${days}/${DAY}`)));
    await denied(get(ref(alice.database, days)));
    await addToTotals(['visits'], site, '2026-11-19');
    const seen = await new Promise<import('../../src/services/adminService.ts').StatsDay[]>(
      (resolve) => {
        const stop = createAdminService(admin.database).watchStats((list) => {
          if (list.length >= 2) {
            stop();
            resolve(list);
          }
        });
      },
    );
    assert.deepEqual(
      seen.map((day) => day.day),
      ['2026-11-19', '2026-11-18'],
    );
    // The admin can delete a whole day; nobody else can.
    await denied(set(ref(alice.database, `${days}/2026-11-19`), null));
    await set(ref(admin.database, `${days}/2026-11-19`), null);
    assert.equal((await get(ref(admin.database, `${days}/2026-11-19`))).exists(), false);
  });

  it('nothing outside the known /v2/ paths can be read or written', async () => {
    await denied(get(ref(alice.database, 'v2')));
    await denied(set(ref(alice.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/other'), 1));
    await denied(set(ref(admin.database, 'v2/moderation/other/x'), 1));
  });
});

// The stream checklist feature is parked (see PROJECT_STATUS.md), but its rules are still deployed,
// so they stay tested here with plain database writes.
describe('/v2/ stream progress checklist rules (feature parked)', { timeout: 120000 }, () => {
  const lists = 'v2/checklists/lists';
  const privatePath = 'v2/checklistsPrivate';
  const listId = 'l00';
  let viewer: User;

  /** A sample list: 3 sections of 4 items, with steps and deadlines on the private side. */
  function sampleList(title: string) {
    const sections: Record<string, unknown> = {};
    const items: Record<string, unknown> = {};
    const hidden: Record<string, unknown> = {};
    for (let s = 0; s < 3; s += 1) {
      sections[`s0${s}`] = { title: `Section ${s}`, order: s, note: `Note ${s}` };
      for (let i = 0; i < 4; i += 1) {
        const id = `i${String(s * 4 + i).padStart(2, '0')}`;
        items[id] = { title: `Item ${id}`, section: `s0${s}`, order: i, missable: i === 0 || null };
        hidden[id] = { steps: [`Secret step for ${id}`], deadline: `Secret deadline ${id}` };
      }
    }
    return {
      public: { title, showUpcoming: false, sections, items },
      private: { gameName: 'Sample Game', items: hidden },
    };
  }
  const createList = (id: string, title: string) => {
    const list = sampleList(title);
    return update(ref(admin.database, 'v2'), {
      [`checklists/lists/${id}`]: list.public,
      [`checklistsPrivate/${id}`]: list.private,
    });
  };
  const deleteList = (id: string) =>
    update(ref(admin.database, 'v2'), {
      [`checklists/lists/${id}`]: null,
      [`checklistsPrivate/${id}`]: null,
    });
  const tick = (item: string) =>
    update(ref(admin.database, 'v2'), {
      [`checklists/lists/${listId}/items/${item}/done`]: true,
      [`checklists/lists/${listId}/items/${item}/doneAt`]: serverTimestamp(),
      [`checklistsPrivate/${listId}/lastTick`]: item,
    });

  before(async () => {
    viewer = await guest('v2-checklist-guest');
    await seed('v2/checklists', null);
    await seed('v2/checklistsPrivate', null);
    await seed('v2/checklistPrompt', null);
    await createList(listId, 'Chapter 1 progress');
  });

  it('only admins can create, activate and edit lists', async () => {
    for (const who of [alice, viewer]) {
      await denied(set(ref(who.database, `${lists}/l01`), { title: 'Mine' }));
      await denied(set(ref(who.database, 'v2/checklists/active'), listId));
      await denied(set(ref(who.database, `${lists}/${listId}/items/i00/done`), true));
      await denied(set(ref(who.database, `${privatePath}/${listId}/gameName`), 'x'));
      await denied(set(ref(who.database, 'v2/checklistPrompt/template'), 'x'));
    }
    await set(ref(admin.database, 'v2/checklists/active'), listId);
    assert.equal((await get(ref(viewer.database, 'v2/checklists/active'))).val(), listId);
  });

  it('viewers can read the active list, but not the lists node or inactive lists', async () => {
    const list = (await get(ref(viewer.database, `${lists}/${listId}`))).val();
    assert.equal(list.title, 'Chapter 1 progress');
    assert.equal(Object.keys(list.sections).length, 3);
    assert.equal(Object.keys(list.items).length, 12);
    // Steps, deadlines and the game name are not in the public data at all.
    const publicText = JSON.stringify(list);
    assert.ok(!publicText.includes('Sample Game'));
    assert.ok(!publicText.includes('Secret'));
    await denied(get(ref(viewer.database, lists)));
    await denied(get(ref(alice.database, lists)));
    // A second list exists but is not active: viewers cannot read it.
    await createList('l01', 'Other');
    await denied(get(ref(viewer.database, `${lists}/l01`)));
    assert.equal((await get(ref(admin.database, lists))).size, 2);
    await deleteList('l01');
  });

  it('viewers can never read steps, deadlines, the game name or the prompt template', async () => {
    await set(ref(admin.database, 'v2/checklistPrompt/template'), 'GAME: {GAME}');
    for (const who of [viewer, alice]) {
      await denied(get(ref(who.database, privatePath)));
      await denied(get(ref(who.database, `${privatePath}/${listId}`)));
      await denied(get(ref(who.database, `${privatePath}/${listId}/gameName`)));
      await denied(get(ref(who.database, `${privatePath}/${listId}/items/i00/steps`)));
      await denied(get(ref(who.database, `${privatePath}/${listId}/items/i00/deadline`)));
      await denied(get(ref(who.database, 'v2/checklistPrompt')));
      await denied(get(ref(who.database, 'v2/checklistPrompt/template')));
    }
    const hidden = (await get(ref(admin.database, `${privatePath}/${listId}`))).val();
    assert.equal(hidden.gameName, 'Sample Game');
    assert.equal(Object.keys(hidden.items).length, 12);
    const template = await get(ref(admin.database, 'v2/checklistPrompt/template'));
    assert.equal(template.val(), 'GAME: {GAME}');
    await remove(ref(admin.database, 'v2/checklistPrompt'));
  });

  it('a tick stores the server time; a time chosen by the client is rejected', async () => {
    const item = `${lists}/${listId}/items/i00`;
    const lastTick = `${privatePath}/${listId}/lastTick`;
    await denied(update(ref(admin.database, item), { done: true, doneAt: Date.now() - 60000 }));
    await denied(update(ref(admin.database, item), { done: true, doneAt: Date.now() + 60000 }));
    await denied(update(ref(admin.database, item), { done: true, doneAt: 'now' }));
    await denied(update(ref(admin.database, item), { doneAt: serverTimestamp() })); // not done
    const started = Date.now();
    await tick('i00');
    const ticked = (await get(ref(viewer.database, item))).val();
    assert.equal(ticked.done, true);
    assert.ok(Math.abs(ticked.doneAt - started) < 30000);
    // Editing the item keeps its tick time; changing the time afterwards is rejected.
    await update(ref(admin.database, item), { title: 'Renamed', doneAt: ticked.doneAt });
    await denied(set(ref(admin.database, `${item}/doneAt`), ticked.doneAt - 1000));
    assert.equal((await get(ref(admin.database, lastTick))).val(), 'i00');
    // Undo clears the tick, its time and the last-tick marker.
    await update(ref(admin.database, 'v2'), {
      [`checklists/lists/${listId}/items/i00/done`]: null,
      [`checklists/lists/${listId}/items/i00/doneAt`]: null,
      [`checklistsPrivate/${listId}/lastTick`]: null,
    });
    const undone = (await get(ref(viewer.database, item))).val();
    assert.equal(undone.done, undefined);
    assert.equal(undone.doneAt, undefined);
    assert.equal((await get(ref(admin.database, lastTick))).exists(), false);
  });

  it('rejects text that is too long, wrong types, unknown fields and a 61st item', async () => {
    const list = `${lists}/${listId}`;
    const hidden = `${privatePath}/${listId}`;
    const rejected = [
      [`${list}/title`, 'L'.repeat(61)],
      [`${list}/title`, ''],
      [`${list}/showUpcoming`, 'yes'],
      [`${list}/sections/s00/title`, 'S'.repeat(61)],
      [`${list}/sections/s00/note`, 'N'.repeat(151)],
      [`${list}/sections/s60`, { title: 'x', order: 0 }],
      [`${list}/items/i00/title`, 'I'.repeat(81)],
      [`${list}/items/i00/missable`, 'true'],
      [`${list}/items/i00/section`, 's59'],
      [`${list}/items/i00/order`, 60],
      [`${list}/items/i00/extra`, 1],
      [`${list}/items/i60`, { title: 'x', section: 's00', order: 0 }],
      [`${list}/steps`, ['not public']],
      [`${hidden}/items/i00/steps/5`, 'sixth step'],
      [`${hidden}/items/i00/steps/0`, 's'.repeat(151)],
      [`${hidden}/items/i00/deadline`, 'd'.repeat(121)],
      [`${hidden}/items/i00/notes`, 'x'],
      [`${hidden}/gameName`, 'g'.repeat(61)],
      [`${hidden}/lastTick`, 'i99x'],
      [`${hidden}/notes`, 'x'],
      [`${privatePath}/x01`, { gameName: 'x' }],
      ['v2/checklistPrompt/template', 't'.repeat(4001)],
      ['v2/checklistPrompt/other', 'x'],
      ['v2/checklists/active', 'l19'], // no such list
      ['v2/checklists/other', 1],
      [`${lists}/x01`, { title: 'Bad id' }],
    ] as const;
    for (const [path, value] of rejected) await denied(set(ref(admin.database, path), value));
    // The longest allowed values are accepted.
    await set(ref(admin.database, `${hidden}/items/i00/steps/4`), 's'.repeat(150));
    await set(ref(admin.database, `${hidden}/items/i00/deadline`), 'd'.repeat(120));
    await set(ref(admin.database, `${list}/sections/s00/note`), 'N'.repeat(150));
    await set(ref(admin.database, 'v2/checklistPrompt/template'), 't'.repeat(4000));
    await remove(ref(admin.database, 'v2/checklistPrompt'));
  });

  it('the active list can be cleared, after which viewers cannot read it', async () => {
    await tick('i01');
    assert.equal(
      (await get(ref(viewer.database, `${lists}/${listId}/items/i01/done`))).val(),
      true,
    );
    await remove(ref(admin.database, 'v2/checklists/active'));
    assert.equal((await get(ref(viewer.database, 'v2/checklists/active'))).exists(), false);
    await denied(get(ref(viewer.database, `${lists}/${listId}`)));
    await deleteList(listId);
    assert.equal((await get(ref(admin.database, `${privatePath}/${listId}`))).exists(), false);
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
