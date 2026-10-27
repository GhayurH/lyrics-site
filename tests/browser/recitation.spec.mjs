import { test, expect } from "@playwright/test";

test("create local recitation programme and read standalone lyric @smoke", async ({ page }) => {
  await page.goto("/recite/");
  await expect(page.getByRole("heading", { name: "Recitation Sets" })).toBeVisible();
  await page.locator("#recite-title").fill("Test recitation programme");
  await page.locator("#recite-source").selectOption("lyric");
  const result = page.locator("#recite-results li button:not([disabled])").first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator("#recite-count")).toContainText("1 kalam");
  await expect(page.locator("#recite-sequence li")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#recite-title")).toHaveValue("Test recitation programme");
  await expect(page.locator("#recite-sequence li")).toHaveCount(1);
  await page.locator("#recite-open-reader").click();
  await expect(page).toHaveURL(/\/recite\/read\/\?draft=/);
  await expect(page.locator("#recite-reader-title")).toHaveText("Test recitation programme");
  await expect(page.locator(".recite-work-header h2")).toBeVisible();
  await page.locator("#recite-reader-view").selectOption("sequential");
  await expect(page.locator("#recite-position")).toHaveText("1 / 1");
  await expect(page.locator(".recite-editions .lyric-reading-urdu")).toBeVisible();
});

test("local recitation ordering and duplication @smoke", async ({ page }) => {
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Two kalams");
  await page.locator("#recite-source").selectOption("lyric");
  const add = page.locator("#recite-results li button:not([disabled])");
  await expect(add.first()).toBeVisible();
  await add.first().click();
  await add.nth(1).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-sequence li").nth(1).getByRole("button",{name:"↑"}).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-duplicate").click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await expect(page.locator("#recite-drafts option")).toHaveCount(2);
});


test("borrow and reorder verified Marsiya stanzas @smoke", async ({ page }) => {
  const index = { version: 1, kalams: [
    { id: "basta-marsiye-001", name: "پہلا مرثیہ", romanName: "Pehla Marsiya",
      sectionRoman: "Marsiye", status: "ready", numbered: true, stanzaCount: 2,
      sourceUrl: "/basta/142/" },
    { id: "basta-marsiye-002", name: "دوسرا مرثیہ", romanName: "Dusra Marsiya",
      sectionRoman: "Marsiye", status: "ready", numbered: true, stanzaCount: 1,
      sourceUrl: "/basta/143/" },
  ] };
  const makePoem = (id, title, stanzas) => ({
    version: 1, kalam: {
      id, name: title, romanName: id, sectionRoman: "Marsiye",
      startPage: 142, pages: [142], status: "ready",
      preface: title, urdu: title, roman: "Roman preface",
      stanzas: stanzas.map((name, i) => ({
        id: "stanza-" + String(i + 1).padStart(3, "0"),
        number: i + 1, printedNumber: String(i + 1),
        urdu: name, roman: "Roman verse " + (i + 1), pages: [142],
      })),
    },
  });
  await page.route("**/data/basta-kalams.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(index) }));
  await page.route("**/data/saved-catalog.json", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }));
  await page.route("**/data/basta-kalams/basta-marsiye-001.json", (route) =>
    route.fulfill({ contentType: "application/json",
      body: JSON.stringify(makePoem("basta-marsiye-001", "پہلا مرثیہ", ["اول", "دوم"])) }));
  await page.route("**/data/basta-kalams/basta-marsiye-002.json", (route) =>
    route.fulfill({ contentType: "application/json",
      body: JSON.stringify(makePoem("basta-marsiye-002", "دوسرا مرثیہ", ["دوسرے کا بند"])) }));
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Mixed Marsiya");
  await page.locator("#recite-source").selectOption("basta");
  await page.locator("#recite-results li button").first().click();
  await page.getByRole("button", { name: "Arrange stanzas" }).click();
  await expect(page.locator("#recite-stanzas li")).toHaveCount(2);
  await page.locator("#recite-borrow-kalam").selectOption("basta-marsiye-002");
  await page.locator("#recite-borrow-add").click();
  await expect(page.locator("#recite-stanzas li")).toHaveCount(3);
  await expect(page.locator("#recite-stanzas li").last()).toContainText("دوسرا مرثیہ");
  await page.locator("#recite-stanzas li").last().getByRole("button", { name: "↑" }).click();
  await page.locator("#recite-open-reader").click();
  await expect(page.locator(".recite-stanza-source").first()).toContainText("دوسرا مرثیہ");
  await expect(page.locator(".lyric-reading-urdu .basta-kalam-text").first()).toBeVisible();
});
