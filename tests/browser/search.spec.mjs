import { test, expect } from "@playwright/test";

test("search shows verified Basta kalams once, with kalam and printed-page links", async ({ page }) => {
  await page.goto("/search/?q=" + encodeURIComponent("Jo ummaton ka parda rakhe Zainab"));
  const title = "Jo ummatoṅ ka parda rakhe Zainab aisi hasti hai";
  const result = page.locator(".pf-result").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
  await expect(result).toHaveCount(1, { timeout: 20000 });
  await expect(result.locator(".pf-result-title a")).toHaveAttribute(
    "href", /\/basta\/kalam\/basta-[a-z0-9-]+\//,
  );
  await expect(result.getByRole("link", { name: "Printed page 391" }))
    .toHaveAttribute("href", "/basta/391/");
  await expect(result.locator(".search-result-roman-title")).toHaveCount(0);
  // The printed scan route remains directly accessible, but must not
  // appear again as an independent result for this indexed poem.
  await expect(page.locator(".pf-result-title a[href='/basta/391/']")).toHaveCount(0);
});

test("search filters select multiple alternatives within each facet", async ({ page }) => {
  await page.goto("/search/?kalamType=Soz&kalamType=Salam");
  const facet = page.locator('pagefind-filter-dropdown[filter="kalamType"]');
  await expect(facet).not.toHaveAttribute("single-select", "");
  await expect(page.locator('[data-filter-key="kalamType"]')).toHaveCount(2);
  await expect(page.locator("pagefind-results .pf-result-link").first())
    .toBeVisible({ timeout: 20000 });
  await page.locator('[data-filter-key="kalamType"][data-filter-value="Salam"]').click();
  await expect(page.locator('[data-filter-key="kalamType"]')).toHaveCount(1);
  await expect(page).toHaveURL(/kalamType=Soz/);
  await expect(page).not.toHaveURL(/kalamType=Salam/);
});
