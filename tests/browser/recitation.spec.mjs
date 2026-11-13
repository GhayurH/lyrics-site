import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("offline programme export contains complete text, reciter assignments and notes", async ({ page }) => {
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Offline printable programme");
  await page.locator("#recite-optional-details summary").click();
  await page.locator("#recite-description").fill("Organizers' programme notes");
  await page.locator("#recite-source").selectOption("lyric");
  await expect(page.locator("#recite-results li button:not([disabled])").first()).toBeVisible();
  await page.locator("#recite-results li button:not([disabled])").first().click();
  await page.locator(".recite-inline-note input").first().fill("Assigned reciter");
  await page.locator(".recite-inline-note input").first().blur();
  await page.locator(".recite-inline-note input").nth(1).fill("Read after opening salaam");
  await page.locator(".recite-inline-note input").nth(1).blur();
  await page.locator("#recite-open-reader").click();
  await page.locator(".recite-reader-exports summary").click();
  const pending = page.waitForEvent("download");
  await page.locator("#recite-download-offline").click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const html = await readFile(await download.path(), "utf8");
  expect(html).toContain("Offline printable programme");
  expect(html).toContain("Organizers&#39; programme notes");
  expect(html).toContain("Assigned reciter");
  expect(html).toContain("Read after opening salaam");
  expect(html).toContain('aria-label="Original poem text"');
  expect(html).toContain("Roman Urdu");
  expect(html).not.toContain("<script");
  expect(html).not.toMatch(/<img\b/i);
  expect(html).toContain('font-src data:;');
  expect(html).toContain('"Noto Nastaliq Urdu"');
  expect(html).toMatch(/woff2;base64,/);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const faces = await page.evaluate(() => [...document.fonts]
    .filter((font) => font.family === "Noto Nastaliq Urdu").map((font) => font.status));
  expect(faces).toContain("loaded");
  await page.emulateMedia({ media: "print" });
  const opening = page.locator(".recite-print-opening").first();
  await expect(opening.locator(".recite-work-header")).toHaveCount(1);
  await expect(page.locator(".recite-print-row").first()).toHaveCSS("break-inside", /avoid/);
  const aligned = await page.locator(".recite-print-row").first().evaluate((el) => {
    const roman = el.querySelector(".lyric-reading-roman").getBoundingClientRect();
    const urdu = el.querySelector(".lyric-reading-urdu").getBoundingClientRect();
    return Math.abs(roman.top - urdu.top) < 4 && roman.right <= urdu.left + 5;
  });
  expect(aligned).toBe(true);
  // Check Chromium's actual PDF page count, not just screen CSS geometry.
  const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true });
  const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  expect(pageCount).toBeGreaterThan(0);
  expect(pageCount).toBeLessThanOrEqual(3);
});

test("live navigation is opt-in and follows published entry UIDs", async ({ page }) => {
  const id = "0123456789abcdef01234567";
  const firstUid = "391002ab-16f4-4535-bf2a-8ca02cefc956";
  const nextUid = "b61002ab-16f4-4535-bf2a-8ca02cefc956";
  const items = [firstUid, nextUid].map((uid) => ({
    uid, kind: "lyric", id: "aa-asghar-bin-tere", sourceTitle: "Aa Asghar bin tere",
  }));
  const set = { version: 1, title: "Live programme", occasion: "", description: "",
    items, live: { active: true, currentUid: nextUid } };
  await page.route("**/api/recitation-sets/" + id, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ id, set }) }));
  await page.goto("/recite/read/?set=" + id);
  await expect(page.locator("#recite-position")).toHaveText("1 / 2");
  await expect(page.locator("#recite-live-label")).toBeVisible();
  await page.locator("#recite-follow-live").evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#recite-position")).toHaveText("2 / 2");
  await expect(page.locator("#recite-live-status")).toContainText("Following organizer");
  await page.locator("#recite-previous").click();
  await expect(page.locator("#recite-follow-live")).not.toBeChecked();
  await expect(page.locator("#recite-position")).toHaveText("1 / 2");
});



