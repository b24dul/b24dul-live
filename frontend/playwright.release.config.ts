import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['release.spec.ts'],
  use: {
    baseURL: 'http://127.0.0.1:4176/b24dul-live/',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176/b24dul-live/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
