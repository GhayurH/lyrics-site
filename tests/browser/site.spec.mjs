import { withoutJavaScript } from "./no-js.mjs";
// File role: Cross-route functionality and narrow-screen layout checks (no image assertions).
import { test, expect } from "@playwright/test";

test("homepage categories link to their listings and Basta modes remain reachable @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kalam Archive", exact: true })).toBeVisible();
  const category = page.locator(".home-type-card").first();
  const href = await category.getAttribute("href");
  expect(href).toMatch(/^\/categories\//);
  await category.click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator(".lyric-list .lyric-card").first()).toBeVisible();

  await page.goto("/basta/");
  await expect(page.getByRole("heading", { name: "Page by page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuous reader" })).toBeVisible();
  await expect(page.locator('a.basta-home-mode-card[href="/basta/read/"]')).toBeVisible();
  await expect(page.locator('a[href="/basta/index/"]')).toBeVisible();
});

test("Basta page jump opens the requested page @smoke", async ({ page }) => {
  await page.goto("/basta/");
  await page.locator("#basta-home-page-number").fill("138");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page).toHaveURL(/\/basta\/138\/$/);
  await expect(page.locator("[data-reading-root]")).toBeVisible();
  // Responsive geometry needs one document, not five redundant page loads.
  await page.goto("/basta/");
  for (const width of [320, 342, 390, 430, 560]) {
    await page.setViewportSize({ width, height: 844 });
    const input = await page.locator("#basta-home-page-number").boundingBox();
    const button = await page.locator(".basta-home-page-jump button").boundingBox();
    expect(Math.abs(input.y - button.y)).toBeLessThan(2);
    expect(input.x + input.width).toBeLessThanOrEqual(button.x);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  }

});

test("saving, revisiting, and clearing a lyric remains functional @smoke", async ({ page }) => {
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const button = page.locator(".lyric-header-actions [data-favorite-button]");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved/");
  await expect(page.locator("#favorites-list .lyric-card").first()).toBeVisible();
  await page.locator("#clear-favorites").click();
  await expect(page.locator("#favorites-list .lyric-card")).toHaveCount(0);
  await expect(page.locator("#favorites-heading")).toBeHidden();
});

test("Search exposes primary and secondary filters accessibly @smoke", async ({ page }) => {
  await page.goto("/search/");
  await expect(page.locator("pagefind-input")).toBeAttached();
  await expect(page.locator(".search-primary-filters pagefind-filter-dropdown")).toHaveCount(4);
  const advanced = page.locator(".search-more-filters");
  await expect(advanced).not.toHaveAttribute("open", "");
  await advanced.locator("summary").click();
  await expect(page.locator(".search-secondary-filters")).toBeVisible();
});
test("Search, Saved, and Basta provide usable no-JavaScript fallbacks", async ({ browser }) => {
  // One disabled-JavaScript browser context covers all three static fallbacks.
  await withoutJavaScript(browser, async (page) => {
    await page.goto("/search/");
    await expect(page.getByText("Search requires JavaScript", { exact: false })).toBeVisible();
    await page.goto("/saved/");
    await expect(page.getByText("Saved and recent lyrics require JavaScript", { exact: false })).toBeVisible();
    await page.goto("/basta/");
    await expect(page.locator(".basta-home-page-jump")).toBeHidden();
    await expect(page.locator(".basta-home-nojs")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse book index" })).toBeVisible();
  });
});

test("homepage search passes the entered term to archive search", async ({ page }) => {
  await page.goto("/");
  await page.locator("#home-search-query").fill("Ali");
  await page.locator(".home-search button").click();
  await expect(page).toHaveURL(/\/search\/\?q=Ali$/);
  await expect(page.locator("pagefind-input")).toBeAttached();
});

test("Basta bookmarks can be saved, revisited and removed from the Saved page", async ({ page }) => {
  await page.goto("/basta/145/");
  const button = page.locator("[data-basta-bookmark]");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved/");
  await expect(page.locator("#basta-bookmarks-list a")).toHaveText("Basta · Page 145");
  await page.locator("#basta-bookmarks-list button").click();
  await expect(page.locator("#basta-bookmarks-list li")).toHaveCount(0);
  await expect(page.locator("#basta-bookmarks-heading")).toBeHidden();
});

test("homepage continues local reading without showing an empty placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#home-continue")).toBeHidden();
  await page.goto("/basta/138/");
  await page.goto("/");
  await expect(page.locator("#home-continue")).toBeVisible();
  await expect(page.locator('.home-continue-link[href^="/basta/138/"]')).toBeVisible();
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await page.goto("/");
  await expect(page.locator('.home-continue-link[href="/lyrics/aa-asghar-bin-tere/"]')).toBeVisible();
});

