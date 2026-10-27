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


test("retired source remains in a programme with a clear warning @smoke", async ({ page }) => {
  const id = "retired-draft-2026";
  const set = {
    version: 1, title: "Programme with retired source", occasion: "", description: "",
    items: [{ uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "lyric",
      id: "formerly-published-kalam", sourceTitle: "Original kalam title" }],
  };
  await page.addInitScript(({ key, entry }) => {
    localStorage.setItem(key, JSON.stringify([entry]));
  }, { key: "kalam:recitation-drafts-v1", entry: { id, set } });
  await page.goto("/recite/read/?draft=" + id);
  await expect(page.locator("#recite-reader-title")).toHaveText(set.title);
  await expect(page.locator(".recite-work-placeholder")).toContainText("Original kalam title");
  await expect(page.locator(".recite-work-placeholder")).toContainText(
    "position and reference are preserved");
  await expect(page.locator("#recite-reader-contents option")).toHaveCount(1);
});

test("missing borrowed stanza does not hide the original Marsiya @smoke", async ({ page }) => {
  const id = "missing-stanza-draft";
  const set = {
    version: 1, title: "Marsiya with unavailable borrowed stanza", occasion: "", description: "",
    items: [{
      uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "basta",
      id: "basta-marsiye-001", sourceTitle: "First Marsiya",
      stanzaSequence: [
        { kalamId: "basta-marsiye-001", stanzaId: "stanza-001" },
        { kalamId: "basta-marsiye-002", stanzaId: "stanza-003" },
      ],
    }],
  };
  await page.addInitScript(({ key, entry }) => {
    localStorage.setItem(key, JSON.stringify([entry]));
  }, { key: "kalam:recitation-drafts-v1", entry: { id, set } });
  await page.route("**/data/basta-kalams/basta-marsiye-001.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({
      kalam: {
        id: "basta-marsiye-001", name: "First Marsiya", status: "ready",
        sectionRoman: "Marsiye", startPage: 142, preface: "",
        urdu: "پہلا مصرع", roman: "", stanzas: [{
          id: "stanza-001", number: 1, printedNumber: "۱",
          urdu: "پہلا مصرع", pages: [142],
        }],
      },
    }) }));
  await page.route("**/data/basta-kalams/basta-marsiye-002.json", (route) =>
    route.fulfill({ status: 404 }));
  await page.goto("/recite/read/?draft=" + id);
  await expect(page.locator(".lyric-reading-urdu .basta-kalam-text")).toContainText("پہلا مصرع");
  await expect(page.locator(".lyric-reading-urdu .recite-missing-stanza")).toContainText(
    "basta-marsiye-002 / stanza-003");
  await expect(page.locator(".recite-work-placeholder")).toHaveCount(0);
});
