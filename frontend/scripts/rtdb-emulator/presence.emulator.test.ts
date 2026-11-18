import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInAnonymously,
  signOut,
  updateCurrentUser,
} from 'firebase/auth';
import {
  get,
  goOffline,
  goOnline,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import {
  createRtdbEmulatorFixture,
  sendTestMessage,
  startTestPresence,
  startTestConnectionPresence,
} from './presenceFixture.ts';

let visitor;
let observer;
let uid;
let presence;
let moderator;

function observeValue(database, path, predicate, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out observing ${path}`));
    }, timeoutMs);
    unsubscribe = onValue(
      ref(database, path),
      (snapshot) => {
        const value = snapshot.val();
        if (!predicate(value)) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      },
    );
  });
}

before(async () => {
  visitor = createRtdbEmulatorFixture('presence-visitor');
  observer = createRtdbEmulatorFixture('presence-observer');
  moderator = createRtdbEmulatorFixture('test-moderator');
  uid = (await signInAnonymously(visitor.auth)).user.uid;
  await signInAnonymously(observer.auth);
  const moderatorUser = (await signInAnonymously(moderator.auth)).user;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const fakeToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: 'https://accounts.google.com',
    aud: 'demo-b24dul-rtdb',
    sub: 'test-moderator',
    email: 'moderator@example.invalid',
    email_verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.`;
  await linkWithCredential(moderatorUser, GoogleAuthProvider.credential(fakeToken));
});
after(async () => {
  presence?.stop();
  goOffline(visitor.database);
  goOffline(observer.database);
  goOffline(moderator.database);
  await Promise.all([visitor.close(), observer.close(), moderator.close()]);
});

