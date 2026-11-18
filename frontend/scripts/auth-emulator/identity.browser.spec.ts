import { expect, test } from '@playwright/test';

const fixture = 'scripts/auth-emulator/browserFixture.html';

test('restores a legacy anonymous session with the new SDK across refreshes', async ({ page }) => {
  await page.goto(`${fixture}?sdk=legacy`);
  const state = page.locator('#state');
  await expect(state).toHaveAttribute('data-kind', 'signed-out');
  await page.getByRole('button', { name: 'Create test guest' }).click();
  await expect(state).toHaveAttribute('data-kind', 'anonymous');
  const uid = await state.getAttribute('data-uid');
  expect(uid).toBeTruthy();
  await page.goto(`${fixture}?sdk=modern`);
  await expect(state).toHaveAttribute('data-status', 'ready');
  await expect(state).toHaveAttribute('data-kind', 'anonymous');
  await expect(state).toHaveAttribute('data-uid', uid!);
  await page.reload();
  await expect(state).toHaveAttribute('data-uid', uid!);
  await page.getByRole('button', { name: 'Create test guest' }).click();
  await expect(state).toHaveAttribute('data-uid', uid!);
});

test('shares identity between legacy and new SDK tabs and preserves it after linking', async ({
  page,
  context,
  browserName,
}) => {
  const subject = `browser-linked-${browserName}`;
  await page.goto(`${fixture}?sdk=legacy&subject=${subject}`);
  const first = page.locator('#state');
  await expect(first).toHaveAttribute('data-kind', 'signed-out');
  await page.getByRole('button', { name: 'Create test guest' }).click();
  await expect(first).toHaveAttribute('data-kind', 'anonymous');
  const uid = await first.getAttribute('data-uid');
  expect(uid).toBeTruthy();
  const secondPage = await context.newPage();
  await secondPage.goto(`${fixture}?sdk=modern&subject=${subject}`);
  const second = secondPage.locator('#state');
  await expect(second).toHaveAttribute('data-uid', uid!);
  await secondPage.getByRole('button', { name: 'Link test Google account' }).click();
  await expect(second).toHaveAttribute('data-kind', 'linked');
  await expect(second).toHaveAttribute('data-uid', uid!);
  await secondPage.getByRole('button', { name: 'Create test guest' }).click();
  await expect(second).toHaveAttribute('data-kind', 'linked');
  await expect(second).toHaveAttribute('data-uid', uid!);
  await expect(first).toHaveAttribute('data-kind', 'linked', { timeout: 15000 });
  await secondPage.reload();
  await expect(second).toHaveAttribute('data-kind', 'linked');
  await expect(second).toHaveAttribute('data-uid', uid!);
  await page.reload();
  await expect(first).toHaveAttribute('data-kind', 'linked');
  await expect(first).toHaveAttribute('data-uid', uid!);
});

test('keeps both browser identities when a Google account is already linked', async ({
  page,
  browser,
  browserName,
}) => {
  const query = `?sdk=modern&subject=browser-collision-${browserName}`;
  await page.goto(`${fixture}${query}`);
  const owner = page.locator('#state');
  await expect(owner).toHaveAttribute('data-kind', 'signed-out');
  await page.getByRole('button', { name: 'Create test guest' }).click();
  await expect(owner).toHaveAttribute('data-kind', 'anonymous');
  const ownerUid = await owner.getAttribute('data-uid');
  await page.getByRole('button', { name: 'Link test Google account' }).click();
  await expect(owner).toHaveAttribute('data-kind', 'linked');

  const separateContext = await browser.newContext();
  try {
    const guestPage = await separateContext.newPage();
    await guestPage.goto(`${fixture}${query}`);
    const guest = guestPage.locator('#state');
    await expect(guest).toHaveAttribute('data-kind', 'signed-out');
    await guestPage.getByRole('button', { name: 'Create test guest' }).click();
    await expect(guest).toHaveAttribute('data-kind', 'anonymous');
    const guestUid = await guest.getAttribute('data-uid');
    expect(guestUid).toBeTruthy();
    expect(guestUid).not.toBe(ownerUid);
    await guestPage.getByRole('button', { name: 'Link test Google account' }).click();
    await expect(guestPage.locator('#error')).toContainText('auth/credential-already-in-use');
    await expect(guest).toHaveAttribute('data-kind', 'anonymous');
    await expect(guest).toHaveAttribute('data-uid', guestUid!);
    await guestPage.reload();
    await expect(guest).toHaveAttribute('data-uid', guestUid!);
    await expect(guest).toHaveAttribute('data-kind', 'anonymous');
    await expect(owner).toHaveAttribute('data-uid', ownerUid!);
    await expect(owner).toHaveAttribute('data-kind', 'linked');
  } finally {
    await separateContext.close();
  }
});
