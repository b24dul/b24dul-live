import { expect, test } from '@playwright/test';

test('prepares the existing privacy email only after an explicit valid ID', async ({ page }) => {
  await page.goto('./#/profile');
  const region = page.getByRole('region', { name: 'Request visitor data deletion' });
  await expect(region.getByRole('link', { name: 'Open email draft' })).toHaveCount(0);
  await region.getByRole('button', { name: 'Prepare email request' }).click();
  await expect(region.getByRole('alert')).toContainText('Enter a valid account ID');
  await region.getByLabel('Visitor account ID').fill('visitor_123');
  await region.getByRole('button', { name: 'Prepare email request' }).click();
  const draft = region.getByRole('link', { name: 'Open email draft' });
  const href = await draft.getAttribute('href');
  expect(href).toMatch(/^mailto:b24dul@gmail\.com\?/);
  expect(new URL(href!).searchParams.get('body')).toContain('Visitor Firebase UID: visitor_123');
  expect(await page.evaluate(() => JSON.stringify(window.localStorage))).not.toContain(
    'visitor_123',
  );
  await region.getByLabel('Visitor account ID').fill('changed_456');
  await expect(draft).toHaveCount(0);
});
