import { expect, test, type Page } from '@playwright/test';

// Browser checks for the admin-only Google email. The admin pages use the admin screenshot harness
// (the real AdminWorkspace and ChatPanel with test accounts and fake emails, no Firebase).
const HARNESS = './scripts/admin-screens/index.html';
const FAKE_EMAIL = /[\w.+-]+@example\.invalid/;
const ANY_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const ACCOUNT_ID = /sample(User|Owner)\d+/;

const emailCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { emailCalls: string[] }).emailCalls);
const bodyText = (page: Page) => page.locator('body').innerText();

test.describe('admin: Google email in the user details view only', () => {
  test('clicking a name in the control panel chat opens the details with the email', async ({
    page,
  }) => {
    await page.goto(HARNESS);
    const chat = page.getByRole('log', { name: 'Chat messages' });
    const link = chat.getByRole('button', { name: /^Open details for / }).first();
    await expect(link).toBeVisible();
    // Before anything is opened: no email is loaded or shown anywhere.
    expect(await emailCalls(page)).toEqual([]);
    expect(await bodyText(page)).not.toMatch(FAKE_EMAIL);

    await page.getByRole('tab', { name: 'Analytics' }).click();
    const name = (await link.textContent())!;
    await link.click();
    await expect(page.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');
    const detail = page.getByRole('region', { name });
    await expect(detail.getByTestId('google-email')).toHaveText(FAKE_EMAIL);
    await expect(detail.getByText('Google email')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Copy Google email' })).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Copy account ID' })).toBeVisible();
    await expect(detail.getByRole('heading', { name })).toBeInViewport();
    // Loaded for this one person only (dev StrictMode may run the load twice).
    const calls = await emailCalls(page);
    expect(calls.length).toBeGreaterThan(0);
    expect(new Set(calls).size).toBe(1);
    expect(calls[0]).toMatch(/^userEmail:sampleUser\d+x$/);

    // The email is in the details view only: not in the chat, the lists or Online now.
    for (const area of [
      chat,
      page.getByRole('table'),
      page.getByRole('list', { name: 'People online now' }),
    ])
      expect(await area.innerText()).not.toMatch(FAKE_EMAIL);
  });

  test('Copy puts the email and the account ID on the clipboard', async ({ page }) => {
    // A stand-in clipboard, so the check works the same in every browser engine.
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as unknown as { copied: string[] }).copied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text: string) => void copied.push(text) },
        configurable: true,
      });
    });
    const copied = () => page.evaluate(() => (window as unknown as { copied: string[] }).copied);
    await page.goto(HARNESS);
    const link = page.getByRole('table').getByRole('button', { name: /^Open details for / });
    const name = (await link.first().textContent())!;
    await link.first().click();
    const detail = page.getByRole('region', { name });
    const email = (await detail.getByTestId('google-email').textContent())!;
    await detail.getByRole('button', { name: 'Copy Google email' }).click();
    await expect(detail.getByText('Copied')).toHaveCount(1);
    expect(await copied()).toEqual([email]);
    await detail.getByRole('button', { name: 'Copy account ID' }).click();
    await expect(detail.getByText('Copied')).toHaveCount(2);
    expect((await copied())[1]).toMatch(ACCOUNT_ID);
  });

  test('a person with no stored email says so', async ({ page }) => {
    await page.goto(HARNESS);
    await page.getByLabel('Search name or account ID').fill('sampleUser0014x');
    await page
      .getByRole('table')
      .getByRole('button', { name: /^Open details for / })
      .click();
    await expect(page.getByText('Not recorded yet (updates on next sign-in)')).toBeVisible();
  });

  test('search by email runs on typing and lists names, not emails', async ({ page }) => {
    await page.goto(HARNESS);
    const field = page.getByLabel('Search by Google email');
    await expect(field).toBeVisible();
    expect(await emailCalls(page)).toEqual([]);
    await field.fill('test.user03');
    const results = page.getByRole('list', { name: 'Email search results' });
    await expect(results.getByRole('button')).toHaveCount(1);
    expect(await results.innerText()).not.toMatch(ANY_EMAIL);
    expect(await emailCalls(page)).toEqual(['findByEmail:test.user03']);
    const name = (await results.getByRole('button').textContent())!;
    await results.getByRole('button').click();
    await expect(page.getByRole('region', { name }).getByTestId('google-email')).toHaveText(
      'test.user03@example.invalid',
    );
    await field.fill('nobody.here');
    await expect(page.getByText('No account has an email starting with that.')).toBeVisible();
  });

  test('works on a phone-sized screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HARNESS);
    const link = page
      .getByRole('log', { name: 'Chat messages' })
      .getByRole('button', { name: /^Open details for / })
      .first();
    const name = (await link.textContent())!;
    await link.click();
    const detail = page.getByRole('region', { name });
    await expect(detail.getByTestId('google-email')).toHaveText(FAKE_EMAIL);
    await expect(detail.getByRole('heading', { name })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});

test.describe('nobody else ever sees an email or account ID', () => {
  test('a signed-in Google user who is not the admin gets no email tools', async ({ page }) => {
    await page.goto(`${HARNESS}?as=member`);
    await expect(page.getByRole('heading', { name: 'Admin only' })).toBeVisible();
    const text = await bodyText(page);
    expect(text).not.toMatch(ANY_EMAIL);
    expect(text).not.toMatch(ACCOUNT_ID);
    await expect(page.getByLabel('Search by Google email')).toHaveCount(0);
    expect(await emailCalls(page)).toEqual([]);
  });

  for (const [who, query] of [
    ['the admin', '?view=public'],
    ['a signed-in user', '?view=public&as=member'],
  ] as const)
    test(`the public chat shows no email or account ID, even for ${who}`, async ({ page }) => {
      await page.goto(HARNESS + query);
      const chat = page.getByRole('log', { name: 'Chat messages' });
      await expect(chat.getByText('evening all!')).toBeVisible();
      const text = await bodyText(page);
      expect(text).not.toMatch(ANY_EMAIL);
      expect(text).not.toMatch(ACCOUNT_ID);
      await expect(chat.getByRole('button', { name: /^Open details for / })).toHaveCount(0);
      expect(await emailCalls(page)).toEqual([]);
    });

  test('guests see no email on Watch, Community, Games, Leaderboards or Admin', async ({
    page,
  }) => {
    // Firebase is blocked so the check does not depend on live data.
    await page.route(/firebaseio\.com|googleapis\.com|firebasedatabase\.app/, (route) =>
      route.abort(),
    );
    for (const route of ['/watch', '/community', '/games', '/leaderboards', '/admin']) {
      await page.goto('./#' + route);
      await expect(page.locator('#route-content h1')).toBeVisible();
      await page.waitForTimeout(300);
      expect(await page.locator('#route-content').innerText(), route).not.toMatch(ANY_EMAIL);
    }
  });
});
