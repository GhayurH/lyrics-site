import { test as base, expect } from '@playwright/test';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, poem } from './helpers.mjs';
import { startEditorialServer } from '../../scripts/editorial/server.mjs';

const test = base.extend({
  editorial: async ({}, use) => {
    const source = await fixture(null, {
      'pehla-kalam.md': poem(),
      'doosra-kalam.md': poem({ title: 'دوسرا کلام', alternateTitle: 'Doosra Kalam', recitationId: 'work-two' }, 'تیسرا مصرع\nچوتھا مصرع\n'),
      'english.md': poem({ title: 'An English original', alternateTitle: undefined, recitationId: 'english-work',
        language: 'English', lang: 'en', direction: 'ltr', romanLyrics: undefined, poet: undefined, published: true }, 'An original English line\n'),
    });
    let app;
    try {
      app = await startEditorialServer({ root: source.root, stateDir: source.stateDir, port: 0 });
      await use({ ...source, ...app });
    } finally { await app?.close(); await source.cleanup(); }
  },
});

async function openFirst(page, origin) {
  await page.goto(origin);
  await page.getByRole('button', { name: /پہلا کلام/u }).click();
  await expect(page.locator('#source-title')).toHaveText('پہلا کلام');
}

test('inspect exact editions, compare candidates and save a human decision without changing source', async ({ page, editorial }) => {
  const original = await readFile(join(editorial.lyrics, 'pehla-kalam.md'), 'utf8');
  await openFirst(page, editorial.origin);
  await expect(page.locator('#source-editions .edition').first()).toHaveAttribute('lang', 'ur');
  await expect(page.locator('#source-editions .edition').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#source-editions')).toContainText('پہلا مصرع');
  await expect(page.locator('#source-editions')).toContainText('Pehla misra');
  await page.getByLabel('Find a comparison candidate').fill('Doosra');
  await page.getByRole('button', { name: 'Find candidates' }).click();
  await page.locator('#compare-results').getByRole('button', { name: /دوسرا کلام/u }).click();
  await expect(page.locator('#comparison-panel')).toBeVisible();
  await expect(page.locator('#comparison-evidence')).toBeChecked();
  await page.getByLabel('Review pass', { exact: true }).selectOption('duplicates');
  await page.getByLabel('What did you verify, or what still needs work?').fill('Compared both source openings and Roman verses. They are distinct works.');
  await page.getByRole('button', { name: 'Accept this pass', exact: true }).click();
  await expect(page.locator('#message')).toContainText('Decision saved');
  await expect(page.locator('#decision-state')).toHaveText('Accepted');
  expect(await readFile(join(editorial.lyrics, 'pehla-kalam.md'), 'utf8')).toBe(original);
  const ledger = await editorial.workspace.store.read();
  expect(ledger.decisions).toHaveLength(1);
  expect(ledger.decisions[0].comparisons).toHaveLength(1);
  expect(ledger.decisions[0].actor).toBe('local-human');
  await page.getByText('Exact Markdown source', { exact: true }).click();
  await expect(page.locator('#raw-source')).toHaveText(original);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export queue', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kalam-editorial-queue.json');
  const queue = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(queue.kind).toBe('human-editorial-queue');
  expect(queue.candidates).toHaveLength(3);
});

test('two tabs cannot overwrite a newer decision and refresh exposes changed evidence', async ({ page, context, editorial }) => {
  await openFirst(page, editorial.origin);
  const second = await context.newPage();
  await openFirst(second, editorial.origin);
  await page.getByLabel('Review pass', { exact: true }).selectOption('source');
  await page.getByLabel('What did you verify, or what still needs work?').fill('Read both source lines directly and accepted their reading.');
  await page.getByRole('button', { name: 'Accept this pass', exact: true }).click();
  await expect(page.locator('#message')).toContainText('Decision saved');
  await second.getByLabel('Review pass', { exact: true }).selectOption('source');
  const note = 'Another tab has a different question about the opening.';
  await second.getByLabel('What did you verify, or what still needs work?').fill(note);
  await second.getByRole('button', { name: 'Needs work', exact: true }).click();
  await expect(second.locator('#message')).toContainText('ledger changed');
  await expect(second.locator('#notes')).toHaveValue(note);
  expect((await editorial.workspace.store.read()).decisions).toHaveLength(1);
  await writeFile(join(editorial.lyrics, 'pehla-kalam.md'), poem({}, 'بدلا مصرع\nدوسرا مصرع\n'));
  await second.getByRole('button', { name: 'Refresh corpus', exact: true }).click();
  await expect(second.locator('#decision-state')).toHaveText('Needs rechecking');
  await expect(second.locator('#notes')).toHaveValue(note);
  await expect(second.locator('#source-editions')).toContainText('بدلا مصرع');
  await expect(second.locator('#decision-context')).toContainText('Evidence for this pass changed');
});

test('renames preserve review, metadata filters work on mobile, and English has no Roman pass', async ({ page, editorial }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFirst(page, editorial.origin);
  await page.getByLabel('Review pass', { exact: true }).selectOption('source');
  await page.getByLabel('What did you verify, or what still needs work?').fill('The source reading has been manually checked.');
  await page.getByRole('button', { name: 'Accept this pass', exact: true }).click();
  await expect(page.locator('#message')).toContainText('Decision saved');
  await rename(join(editorial.lyrics, 'pehla-kalam.md'), join(editorial.lyrics, 'reviewed-title.md'));
  await page.getByRole('button', { name: 'Refresh corpus', exact: true }).click();
  await expect(page.locator('#source-path')).toHaveText('src/data/lyrics/reviewed-title.md');
  await expect(page.locator('#decision-state')).toHaveText('Accepted');
  await expect(page.locator('#source-moves')).toContainText('pehla-kalam.md');
  await page.getByLabel('Review queue', { exact: true }).selectOption('metadata');
  await expect(page.locator('#results .result')).toHaveCount(1);
  await page.getByRole('button', { name: /An English original/u }).click();
  await expect(page.locator('#task option[value=roman]')).toHaveCount(0);
  await expect(page.locator('#task option[value=alignment]')).toHaveCount(0);
  await expect(page.locator('#source-editions')).toContainText('English is the original reading.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Editorial rules', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#rules-content')).toContainText('Read the source and Roman editions manually.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