test("empty set disables unavailable actions and explains publishing requirements", async ({ page }) => {
  await page.goto("/recite/");
  const publish = page.locator("#recite-publish");
  const tooltip = page.locator("#recite-publish-control");
  await expect(page.locator("#recite-drafts option")).toHaveCount(1);
  await expect(page.locator("#recite-new")).toBeDisabled();
  await expect(page.locator("#recite-duplicate")).toBeDisabled();
  await expect(page.locator("#recite-delete")).toBeDisabled();
  await expect(publish).toBeDisabled();
  await expect(page.locator("#recite-publish-help")).toHaveText(
    "Give your set a title and add at least one kalam to publish.");
  await tooltip.hover();
  await expect.poll(() => tooltip.evaluate((el) =>
    getComputedStyle(el, "::after").visibility)).toBe("visible");
  await tooltip.focus();
  await expect(tooltip).toBeFocused();

  await page.locator("#recite-title").fill("Test set");
  await expect(page.locator("#recite-new")).toBeEnabled();
  await expect(page.locator("#recite-publish-help")).toHaveText("Add at least one kalam to publish.");
  await page.locator("#recite-source").selectOption("lyric");
  await expect(page.locator("#recite-results li button:not([disabled])").first()).toBeVisible();
  await page.locator("#recite-results li button:not([disabled])").first().click();
  await expect(page.locator("#recite-duplicate")).toBeEnabled();
  await expect(page.locator("#recite-delete")).toBeEnabled();
  await expect(publish).toBeEnabled();
  await expect(page.locator("#recite-publish-help")).toBeEmpty();
  await expect(tooltip).toHaveAttribute("data-unavailable", "false");

  await expect(page.locator(".recite-share")).toContainText("Create a link that others can use");
  await expect(page.locator(".recite-share")).not.toContainText("Cloudflare D1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#recite-delete").click();
  await expect(page.locator("#recite-delete")).toBeDisabled();
  await expect(publish).toBeDisabled();
});

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
  const kalamTitle = page.locator(".recite-work-header h2.kalam-reading-title");
  await expect(kalamTitle).toBeVisible();
  await expect(kalamTitle).toHaveCSS("text-align", "center");
  await expect(kalamTitle).toHaveCSS("text-decoration-line", "underline");
  expect(await kalamTitle.evaluate((node) => getComputedStyle(node).color))
    .not.toBe(await page.evaluate(() => getComputedStyle(document.body).color));
  await page.locator("#recite-reader-view").selectOption("sequential");
  await expect(page.locator("#recite-position")).toHaveText("1 / 1");
  await expect(page.locator(".recite-editions .lyric-reading-urdu")).toBeVisible();
});

test("local recitation ordering and duplication", async ({ page }) => {
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Two kalams");
  await page.locator("#recite-source").selectOption("lyric");
  const add = page.locator("#recite-results li button:not([disabled])");
  await expect(add.first()).toBeVisible();
  await add.first().click();
  await add.nth(1).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-sequence li").nth(1).getByRole("button", { name: /^Move .* up$/ }).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-duplicate").click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await expect(page.locator("#recite-drafts option")).toHaveCount(2);
});


test("borrow and reorder verified Marsiya stanzas", async ({ page }) => {
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
  await page.locator("#recite-stanzas li").last().getByRole("button", { name: /Move stanza .* up/ }).click();
  await page.locator("#recite-open-reader").click();
  await expect(page.locator(".recite-stanza-source")).toHaveCount(0);
  const original = page.locator(".lyric-reading-urdu .basta-kalam-text");
  await expect(original.first()).toBeVisible();
  await expect(original.locator(".poetry-stanza-number")).toHaveText(["۱", "۲", "۳"]);
  await expect(page.locator(".lyric-reading-roman .poetry-stanza-number")).toHaveText(["1", "2", "3"]);
  await expect(page.locator('.lyric-reading-urdu [data-source-kalam="basta-marsiye-002"]'))
    .toContainText("دوسرے کا بند");
  await page.locator(".recite-reader-exports summary").click();
  const downloaded = page.waitForEvent("download");
  await page.locator("#recite-download-offline").click();
  const html = await readFile(await (await downloaded).path(), "utf8");
  expect(html).not.toContain("recite-stanza-source");
  expect(html).toContain("دوسرے کا بند");
  expect(html).toContain('data-source-kalam="basta-marsiye-002"');
});


