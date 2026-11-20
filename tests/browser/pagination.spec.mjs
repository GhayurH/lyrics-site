import { test, expect } from "@playwright/test";

test.use({ javaScriptEnabled: false });
test("category pages remain crawlable and usable without JavaScript @smoke", async ({ page }) => {
  await page.goto("/categories/noha/");
  await expect(page.locator('.category-page h1')).toHaveText("Noha");
  await expect(page.locator('.lyric-list > li')).toHaveCount(60);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/categories\/noha\/$/);
  const firstPage = await page.locator('.lyric-card-link').evaluateAll(links => links.map(link => link.getAttribute("href")));
  const top = page.getByRole("navigation", { name: "Noha pages, top", exact: true });
  await top.getByRole("link", { name: "Next →", exact: true }).click();
  await expect(page).toHaveURL(/\/categories\/noha\/page\/2\/$/);
  await expect(page.locator('.lyric-list > li')).toHaveCount(60);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/categories\/noha\/page\/2\/$/);
  const secondPage = await page.locator('.lyric-card-link').evaluateAll(links => links.map(link => link.getAttribute("href")));
  expect(secondPage.some(href => firstPage.includes(href))).toBe(false);
  await top.getByRole("link", { name: "← Previous", exact: true }).click();
  await expect(page).toHaveURL(/\/categories\/noha\/$/);
  await page.getByRole("navigation", { name: "Browse collections", exact: true })
    .getByRole("link", { name: "Basta selections", exact: true }).click();
  await expect(page.locator("#basta-kalam")).toBeVisible();
  await expect(page.locator('.lyric-card-link[href^="/basta/"]').first()).toBeVisible();
});
