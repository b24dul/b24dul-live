// Loaded on demand only. Returns the new site's named Firebase app (separate from legacy sessions).
import { getApp, getApps, initializeApp } from 'firebase/app';
import { FIREBASE_APP_NAME, firebaseConfig } from './firebaseConfig';

export function firebaseApp() {
  return getApps().some((existing) => existing.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(firebaseConfig, FIREBASE_APP_NAME);
}
