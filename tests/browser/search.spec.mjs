import { test, expect } from "@playwright/test";

test("search shows verified Basta kalams once without redundant page links", async ({ page }) => {
  await page.goto("/search/?q=" + encodeURIComponent("Jo zer-e-kisa parwaan charhe Zainab"));
  const title = "Jo zer-e-kisa parwaan charhe Zainab aisi hasti hai";
  const result = page.locator(".pf-result").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
  await expect(result).toHaveCount(1, { timeout: 20000 });
  await expect(result.locator(".pf-result-title a")).toHaveAttribute(
    "href", /\/basta\/kalam\/basta-[a-z0-9-]+\//,
  );
  await expect(result.getByRole("link", { name: "Printed page 391" })).toHaveCount(0);
  await expect(result.locator(".search-result-roman-title")).toHaveCount(0);
  // The printed scan route remains directly accessible, but must not
  // appear again as an independent result for this indexed poem.
  await expect(page.locator(".pf-result-title a[href='/basta/391/']")).toHaveCount(0);
});

test("search excerpts show verses without repeating the title and alternate title", async ({ page }) => {
  await page.goto("/search/?q=" + encodeURIComponent("hashim ke ghara"));
  const title = "ہاشم کے گھرانے کے قمر ہے میری فریاد";
  const result = page.locator(".pf-result").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
  await expect(result).toHaveCount(1, { timeout: 20000 });
  await expect(result.locator(".search-result-roman-title")).toHaveText("Hashim Ke Gharane Ke Qamar");
  const excerpt = result.locator(".pf-result-excerpt");
  await expect(excerpt).toBeVisible();
  await expect(excerpt).not.toContainText(title);
  await expect(excerpt).not.toContainText("Hashim Ke Gharane Ke Qamar");
});

test("search filters select multiple alternatives within each facet", async ({ page }) => {
  await page.goto("/search/?kalamType=Soz&kalamType=Salam");
  const facet = page.locator('[data-search-facet="kalamType"]');
  await facet.locator("summary").click();
  await expect(facet.locator('input[data-facet-choice="kalamType"]:checked')).toHaveCount(2);
  await expect(page.locator('[data-filter-key="kalamType"]')).toHaveCount(2);
  await expect(page.locator("pagefind-results .pf-result-link").first())
    .toBeVisible({ timeout: 20000 });
  await page.locator('[data-filter-key="kalamType"][data-filter-value="Salam"]').click();
  await expect(page.locator('[data-filter-key="kalamType"]')).toHaveCount(1);
  await expect(page).toHaveURL(/kalamType=Soz/);
  await expect(page).not.toHaveURL(/kalamType=Salam/);
});

test("two selections in one facet persist across reloads and individual chip removal", async ({ page }) => {
  await page.goto("/search/");
  const facet = page.locator('[data-search-facet="haal"]');
  await facet.locator("summary").click();
  const options = facet.locator('[data-facet-choice="haal"]');
  await expect(options.nth(1)).toBeAttached({ timeout: 20000 });
  const first = await options.nth(0).inputValue();
  const second = await options.nth(1).inputValue();
  await options.nth(0).check();
  await options.nth(1).check();
  await expect(facet.locator("input:checked")).toHaveCount(2);
  await expect.poll(() => new URL(page.url()).searchParams.getAll("haal")).toEqual([first, second]);
  await page.reload();
  await expect(facet.locator("input:checked")).toHaveCount(2);
  await page.locator('[data-filter-key="haal"]').first().click();
  await expect(page.locator('[data-filter-key="haal"]')).toHaveCount(1);
});

test("multi-valued lyric categories appear in both browse lists and just one detail page", async ({ page }) => {
  for (const category of ["noha", "salam"]) {
    await page.goto(`/categories/${category}/`);
    await expect(page.locator('a.lyric-card-link[href="/lyrics/fatima-ke-chain-ne/"]')).toHaveCount(1);
  }
  await page.goto("/lyrics/fatima-ke-chain-ne/");
  await expect(page.locator('.reader-subnav a[href="/categories/noha/"]')).toHaveCount(1);
  await expect(page.locator('.reader-subnav a[href="/categories/salam/"]')).toHaveCount(1);
});

test("independent reciters each retrieve the same kalam without a combined facet", async ({ page }) => {
  for (const reciter of ["Sachey Bhai", "Shadman Raza"]) {
    await page.goto("/search/?q=" + encodeURIComponent("Shaah-e-Mardaaṅ") +
      "&reciter=" + encodeURIComponent(reciter));
    await expect(page.locator('a.pf-result-link[href="/lyrics/shaahe-mardan/"]'))
      .toBeVisible({ timeout: 20000 });
  }
  await page.goto("/search/");
  const facets = await page.evaluate(async () => {
    const pagefind = await import("/pagefind/pagefind.js");
    return pagefind.filters();
  });
  for (const category of ["Salam", "Noha"]) {
    expect(facets.kalamType[category]).toBeGreaterThan(0);
  }
  for (const reciter of ["Sachey Bhai", "Shadman Raza"]) {
    expect(facets.reciter[reciter]).toBeGreaterThan(0);
  }
  expect(facets.reciter["Sachey Bhai; Shadman Raza"]).toBeUndefined();

  await page.goto("/lyrics/shaahe-mardan/");
  for (const reciter of ["Sachey Bhai", "Shadman Raza"]) {
    await expect(page.locator('.lyric-details a[href*="reciter="]')
      .filter({ hasText: reciter })).toHaveCount(1);
  }
});


test("Shahmukhi titles are found with Arabic keyboard spelling", async ({ page }) => {
  for (const [query, url] of [
    ["علي سوہنا", "/lyrics/ali-sohna-sher-rab-da/"],
    ["سكينه بیمار", "/lyrics/zindaan-day-vich-ro-ro-sakina-beemaar-nu-bulaway/"],
  ]) {
    await page.goto("/search/?q=" + encodeURIComponent(query));
    await expect(page.locator('a.pf-result-link[href="' + url + '"]')).toBeVisible({ timeout: 20000 });
    expect(new URL(page.url()).searchParams.get("q")).toBe(query);
  }
});
