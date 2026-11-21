import '@testing-library/jest-dom/vitest';

// Vitest exposes the backing jsdom instance. Node 26 also defines a global
// localStorage, so explicitly use jsdom's storage for browser-environment tests.
const { jsdom } = globalThis as typeof globalThis & { jsdom: { window: Window } };
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: jsdom.window.localStorage,
});