test("search results index poetry without including metadata controls", async ({ page }) => {
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const source = page.locator("[data-pagefind-body]");
  await expect(source).toHaveCount(1);
  await expect(source).not.toContainText("About this kalam");
  await expect(source).not.toContainText("Original lyric sheet");
  await page.goto("/basta/328/");
  const basta = page.locator("[data-pagefind-body]");
  await expect(basta).toHaveCount(1);
  await expect(basta).not.toContainText("Line Spacing");
  await expect(basta.locator("p")).not.toHaveCount(0);
});

test("JSON library backup validates and restores only allowlisted data", async ({ page }) => {
  await page.goto("/saved/");
  await page.evaluate(() => localStorage.setItem("kalam:favorites",JSON.stringify(["aa-asghar-bin-tere"])));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kalam-archive-backup.json");
  page.once("dialog", (dialog) => dialog.accept());
  const reloaded = page.waitForEvent("load");
  await page.locator("#saved-import").setInputFiles({
    name: "backup.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "kalam-archive-local-data", version: 1,
      exportedAt: "2026-11-01T00:00:00Z",
      entries: { "kalam:favorites": JSON.stringify(["aa-asghar-bin-tere","test-item"]) },
    })),
  });
  await reloaded;
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("kalam:favorites") || "[]").length))
    .toBe(2);
});

test("individual verified Basta kalams support source navigation and archive facets", async ({ page }) => {
  await page.goto("/basta/kalams/");
  const link = page.locator('a[href^="/basta/kalam/"]').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.locator('[data-pagefind-filter="collection"]')).toHaveText("Basta");
  await expect(page.locator('[data-pagefind-filter="kalamType"]')).toBeVisible();
  await expect(page.locator("[data-reading-root]")).toBeVisible();
  const details = page.locator(".basta-kalam-source-map");
  if (await details.count()) {
    await details.locator("summary").click();
    const original = details.locator('a[href^="#scan-page-"]').first();
    await expect(original).toBeVisible();
    await original.click();
    expect(new URL(page.url()).hash).toMatch(/^#scan-page-\d+$/);
  }
});

test("offline search index is complete and generated after Pagefind build", async ({ request }) => {
  const response = await request.get("/data/offline-search-assets.json");
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.version).toBe(1);
  expect(data.totalBytes).toBeGreaterThan(0);
  expect(data.files.length).toBeGreaterThan(0);
  expect(data.files.every((path) => /^\/pagefind\//.test(path))).toBe(true);
  expect(data.assets.length).toBeGreaterThan(0);
  expect(data.assets.every((path) => path.startsWith("/_astro/"))).toBe(true);
});

test("correction dialog preserves selected verse and resolves printed stanza", async ({ page }) => {
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const selected = await page.locator(".lyrics-text .lyric-stanza")
    .filter({ has: page.locator(".poetry-stanza-number") })
    .first().locator(".lyric-verse").first().evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return node.textContent?.trim() || "";
  });
  await page.getByRole("button", { name: "Suggest correction" }).click();
  const dialog = page.locator("#correction-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[name="quote"]')).toHaveValue(selected);
  await expect(dialog.locator("[data-correction-location]")).toContainText("stanza");
  await dialog.getByRole("textbox", { name: "Suggested correction" }).fill("Proposed wording");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("empty correction can be cancelled and reopened without submitting", async ({ page }) => {
  await page.goto("/basta/284/");
  const open = page.locator("[data-correction-open]");
  await open.click();
  const dialog = page.locator("#correction-dialog");
  const suggestion = dialog.getByRole("textbox", { name: "Suggested correction" });
  await expect(dialog).toBeVisible();
  await expect(suggestion).toBeEmpty();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await open.click();
  await dialog.getByRole("button", { name: "Open email" }).click();
  await expect(dialog.locator("[data-correction-message]")).toHaveText("Enter your proposed correction.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await open.click();
  await expect(dialog.locator("[data-correction-message]")).toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