test("retired source remains in a programme with a clear warning", async ({ page }) => {
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

test("missing borrowed stanza does not hide the original Marsiya", async ({ page }) => {
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

test("organizer can permanently preserve, renew and delete published sets", async ({ page }) => {
  const id = "123456789abcdef123456789";
  const editToken = "a".repeat(64);
  let published;
  let changes = 0;
  let deletes = 0;
  const revision1 = "1".repeat(64);
  const revision2 = "2".repeat(64);
  await page.route("**/api/recitation-sets/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;
    if (method === "POST" && path.endsWith("/recitation-sets/")) {
      published = request.postDataJSON();
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id, editToken, permanent: true, expiresAt: null, revision: revision1,
      }) });
    }
    if (method === "PUT" && path.endsWith("/" + id)) {
      changes++;
      published = request.postDataJSON();
      expect(request.headers().authorization).toBe("Bearer " + editToken);
      expect(request.headers()["if-match"]).toBe(`"${revision1}"`);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({
        id, updated: true, revision: revision2, permanent: false, expiresAt: "2028-10-27T00:00:00.000Z",
      }) });
    }
    if (method === "DELETE" && path.endsWith("/" + id)) {
      deletes++;
      expect(request.headers().authorization).toBe("Bearer " + editToken);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id, deleted: true }) });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Retention test");
  await page.locator("#recite-source").selectOption("lyric");
  await page.locator("#recite-results li button:not([disabled])").first().click();
  await page.locator("#recite-permanent").check();
  await page.locator("#recite-publish").click();
  await expect(page.locator("#recite-expiration")).toContainText("stays available until you delete it");
  await expect(page.locator("#recite-delete-published")).toBeVisible();
  expect(published.permanent).toBe(true);
  await page.locator("#recite-permanent").uncheck();
  await page.locator("#recite-publish").click();
  await expect(page.locator("#recite-expiration")).toContainText("available until");
  expect(changes).toBe(1);
  expect(published.permanent).toBeUndefined();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#recite-delete-published").click();
  await expect(page.locator("#recite-message")).toContainText("permanently deleted");
  await expect(page.locator("#recite-shared-links")).toBeHidden();
  expect(deletes).toBe(1);
});

test("mobile builder progressively reveals optional fields and highlights the active step", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/recite/");
  const details = page.locator("#recite-optional-details");
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  await page.locator("#recite-occasion").fill("Majlis");
  const share = page.locator('.recite-steps a[href="#recite-share-heading"]');
  await share.click();
  await expect(share).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#recite-publish")).toBeDisabled();
});

test("Roman-only recitation falls back explicitly to its original scan if text is absent", async ({ page }) => {
  const id = "0123456789abcdef01234567";
  await page.route("**/api/recitation-sets/" + id, (route) =>
    route.fulfill({contentType:"application/json",body:JSON.stringify({
      id, set:{version:1,title:"Roman fallback",occasion:"",description:"",
        items:[{uid:"391002ab-16f4-4535-bf2a-8ca02cefc956",
          kind:"lyric",id:"aa-asghar-bin-tere",sourceTitle:"Aa Asghar bin tere"}]}
    })}));
  await page.route("**/data/recitation-lyrics/aa-asghar-bin-tere.json", (route) =>
    route.fulfill({contentType:"application/json",body:JSON.stringify({lyric:{
      id:"aa-asghar-bin-tere",title:"Test text",urdu:"سلام",roman:"",
      lang:"ur",direction:"rtl",cover:"/images/lyrics/sample.png"
    }})}));
  await page.goto("/recite/read/?set=" + id);
  await expect(page.locator(".recite-work-no-roman")).toBeVisible();
  await page.locator('[data-reading-column][value="urdu"]').uncheck();
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-mode","roman");
  await expect(page.locator(".recite-work-no-roman .lyric-reading-image")).toBeVisible();
  await expect(page.locator(".recite-work-no-roman .recite-empty-edition")).toContainText("Roman Urdu is not available");
});

test("sharing choices are disclosed as the programme becomes publishable", async ({ page }) => {
  await page.goto("/recite/");
  const options = page.locator("#recite-share-details");
  await expect(options).not.toHaveAttribute("open", "");
  await expect(page.locator("#recite-publish")).toBeVisible();
  await expect(page.locator("#recite-publish")).toBeDisabled();
  await page.locator("#recite-title").fill("Read for majlis");
  await expect(options).not.toHaveAttribute("open", "");
  await page.locator("#recite-source").selectOption("lyric");
  await page.locator("#recite-results li button:not([disabled])").first().click();
  await expect(options).toHaveAttribute("open", "");
  await expect(page.locator("#recite-permanent")).toBeVisible();
  await expect(page.locator(".recite-steps [data-recite-step='share']")).toHaveAttribute("data-stage-ready", "true");
  await options.locator(":scope > summary").click();
  await expect(options).not.toHaveAttribute("open", "");
  await page.locator("#recite-title").fill("Read for majlis — updated");
  await expect(options).not.toHaveAttribute("open", "");
});