describe('synthetic local RTDB presence fixture', { timeout: 45000 }, () => {
  it('keeps chat and presence ownership when Google linking preserves the UID', async () => {
    const account = createRtdbEmulatorFixture('linking-lifecycle');
    let activePresence;
    try {
      const guest = (await signInAnonymously(account.auth)).user;
      activePresence = startTestConnectionPresence(account, guest.uid);
      await activePresence.ready;
      const before = await sendTestMessage(account, guest.uid, 'before linking');
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
        iss: 'https://accounts.google.com',
        aud: 'demo-b24dul-rtdb',
        sub: 'lifecycle-linked-google',
        email: 'lifecycle@example.invalid',
        email_verified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })}.`;
      const linked = await linkWithCredential(guest, GoogleAuthProvider.credential(token));
      assert.equal(linked.user.uid, guest.uid);
      assert.equal(linked.user.isAnonymous, false);
      const after = await sendTestMessage(account, guest.uid, 'after linking');
      for (const key of [before, after]) {
        assert.equal((await get(ref(observer.database, `messages/${key}`))).val().uid, guest.uid);
      }
      goOffline(account.database);
      await observeValue(observer.database, `statusV2/${guest.uid}`, (value) => value === null);
      goOnline(account.database);
      await observeValue(
        observer.database,
        `statusV2/${guest.uid}/${activePresence.key}`,
        (value) => typeof value === 'number',
      );
    } finally {
      activePresence?.stop();
      goOffline(account.database);
      await account.close();
    }
  });
  it('rejects old identity handlers after explicit cleanup and account replacement', async () => {
    const account = createRtdbEmulatorFixture('switching-lifecycle');
    let oldPresence;
    let nextPresence;
    try {
      const oldUid = (await signInAnonymously(account.auth)).user.uid;
      oldPresence = startTestConnectionPresence(account, oldUid);
      await oldPresence.ready;
      // This tests the required ordering, not a production cleanup adapter.
      oldPresence.stop();
      await remove(ref(account.database, `statusV2/${oldUid}/${oldPresence.key}`));
      await signOut(account.auth);
      const nextUid = (await signInAnonymously(account.auth)).user.uid;
      assert.notEqual(nextUid, oldUid);
      assert.throws(() => startTestPresence(account, oldUid), /Identity is not current/);
      await assert.rejects(
        sendTestMessage(account, oldUid, 'stale send'),
        /Identity is not current/,
      );
      nextPresence = startTestConnectionPresence(account, nextUid);
      await nextPresence.ready;
      const key = await sendTestMessage(account, nextUid, 'new account');
      assert.equal((await get(ref(observer.database, `messages/${key}`))).val().uid, nextUid);
      goOffline(account.database);
      goOnline(account.database);
      await observeValue(
        observer.database,
        `statusV2/${nextUid}/${nextPresence.key}`,
        (value) => typeof value === 'number',
      );
      assert.equal((await get(ref(observer.database, `statusV2/${oldUid}`))).exists(), false);
    } finally {
      oldPresence?.stop();
      nextPresence?.stop();
      goOffline(account.database);
      await account.close();
    }
  });
  it('rejects a stale or different identity before registration', () => {
    assert.throws(
      () => startTestPresence(visitor, 'not-the-current-user'),
      /Identity is not current/,
    );
  });
  it('registers cleanup before writing presence', async () => {
    presence = startTestPresence(visitor, uid);
    await presence.ready;
    const value = await observeValue(
      observer.database,
      `status/${uid}`,
      (v) => typeof v === 'number',
    );
    assert.equal(typeof value, 'number');
  });
  it('blocks another user from writing the visitor status under synthetic rules', async () => {
    await assert.rejects(
      set(ref(observer.database, `status/${uid}`), Date.now()),
      (error) => error.code === 'PERMISSION_DENIED',
    );
    const value = await observeValue(
      observer.database,
      `status/${uid}`,
      (v) => typeof v === 'number',
    );
    assert.equal(typeof value, 'number');
  });
  it('requires an atomic test message and matching server timestamp', async () => {
    await assert.rejects(
      set(ref(visitor.database, 'messages/non-atomic'), {
        uid,
        name: 'Test visitor',
        text: 'hello',
        ts: serverTimestamp(),
      }),
      (error) => error.code === 'PERMISSION_DENIED',
    );
    const key = await sendTestMessage(visitor, uid, 'hello from the emulator');
    const message = (await get(ref(observer.database, `messages/${key}`))).val();
    assert.equal(message.uid, uid);
    assert.equal(message.text, 'hello from the emulator');
    assert.equal(typeof message.ts, 'number');
  });
  it('rejects a spoofed identity and rolls back the entire synthetic write', async () => {
    const observerUid = observer.auth.currentUser.uid;
    await assert.rejects(
      update(ref(observer.database), {
        'messages/spoofed': { uid, name: 'Imposter', text: 'hello', ts: serverTimestamp() },
        [`lastPost/${observerUid}`]: serverTimestamp(),
      }),
      (error) => error.code === 'PERMISSION_DENIED',
    );
    assert.equal((await get(ref(observer.database, 'messages/spoofed'))).exists(), false);
    assert.equal((await get(ref(observer.database, `lastPost/${observerUid}`))).exists(), false);
    await assert.rejects(sendTestMessage(observer, uid, 'not allowed'), /Identity is not current/);
  });
  it('enforces synthetic moderation privileges, bans and timeouts', async () => {
    await assert.rejects(
      set(ref(observer.database, `banned/${uid}`), true),
      (error) => error.code === 'PERMISSION_DENIED',
    );
    const before = (await get(ref(visitor.database, `lastPost/${uid}`))).val();
    await set(ref(moderator.database, `banned/${uid}`), true);
    try {
      await assert.rejects(
        sendTestMessage(visitor, uid, 'blocked while banned'),
        (error) => error.code === 'PERMISSION_DENIED',
      );
      assert.equal((await get(ref(visitor.database, `lastPost/${uid}`))).val(), before);
    } finally {
      await remove(ref(moderator.database, `banned/${uid}`));
    }
    await set(ref(moderator.database, `timeouts/${uid}`), Date.now() + 60000);
    try {
      await assert.rejects(
        sendTestMessage(visitor, uid, 'blocked during timeout'),
        (error) => error.code === 'PERMISSION_DENIED',
      );
      assert.equal((await get(ref(visitor.database, `lastPost/${uid}`))).val(), before);
    } finally {
      await remove(ref(moderator.database, `timeouts/${uid}`));
    }
    const allowed = await sendTestMessage(visitor, uid, 'allowed after moderation clears');
    assert.equal((await get(ref(observer.database, `messages/${allowed}`))).exists(), true);
  });
  it('removes presence on disconnect and restores it after reconnect', async () => {
    goOffline(visitor.database);
    assert.equal(await observeValue(observer.database, `status/${uid}`, (v) => v === null), null);
    goOnline(visitor.database);
    const value = await observeValue(
      observer.database,
      `status/${uid}`,
      (v) => typeof v === 'number',
    );
    assert.equal(typeof value, 'number');
  });
  it('demonstrates that a per-UID status can disappear while another connection is online', async () => {
    const second = createRtdbEmulatorFixture('presence-second-tab');
    let secondPresence;
    try {
      await updateCurrentUser(second.auth, visitor.auth.currentUser);
      secondPresence = startTestPresence(second, uid);
      await secondPresence.ready;
      goOffline(visitor.database);
      assert.equal(await observeValue(observer.database, `status/${uid}`, (v) => v === null), null);
      assert.equal(second.auth.currentUser.uid, uid);
    } finally {
      secondPresence?.stop();
      goOffline(second.database);
      await second.close();
      goOnline(visitor.database);
      await observeValue(observer.database, `status/${uid}`, (v) => typeof v === 'number');
    }
  });
  it('keeps per-connection presence while another connection remains online', async () => {
    const second = createRtdbEmulatorFixture('connection-second-tab');
    let firstPresence;
    let secondPresence;
    try {
      await updateCurrentUser(second.auth, visitor.auth.currentUser);
      firstPresence = startTestConnectionPresence(visitor, uid);
      secondPresence = startTestConnectionPresence(second, uid);
      await Promise.all([firstPresence.ready, secondPresence.ready]);
      const path = `statusV2/${uid}`;
      const both = await observeValue(
        observer.database,
        path,
        (value) => value && Object.keys(value).length === 2,
      );
      assert.ok(both[firstPresence.key]);
      assert.ok(both[secondPresence.key]);
      goOffline(visitor.database);
      const remaining = await observeValue(
        observer.database,
        path,
        (value) => value && !value[firstPresence.key] && value[secondPresence.key],
      );
      assert.ok(remaining[secondPresence.key]);
      goOffline(second.database);
      assert.equal(await observeValue(observer.database, path, (value) => value === null), null);
    } finally {
      firstPresence?.stop();
      secondPresence?.stop();
      goOffline(second.database);
      await second.close();
    }
  });
});
