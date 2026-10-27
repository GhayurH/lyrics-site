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
  await expect(page.getByRole("link", { name: "Open continuous reader" })).toBeVisible();
  await expect(page.locator('a[href="/basta/index/"]')).toBeVisible();
});

test("Basta page jump opens the requested page", async ({ page }) => {
  await page.goto("/basta/");
  await page.locator("#basta-home-page-number").fill("138");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page).toHaveURL(/\/basta\/138\/$/);
  await expect(page.locator("[data-reading-root]")).toBeVisible();
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
  await expect(page.locator("#favorites-empty")).toBeVisible();
});

test("appearance persists across pages and search filters are accessible @smoke", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f7f7f8");
  await page.goto("/search/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("pagefind-input")).toBeAttached();
  await expect(page.locator(".search-primary-filters pagefind-filter-dropdown")).toHaveCount(4);
  await page.locator(".search-more-filters > summary").click();
  await expect(page.locator(".search-secondary-filters")).toBeVisible();
});

test("core pages never create a viewport-wide horizontal scrollbar on phones @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/search/", "/saved/", "/about/", "/basta/", "/basta/index/", "/basta/138/"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  }
});

test("Search and Saved explain their browser-only features without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/search/");
  await expect(page.getByText("Search requires JavaScript", { exact: false })).toBeVisible();
  await page.goto("/saved/");
  await expect(page.getByText("Saved and recent lyrics require JavaScript", { exact: false })).toBeVisible();
  await context.close();
});

test("Saved avoids an empty resume section until the user reads Basta", async ({ page }) => {
  await page.goto("/saved/");
  await expect(page.locator("[data-basta-resume-section]")).toBeHidden();
  await page.goto("/basta/138/");
  await page.goto("/saved/");
  await expect(page.locator("[data-basta-resume-section]")).toBeVisible();
  await expect(page.locator("[data-resume-basta]")).toHaveAttribute("href", /\/basta\/138\//);
});


test("homepage search passes the entered term to archive search", async ({ page }) => {
  await page.goto("/");
  await page.locator("#home-search-query").fill("Ali");
  await page.locator(".home-search button").click();
  await expect(page).toHaveURL(/\/search\/\?q=Ali$/);
  await expect(page.locator("pagefind-input")).toBeAttached();
});

test("Basta landing offers a contextual resume link after reading", async ({ page }) => {
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-resume")).toBeHidden();
  await page.goto("/basta/138/");
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-resume")).toBeVisible();
  await expect(page.locator(".basta-home-resume")).toHaveAttribute("href", /\/basta\/138\//);
});


test("Basta landing prioritizes the saved reading position without duplicating entry buttons", async ({ page }) => {
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-mode-card")).toHaveCount(2);
  await expect(page.locator(".basta-home-resume-panel")).toBeHidden();
  await page.goto("/basta/138/");
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-resume-panel")).toBeVisible();
  const resume = await page.locator(".basta-home-resume-panel").boundingBox();
  const modes = await page.locator(".basta-home-mode-grid").boundingBox();
  expect(resume.y + resume.height).toBeLessThan(modes.y);
  await expect(page.locator(".basta-home-resume")).toContainText("page 138");
});

test("Basta page jump stays on one row on small screens", async ({ page }) => {
  for (const width of [320, 342, 390, 430, 560]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/basta/");
    const input = await page.locator("#basta-home-page-number").boundingBox();
    const button = await page.locator(".basta-home-page-jump button").boundingBox();
    expect(Math.abs(input.y - button.y)).toBeLessThan(2);
    expect(input.x + input.width).toBeLessThanOrEqual(button.x);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  }
});

test("Basta without JavaScript offers the index instead of a nonfunctional jump form", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-page-jump")).toBeHidden();
  await expect(page.locator(".basta-home-nojs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse book index" })).toBeVisible();
  await context.close();
});

test("both landing pages display the book cover", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".home-basta-preview")).toHaveAttribute("src", "/images/basta/original/000.jpg");
  await page.goto("/basta/");
  await expect(page.locator(".basta-home-scan img")).toHaveAttribute("src", "/images/basta/original/000.jpg");
  await expect(page.locator(".basta-home-scan img")).toHaveAttribute("alt", "Basta book cover");
  await expect(page.locator(".basta-home-scan-caption")).toHaveText("Book cover");
});

test("Saved page contains browser-local Basta and programme libraries @smoke", async ({ page }) => {
  await page.goto("/saved/");
  await expect(page.locator("#basta-bookmarks-heading")).toBeVisible();
  await expect(page.locator("#recitation-drafts-heading")).toBeVisible();
});