test("mobile recitation text card stays inside the controls with long verses", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = "mobile-recitation-fixture";
  const set = { version: 1, title: "Long lines", occasion: "", description: "", items: [
    { uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "basta",
      id: "basta-marsiye-003", sourceTitle: "Long Marsiya" },
  ] };
  await page.addInitScript(({ key, entry }) => localStorage.setItem(key, JSON.stringify([entry])),
    { key: "kalam:recitation-drafts-v1", entry: { id, set } });
  await page.route("**/data/basta-kalams/basta-marsiye-003.json", route =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ kalam: {
      id: "basta-marsiye-003", name: "Long Marsiya", romanName: "Long Marsiya",
      sectionRoman: "Marsiye", startPage: 287, pages: [287], status: "ready", numbered: true,
      preface: "", urdu: "دنیا سے آج رحلت بنت رسول ہے", roman: "Roman",
      stanzas: [{ id: "stanza-005", number: 5, printedNumber: "۵",
        urdu: "دنیا سے آج رحلت بنت رسول ہے دنیا سے آج رحلت بنت رسول ہے دنیا سے آج رحلت بنت رسول ہے",
        roman: "Duniya se aaj rehlat Bint e Rasul hai ".repeat(5), pages: [287] }],
    } }) }));
  await page.goto("/recite/read/?draft=" + id);
  const card = page.locator(".recite-work");
  const toolbar = page.locator(".reading-controls-recitation");
  await expect(card).toBeVisible();
  await expect(card.locator(".lyric-reading-urdu .poetry-stanza-number")).toHaveText("۱");
  await expect(card.locator(".lyric-reading-roman .poetry-stanza-number")).toHaveText("1");
  const widths = await page.evaluate(() => {
    const card = document.querySelector(".recite-work").getBoundingClientRect();
    const toolbar = document.querySelector(".reading-controls-recitation").getBoundingClientRect();
    return { cardLeft: card.left, cardRight: card.right, toolbarLeft: toolbar.left,
      toolbarRight: toolbar.right, viewport: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth };
  });
  expect(widths.cardLeft).toBeGreaterThanOrEqual(widths.toolbarLeft - 2);
  expect(widths.cardRight).toBeLessThanOrEqual(widths.toolbarRight + 2);
  expect(widths.cardRight).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.overflow).toBeLessThanOrEqual(widths.viewport + 1);
});

test("print action opens a valid standalone document with its doctype", async ({ page, context }) => {
  const id = "recitation-print-fixture";
  const set = { version: 1, title: "Printable programme", occasion: "", description: "",
    items: [{ uid: "391002ab-16f4-4535-bf2a-8ca02cefc956", kind: "lyric",
      id: "printed-fixture", sourceTitle: "Print fixture" }] };
  await page.addInitScript(({ key, entry }) => localStorage.setItem(key, JSON.stringify([entry])),
    { key: "kalam:recitation-drafts-v1", entry: { id, set } });
  await page.route("**/data/recitation-lyrics/printed-fixture.json", route =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ lyric: {
      id: "printed-fixture", title: "Print fixture", urdu: "۱\nسلام",
      roman: "1\nSalaam", lang: "ur", direction: "rtl",
    } }) }));
  await context.addInitScript(() => { window.print = () => { window.__printCalled = true; }; });
  await page.goto("/recite/read/?draft=" + id);
  await page.locator(".recite-reader-exports summary").click();
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#recite-print").click();
  const popup = await popupPromise;
  await expect(page.locator("#recite-export-status")).toContainText("Save as PDF");
  const documentState = await popup.evaluate(() => ({
    doctype: document.doctype?.name,
    title: document.title,
    content: document.body?.textContent,
    printed: window.__printCalled === true,
  }));
  expect(documentState.doctype).toBe("html");
  expect(documentState.title).toContain("Printable programme");
  expect(documentState.content).toContain("Print fixture");
  expect(documentState.printed).toBe(true);
  await popup.close();
});
