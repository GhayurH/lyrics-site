import { test, expect } from '@playwright/test';

const lyric = '/lyrics/aa-asghar-bin-tere/';

test('sharing keeps paired source text and reloadable stanza anchors @smoke', async ({ page }) => {
  await page.goto(lyric);
  await page.getByRole('button', { name: 'Share a stanza', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share a stanza' });
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-passage-edition]').selectOption('both');
  const text = await dialog.locator('[data-passage-text]').inputValue();
  expect(text).toMatch(/[\u0600-\u06ff]/);
  expect(text).toMatch(/[A-Za-z]/);
  const link = await dialog.locator('[data-passage-url]').inputValue();
  expect(new URL(link).search).toBe('');
  await page.goto(link);
  await expect(dialog).toBeHidden();
  const id = new URL(link).hash.slice(1);
  await expect(page.locator(`[id="${id}"]`)).toBeVisible();
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  await page.reload();
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
});

test('Roman stanza links reveal the requested edition on a narrow reader', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lyric);
  const id = await page.locator('[data-stanza-edition="roman"][id]').first().getAttribute('id');
  await page.goto(lyric + '#' + id);
  await expect(page.locator(`[id="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-reading-root]')).toHaveAttribute('data-reading-columns', /roman/);
  await page.getByRole('button', { name: 'Show reading options', exact: true }).click();
  await page.locator('[data-reading-column][value="roman"]').uncheck();
  await page.getByRole('button', { name: 'Share a stanza', exact: true }).click();
  await page.locator('[data-passage-edition]').selectOption('roman');
  await page.getByRole('link', { name: 'Go to stanza' }).click();
  await expect(page.locator(`[id="${id}"]`)).toBeVisible();
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
});

test('search highlights use canonical matching without changing verse text', async ({ page }) => {
  await page.goto(lyric);
  const before = await page.locator('.lyric-reading-roman .lyric-verse').first().textContent();
  const query = before.trim().split(/\s+/).slice(0, 2).join(' ');
  await page.goto(lyric + '?highlight=' + encodeURIComponent(query));
  await expect(page.locator('.reading-search-match').first()).toBeVisible();
  await expect(page.locator('.lyric-reading-roman .lyric-verse').first()).toHaveText(before);
  await page.getByRole('button', { name: 'Focus Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Show reading options', exact: true }).click();
  await expect(page.locator('.reading-search-navigation')).toBeVisible();
  expect(await page.locator('.reading-search-navigation').evaluate(node => Boolean(node.closest('[inert]')))).toBe(false);
  await page.getByRole('button', { name: 'Clear highlights' }).click();
  await expect(page.locator('.reading-search-match')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('highlight')).toBe(false);
});

test('Basta sharing retains permanent and legacy bookmark anchors', async ({ page }) => {
  await page.goto('/basta/kalam/basta-marsiye-117/');
  const target = page.locator('[data-stanza-fragment][data-stanza-edition="original"]').first();
  await expect(target).toHaveAttribute('id', /^stanza-/);
  const id = await target.getAttribute('id');
  await expect(page.locator('#basta-stanza-1')).toHaveCount(1);
  await page.goto('/basta/kalam/basta-marsiye-117/#' + id);
  await expect(page.locator(`[id="${id}"]`)).toBeVisible();
  expect(await page.locator(`[id="${id}"]`).evaluate(node => node.tabIndex)).toBe(0);
  await page.getByRole('button', { name: 'Share a stanza', exact: true }).click();
  await expect(page.locator('[data-passage-text]')).not.toHaveValue('');
});

test('scan failures offer an original link and recover on retry', async ({ page }) => {
  let available = false;
  await page.route('**/images/basta/original/138.png', (route) => available
    ? route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="white"/></svg>' })
    : route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/basta/138/');
  await page.locator('[data-reading-column][value="image"]').check();
  await page.locator('.basta-original-page > a').first().click();
  const viewer = page.getByRole('dialog', { name: 'Original page scan' });
  await expect(viewer.getByRole('button', { name: 'Retry scan' })).toBeVisible();
  await expect(viewer.getByRole('link', { name: 'Open original scan' })).toHaveAttribute('href', /138\.png$/);
  available = true;
  await viewer.getByRole('button', { name: 'Retry scan' }).click();
  await expect(viewer.locator('img')).toHaveJSProperty('naturalWidth', 600);
  await expect(viewer.locator('.scan-viewer-canvas')).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Retry scan' })).toBeHidden();
});
