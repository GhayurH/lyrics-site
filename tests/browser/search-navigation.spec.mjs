import { test, expect } from "@playwright/test";
import { lyricSourceUrl } from "./catalog.mjs";

async function ready(page) {
  await expect(page.locator("#search-results")).toHaveAttribute("aria-busy", "false", { timeout: 20000 });
  await expect(page.locator("#search-load-error")).toBeHidden();
}

test("facet counts retain alternatives while respecting query and other facets @smoke", async ({ page }) => {
  const query = "Fatima Ke Chain Ne";
  await page.goto("/search/?" + new URLSearchParams({ q: query, kalamType: "Noha", language: "Urdu" }));
  await ready(page);
  const expected = await page.evaluate(async query => {
    const pagefind = await import("/pagefind/pagefind.js");
    const vocabulary = await pagefind.filters();
    const response = await pagefind.search(query.toLowerCase(), { filters: { language: ["Urdu"] } });
    return { contextual: response.filters.kalamType.Salam, global: vocabulary.kalamType.Salam };
  }, query);
  expect(expected.contextual).toBeGreaterThan(0);
  expect(expected.contextual).toBeLessThan(expected.global);
  const facet = page.locator('[data-search-facet="kalamType"]');
  await facet.locator("summary").click();
  const salam = facet.locator('label').filter({ has: page.locator('input[value="Salam"]') });
  await expect(salam.locator("[data-facet-count]")).toHaveText(String(expected.contextual));
  await expect(salam.locator("input")).toBeEnabled();
  await salam.locator("input").check();
  await ready(page);
  await expect(facet.locator("input:checked")).toHaveCount(2);
});

test("Back and Forward restore raw query, facets, results and pagination", async ({ page, request }) => {
  const expected = await lyricSourceUrl(request, "abbas-alamdar-balti");
  await page.goto("/search/?q=Ali&collection=Lyrics");
  await ready(page);
  await page.getByRole("link", { name: "Next results page", exact: true }).click();
  await ready(page);
  await expect(page).toHaveURL(/page=2/);
  const secondPage = await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname));
  await page.locator("#search-query").fill("Abbas Alamdar Balti");
  await page.locator("#search-query").press("Enter");
  await ready(page);
  await expect(page.locator(`.pf-result-link[href^="${expected}?"]`)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  const newResults = await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname));
  await page.goBack();
  await expect(page.locator("#search-query")).toHaveValue("Ali");
  await expect(page).toHaveURL(/page=2/);
  await ready(page);
  await expect(page.locator('[data-filter-key="collection"][data-filter-value="Lyrics"]')).toBeVisible();
  expect(await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname))).toEqual(secondPage);
  await page.goBack();
  await ready(page);
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  await page.goForward();
  await expect(page).toHaveURL(/page=2/);
  await ready(page);
  await page.goForward();
  await expect(page.locator("#search-query")).toHaveValue("Abbas Alamdar Balti");
  await ready(page);
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  expect(await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname))).toEqual(newResults);
});

test.describe("controlled search network", () => {
  // A service worker can satisfy requests before Playwright sees them. Only
  // this race test bypasses that cache; the real Pagefind worker/WASM still runs.
  test.use({ serviceWorkers: "block" });

  test("late result fragments cannot overwrite a newer query", async ({ page, context, request }) => {
    let release = () => {};
    const gate = new Promise(resolve => { release = () => resolve(undefined); });
    let heldURL = "";
    await context.route(/\/pagefind\/fragment\//, async route => {
      if (!heldURL) { heldURL = route.request().url(); await gate; }
      await route.continue();
    });
    try {
      await page.goto("/search/?q=qzxvplmrt");
      await ready(page);
      await page.locator("#search-query").fill("Hashim ke gharane");
      await page.locator("#search-query").press("Enter");
      await expect.poll(() => heldURL, { message: "Intercept the earlier query's real fragment", timeout: 10000 }).not.toBe("");
      await page.locator("#search-query").fill("Abbas Alamdar Balti");
      await page.locator("#search-query").press("Enter");
      const expected = await lyricSourceUrl(request, "abbas-alamdar-balti");
      const target = page.locator(`.pf-result-link[href^="${expected}?"]`);
      await expect(target).toBeVisible({ timeout: 20000 });
      await ready(page);
      const newResults = await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname));
      // Complete the old request only after the newer results are visible.
      release();
      await page.evaluate(async () => {
        const pagefind = await import("/pagefind/pagefind.js");
        const earlier = await pagefind.search("hashim ke gharane");
        await Promise.all(earlier.results.slice(0, 20).map(result => result.data()));
      });
      expect(await page.locator(".pf-result-link").evaluateAll(links => links.map(link => link.pathname))).toEqual(newResults);
      const destination = new URL(await target.getAttribute("href"), page.url());
      expect(destination.searchParams.get("highlight")).toBe("Abbas Alamdar Balti");
      await expect(page.locator("#search-query")).toHaveValue("Abbas Alamdar Balti");
    } finally { release(); }
  });
});

