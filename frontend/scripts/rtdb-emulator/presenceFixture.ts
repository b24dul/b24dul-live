import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import {
  connectDatabaseEmulator,
  getDatabase,
  onDisconnect,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';

/** Disposable local test fixture. The demo project and endpoints are fixed. */
export function createRtdbEmulatorFixture(name: string) {
  const app = initializeApp(
    {
      apiKey: 'demo-api-key',
      projectId: 'demo-b24dul-rtdb',
      databaseURL: 'http://127.0.0.1:9000?ns=demo-b24dul-rtdb-default-rtdb',
    },
    name,
  );
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const database = getDatabase(app);
  connectDatabaseEmulator(database, '127.0.0.1', 9000);
  return { auth, database, close: () => deleteApp(app) };
}

/** Test-only presence: register disconnect cleanup before writing the online value. */
export function startTestPresence(
  fixture: ReturnType<typeof createRtdbEmulatorFixture>,
  uid: string,
) {
  if (!uid || fixture.auth.currentUser?.uid !== uid) throw new Error('Identity is not current');
  const status = ref(fixture.database, `status/${uid}`);
  let active = true;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: unknown) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const unsubscribe = onValue(
    ref(fixture.database, '.info/connected'),
    (connection) => {
      if (connection.val() !== true || !active || fixture.auth.currentUser?.uid !== uid) return;
      onDisconnect(status)
        .remove()
        .then(async () => {
          if (!active || fixture.auth.currentUser?.uid !== uid) return;
          await set(status, serverTimestamp());
          if (active && fixture.auth.currentUser?.uid === uid) resolveReady();
        })
        .catch(rejectReady);
    },
    rejectReady,
  );
  return {
    ready,
    stop: () => {
      active = false;
      unsubscribe();
    },
  };
}

/** Test-only atomic message and timestamp write for the synthetic rules fixture. */
export async function sendTestMessage(
  fixture: ReturnType<typeof createRtdbEmulatorFixture>,
  uid: string,
  text: string,
) {
  if (!uid || fixture.auth.currentUser?.uid !== uid) throw new Error('Identity is not current');
  const key = push(ref(fixture.database, 'messages')).key;
  if (!key) throw new Error('Unable to create a test message key');
  await update(ref(fixture.database), {
    [`messages/${key}`]: { uid, name: 'Test visitor', text, ts: serverTimestamp() },
    [`lastPost/${uid}`]: serverTimestamp(),
  });
  return key;
}

/** Test-only per-connection presence. Existing production rules do not authorize this path. */
export function startTestConnectionPresence(
  fixture: ReturnType<typeof createRtdbEmulatorFixture>,
  uid: string,
) {
  if (!uid || fixture.auth.currentUser?.uid !== uid) throw new Error('Identity is not current');
  const connection = push(ref(fixture.database, `statusV2/${uid}`));
  if (!connection.key) throw new Error('Unable to create test connection key');
  let active = true;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: unknown) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const unsubscribe = onValue(
    ref(fixture.database, '.info/connected'),
    (connected) => {
      if (connected.val() !== true || !active || fixture.auth.currentUser?.uid !== uid) return;
      onDisconnect(connection)
        .remove()
        .then(async () => {
          if (!active || fixture.auth.currentUser?.uid !== uid) return;
          await set(connection, serverTimestamp());
          if (active && fixture.auth.currentUser?.uid === uid) resolveReady();
        })
        .catch(rejectReady);
    },
    rejectReady,
  );
  return {
    ready,
    key: connection.key,
    stop: () => {
      active = false;
      unsubscribe();
    },
  };
}
