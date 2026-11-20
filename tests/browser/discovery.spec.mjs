import { test, expect } from "@playwright/test";
import { withoutJavaScript } from "./no-js.mjs";

test("metadata directories and paginated poem hubs work without JavaScript @smoke", async ({ browser }) => {
  await withoutJavaScript(browser, async page => {
    await page.goto("/poets/");
    await expect(page.getByRole("heading", { name: "Poets", exact: true })).toBeVisible();
    await expect(page.locator("#discovery-terms li")).toHaveCount(60);
    await expect(page.locator(".discovery-filter")).toBeHidden();
    await page.locator("#discovery-pagination a[rel=next]").click();
    await expect(page).toHaveURL(/\/poets\/page\/2\/$/);
    await expect(page.locator("#discovery-terms li")).toHaveCount(60);
    await page.goto("/languages/");
    await page.locator(".discovery-term").filter({ hasText: "Urdu" }).click();
    await expect(page.getByRole("heading", { name: "Urdu", exact: true })).toBeVisible();
    await expect(page.locator(".lyric-card")).toHaveCount(60);
    const first = await page.locator(".lyric-card-link").first().getAttribute("href");
    await page.locator("#discovery-pagination a[rel=next]").click();
    await expect(page.locator(".lyric-card")).toHaveCount(60);
    await expect(page.locator(`.lyric-card-link[href="${first}"]`)).toHaveCount(0);
    await page.goto("/occasions/");
    await expect(page.getByRole("heading", { name: "Occasions", exact: true })).toBeVisible();
    await expect(page.locator(".discovery-term").first()).toBeVisible();
  });
});

test("directory search finds names beyond the current static page on demand", async ({ page, request }) => {
  const response = await request.get("/data/discovery/poets.json");
  const names = await response.json();
  expect(names.length).toBeGreaterThan(60);
  const target = names.at(-1);
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/data/discovery/poets.json")) requests++; });
  await page.goto("/poets/");
  await expect(page.locator("#discovery-query")).toBeVisible();
  expect(requests).toBe(0);
  await page.locator("#discovery-query").fill(target.label);
  await expect(page.locator(`.discovery-term[href="${target.href}"]`)).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.locator("#discovery-pagination")).toBeHidden();
  expect(new URL(page.url()).searchParams.get("q")).toBe(target.label);
  await page.reload();
  await expect(page.locator("#discovery-query")).toHaveValue(target.label);
  await expect(page.locator(`.discovery-term[href="${target.href}"]`)).toBeVisible();
  await page.locator("#discovery-query").fill("");
  await expect(page.locator("#discovery-terms li")).toHaveCount(60);
  await expect(page.locator("#discovery-pagination")).toBeVisible();
  await page.locator("#discovery-query").fill("a");
  const more = page.locator("#discovery-more");
  await expect(more).toBeVisible();
  await more.focus();
  await more.press("Enter");
  await expect(page.locator(".discovery-term").nth(60)).toBeFocused();
});

test("metadata hub links preserve literal labels and preselect archive search", async ({ page }) => {
  await page.goto("/languages/");
  await page.locator(".discovery-term").filter({ hasText: "Panjabi" }).click();
  await expect(page.getByRole("heading", { name: "Panjabi", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Search within this collection", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("language")).toBe("Panjabi");
  await expect(page.locator('[data-filter-key="language"][data-filter-value="Panjabi"]')).toBeVisible();
});
