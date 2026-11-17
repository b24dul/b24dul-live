import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleAuthProvider, signOut } from 'firebase/auth';
import { createDisposableAuthEmulator } from './authEmulator.ts';

let fixture;
let collisionFixture;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const googleCredential = () =>
  GoogleAuthProvider.credential(
    `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      iss: 'https://accounts.google.com',
      aud: 'demo-b24dul-auth',
      sub: 'test-google-subject',
      email: 'emulator@example.invalid',
      email_verified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`,
  );

before(() => {
  fixture = createDisposableAuthEmulator('identity-test');
  collisionFixture = createDisposableAuthEmulator('collision-test');
});
after(async () => {
  await Promise.all([fixture.close(), collisionFixture.close()]);
});

describe('isolated Firebase Auth emulator', () => {
  it('does not create an identity until explicitly requested', async () => {
    await fixture.auth.authStateReady();
    assert.equal(fixture.auth.currentUser, null);
  });
  it('preserves the existing anonymous UID on repeated and concurrent entry', async () => {
    const [first, second] = await Promise.all([fixture.enterAsGuest(), fixture.enterAsGuest()]);
    assert.equal(first.isAnonymous, true);
    assert.equal(first.uid, second.uid);
    assert.equal((await fixture.enterAsGuest()).uid, first.uid);
    assert.equal(fixture.auth.currentUser.uid, first.uid);
  });
  it('links Google without changing the anonymous UID', async () => {
    const uid = fixture.auth.currentUser.uid;
    const linked = await fixture.linkGoogleForTest(uid, googleCredential());
    assert.equal(linked.uid, uid);
    assert.equal(linked.isAnonymous, false);
    assert.equal((await fixture.enterAsGuest()).uid, uid);
  });
  it('preserves both accounts when Google is already linked elsewhere', async () => {
    const existingUid = fixture.auth.currentUser.uid;
    const guest = await collisionFixture.enterAsGuest();
    await assert.rejects(
      collisionFixture.linkGoogleForTest(guest.uid, googleCredential()),
      (error) => error.code === 'auth/credential-already-in-use',
    );
    assert.equal(collisionFixture.auth.currentUser.uid, guest.uid);
    assert.equal(collisionFixture.auth.currentUser.isAnonymous, true);
    assert.equal(fixture.auth.currentUser.uid, existingUid);
  });
  it('refuses a stale UID before attempting to link', async () => {
    const uid = collisionFixture.auth.currentUser.uid;
    await assert.rejects(
      collisionFixture.linkGoogleForTest('different-uid', googleCredential()),
      /identity changed/,
    );
    assert.equal(collisionFixture.auth.currentUser.uid, uid);
  });
  it('creates a different guest only after explicit sign-out and entry', async () => {
    const previous = collisionFixture.auth.currentUser.uid;
    await signOut(collisionFixture.auth);
    assert.equal(collisionFixture.auth.currentUser, null);
    assert.notEqual((await collisionFixture.enterAsGuest()).uid, previous);
  });
});
