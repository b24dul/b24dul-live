/**
 * Public Firebase web configuration for the existing project (the same values the
 * legacy page ships). It is not a secret: access is controlled by Auth and the
 * Realtime Database rules. All new site data lives under /v2/.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAFMLu84doQ_vZHARS8jvZ5BPGhs75e43o',
  authDomain: 'b24duls-anonymous-chat.firebaseapp.com',
  databaseURL: 'https://b24duls-anonymous-chat-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'b24duls-anonymous-chat',
  storageBucket: 'b24duls-anonymous-chat.firebasestorage.app',
  messagingSenderId: '924473401038',
  appId: '1:924473401038:web:6b760053d17da3f74c7a9f',
} as const;

/**
 * A separate app name gives the new site its own auth persistence key, so it never
 * reuses a session stored by the legacy page on the same origin (fresh start).
 */
export const FIREBASE_APP_NAME = 'b24dul-v2';