test("remembered verse result opens a highlighted source passage", async ({ page, request }) => {
  const query = "عباس کٹے ہاتھوں سے تقدیر";
  const source = await lyricSourceUrl(request, "hashim-ke-gharane-ke-qamar");
  await page.goto("/search/?q=" + encodeURIComponent(query));
  const result = page.locator(`.pf-result-link[href^="${source}?"]`);
  await expect(result).toBeVisible({ timeout: 20000 });
  await result.click();
  await expect(page.locator(".reading-search-match").first()).toBeVisible();
  await expect(page.locator(".reading-search-navigation")).toContainText(query);
  await expect(page.locator(".reading-search-match").first()).toContainText("عباس کٹے ہاتھوں سے تقدیر بنا دو");
});

test("recitation picker and facet vocabulary use the same spelling normalization", async ({ page, request }) => {
  const ali = await lyricSourceUrl(request, "ali-sohna-sher-rab-da-tahseen-sakina-lyrics-in-punjabi-2022");
  await page.goto("/recite/");
  await page.locator("#recite-search").fill("عَلِي سوہنا");
  await expect(page.locator(`#recite-results a[href="${ali}"]`)).toBeVisible();
  await page.locator("#recite-search").fill("Aa Asgar Bin Tere");
  const asghar = await lyricSourceUrl(request, "aa-asghar-bin-tere");
  await expect(page.locator(`#recite-results a[href="${asghar}"]`)).toBeVisible();
  await page.goto("/search/");
  await ready(page);
  await page.locator(".search-more-filters > summary").click();
  const facet = page.locator('[data-search-facet="language"]');
  await facet.locator("summary").click();
  await facet.locator("[data-facet-query]").fill("Punjabi");
  await expect(facet.locator('[data-facet-choice]')).toHaveCount(1);
  await expect(facet.locator('[data-facet-choice]')).toHaveValue("Panjabi");
});

test("keyboard focus survives removing chips and closing facet options", async ({ page }) => {
  await page.goto("/search/?kalamType=Noha&language=Urdu");
  await ready(page);
  const chips = page.locator("#active-search-filter-list button");
  await chips.first().focus();
  await chips.first().press("Enter");
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toBeFocused();
  await chips.first().press("Enter");
  await expect(page.locator("#search-query")).toBeFocused();
  const facet = page.locator('[data-search-facet="kalamType"]');
  await facet.locator("summary").focus();
  await facet.locator("summary").press("Enter");
  await expect(facet).toHaveAttribute("open", "");
  await facet.locator("[data-facet-query]").focus();
  await facet.locator("[data-facet-query]").press("Escape");
  await expect(facet).not.toHaveAttribute("open", "");
  await expect(facet.locator("summary")).toBeFocused();
});

test("contextually available poet appears before irrelevant global values", async ({ page }) => {
  await page.goto("/search/?q=Ali+Sohna+Sher+Rab+Da");
  await ready(page);
  await page.locator(".search-more-filters > summary").click();
  const facet = page.locator('[data-search-facet="poet"]');
  await facet.locator("summary").click();
  await expect(facet.locator('[data-facet-choice][value="Sarwar Shakir"]')).toBeVisible();
  await expect(facet.locator('[data-facet-choice][value="Sarwar Shakir"]')).toBeEnabled();
  const hints = page.locator('[data-facet-hint][aria-live="polite"]');
  await expect(hints).toHaveCount(1);
});
