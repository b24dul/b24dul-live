// Stream progress checklist in a real browser: import preview, admin tick, Undo and the viewer
// panel updating. Uses the harness page (real components, in-memory stand-in for the database);
// the real database service and its rules are covered by the Firebase emulator tests.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const fixture = readFileSync('src/features/checklist/fixtures/gta6-chapter1-checklist.txt', 'utf8');
const harness = './e2e/harness/checklist.html';

async function importFixture(page: Page) {
  await page.goto(harness);
  await page.getByLabel('Paste the checklist text').fill(fixture);
  await page.getByLabel('Game name (optional, only you see it)').fill('Sample game');
}

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
});

test('import shows a preview of the fixture with no problems, then saves', async ({ page }) => {
  await importFixture(page);
  const preview = page.getByRole('region', { name: /Preview: Chapter 1 progress/ });
  await expect(preview.getByTestId('import-summary')).toHaveText(
    '16 sections · 21 items · 20 deadlines · 14 Missable · 0 problems',
  );
  await expect(preview.getByText('Pause during free roam, go to Game > Save Game')).toBeVisible();
  await expect(preview.getByText('Recover treasure from the shipwreck')).toBeVisible();
  await page.getByRole('button', { name: 'Save list' }).click();
  await expect(page.getByRole('status')).toHaveText('Done: saved “Chapter 1 progress”.');
  await expect(page.getByRole('heading', { name: /Chapter 1 progress 0\/21/ })).toBeVisible();
});

test('import preview lists lines it could not understand and blocks saving', async ({ page }) => {
  await page.goto(harness);
  await page
    .getByLabel('Paste the checklist text')
    .fill(
      '```\nPart 2 progress\n- Item before a section\n## Section\nstray words\n- Fine item\n  A step\n```',
    );
  const problems = page.getByRole('list', { name: 'Problems' });
  await expect(problems).toContainText('Line 3: Item before the first "## " section line');
  await expect(problems).toContainText("Line 5: Couldn't understand this line");
  await expect(page.getByRole('button', { name: 'Save list' })).toBeDisabled();
});

test('admin ticks from Up next, Undo restores it, and the viewer panel follows', async ({
  page,
}) => {
  await importFixture(page);
  await page.getByRole('button', { name: 'Save list' }).click();
  await page.getByLabel(/Active list/).selectOption({ label: 'Chapter 1 progress' });

  const viewer = page.getByRole('region', { name: 'Viewer' });
  const card = page.getByRole('region', { name: /Up next/ });
  await expect(viewer.getByText('0/21')).toBeVisible();
  await expect(viewer.getByText('Now:')).toBeVisible();
  await expect(viewer).toContainText('Pick up the Macizo Cigars');
  // Private parts are never shown to viewers.
  await expect(viewer).not.toContainText('Deadline');
  await expect(viewer).not.toContainText('Fix Mandy');
  // Upcoming titles are hidden by default.
  await expect(viewer).not.toContainText('Bring Shirley her rum');

  await expect(card).toContainText('Pick up the Macizo Cigars');
  await expect(card).toContainText('Missable');
  await expect(card.getByText("before leaving Mandy's property")).toBeVisible();
  await expect(card).toContainText('Then: Bring Shirley her rum');
  await expect(card.getByRole('link', { name: 'Search YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/results?search_query=Sample%20game%20Pick%20up%20the%20Macizo%20Cigars',
  );
  await expect(card.getByRole('link', { name: 'Search Google' })).toHaveAttribute(
    'href',
    'https://www.google.com/search?q=Sample%20game%20Pick%20up%20the%20Macizo%20Cigars',
  );

  await card.getByRole('button', { name: 'Done' }).click();
  await expect(card).toContainText('Bring Shirley her rum');
  await expect(viewer.getByText('1/21')).toBeVisible();
  // The first section is finished, so its item moves to "Done earlier".
  await viewer.getByText('Done earlier (1)').click();
  await expect(
    viewer.getByRole('listitem').filter({ hasText: 'Done: Pick up the Macizo Cigars' }),
  ).toBeVisible();
  await expect(page.getByLabel('Done: Pick up the Macizo Cigars')).toBeChecked();
  await expect(page.getByText('(1/1)')).toBeVisible(); // section count

  await card.getByRole('button', { name: /Undo “Pick up the Macizo Cigars”/ }).click();
  await expect(card).toContainText('Then: Bring Shirley her rum');
  await expect(viewer.getByText('0/21')).toBeVisible();
  await expect(page.getByLabel('Done: Pick up the Macizo Cigars')).not.toBeChecked();

  // Ticking from the full list works too, and the setting can show upcoming titles.
  await page.getByLabel('Done: Pick up the Macizo Cigars').check();
  await expect(viewer.getByText('1/21')).toBeVisible();
  await page.getByText('List settings').click();
  await page.getByLabel('Show upcoming item titles to viewers').first().check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(viewer).toContainText('Now:Bring Shirley her rum');

  // No active list: the viewer panel disappears.
  await page.getByLabel(/Active list/).selectOption({ label: 'None (hidden)' });
  await expect(viewer.getByRole('region')).toHaveCount(0);
});

test('admin can add an item mid-stream and expand it to see its steps', async ({ page }) => {
  await importFixture(page);
  await page.getByRole('button', { name: 'Save list' }).click();
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Item title', { exact: true }).fill('Find the hidden statue');
  await page
    .getByLabel(/Steps \(one per line/)
    .fill('Look behind the motel\nPress the pickup button');
  await page.getByLabel('Deadline (optional, only you see it)').fill('before the next mission');
  await page.getByRole('button', { name: 'Add item' }).last().click();
  await expect(page.getByRole('heading', { name: /0\/22/ })).toBeVisible();
  await page.getByRole('button', { name: 'Find the hidden statue' }).click();
  await expect(page.getByText('Press the pickup button')).toBeVisible();
  await expect(page.getByText('before the next mission')).toBeVisible();
});

test('guide prompt fills in the template and can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(harness);
  await page.getByLabel('Game', { exact: true }).fill('Sample game');
  await page.getByLabel('Platform', { exact: true }).fill('PS5');
  await page.getByLabel('Part', { exact: true }).fill('Chapter 2');
  await page.getByLabel('Focus', { exact: true }).fill('missables');
  const output = page.getByLabel('Finished prompt');
  await expect(output).toHaveValue(
    /^GAME: Sample game\nPLATFORM: PS5\nPART: Chapter 2\nFOCUS: missables\n/,
  );
  await expect(page.getByText('Use a chat AI with web search turned on.')).toBeVisible();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('PART: Chapter 2');

  await page.getByRole('button', { name: 'Edit template' }).click();
  await page.getByLabel(/^Template/).fill('Make a list for {GAME} on {PLATFORM}');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(output).toHaveValue('Make a list for Sample game on PS5');
  await page.getByRole('button', { name: 'Reset to default' }).click();
  await page.getByRole('button', { name: 'Reset the template to the default' }).click();
  await expect(output).toHaveValue(/^GAME: Sample game/);
});
