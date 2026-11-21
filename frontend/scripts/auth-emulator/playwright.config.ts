import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'identity.browser.spec.ts',
  workers: 1,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  use: { baseURL: 'http://127.0.0.1:4188/b24dul-live/' },
  webServer: {
    cwd: process.cwd(),
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188/b24dul-live/scripts/auth-emulator/browserFixture.html',
    reuseExistingServer: process.env.AUTH_FIXTURE_EXTERNAL === '1',
    timeout: 120_000,
  },
});
