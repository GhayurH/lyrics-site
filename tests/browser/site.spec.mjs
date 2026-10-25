// File role: Cross-route functionality and narrow-screen layout checks (no image assertions).
import { test, expect } from "@playwright/test";

test("homepage categories link to their listings and Basta modes remain reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kalam Archive", exact: true })).toBeVisible();
  const category = page.locator(".category-see-all").first();
  const href = await category.getAttribute("href");
  expect(href).toMatch(/^\/categories\//);
  await category.click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator(".lyric-list .lyric-card").first()).toBeVisible();

  await page.goto("/basta/");
  await expect(page.getByRole("heading", { name: "Page-by-page reader" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuous reader" })).toBeVisible();
  await expect(page.locator('a[href="/basta/read/"]')).toBeVisible();
  await expect(page.locator('a[href="/basta/index/"]')).toBeVisible();
});

test("Basta page jump opens the requested page", async ({ page }) => {
  await page.goto("/basta/");
  await page.locator("#basta-home-page-number").fill("138");
  await page.getByRole("button", { name: "Open page" }).click();
  await expect(page).toHaveURL(/\/basta\/138\/$/);
  await expect(page.locator("[data-reading-root]")).toBeVisible();
});

test("saving, revisiting, and clearing a lyric remains functional", async ({ page }) => {
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

test("appearance persists across pages and search filters are accessible", async ({ page }) => {
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

test("core pages never create a viewport-wide horizontal scrollbar on phones", async ({ page }) => {
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
