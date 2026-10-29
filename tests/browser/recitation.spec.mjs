import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("offline programme export contains complete text, reciter assignments and notes @smoke", async ({ page }) => {
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

test("live navigation is opt-in and follows published entry UIDs @smoke", async ({ page }) => {
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
  await page.locator("#recite-previous").evaluate((button) => button.click());
  await expect(page.locator("#recite-follow-live")).not.toBeChecked();
  await expect(page.locator("#recite-position")).toHaveText("1 / 2");
});



test("empty set disables unavailable actions and explains publishing requirements @smoke", async ({ page }) => {
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

test("set chooser and management buttons align on desktop and form exactly two rows on mobile @smoke", async ({ page }) => {
  for (const width of [320, 390, 700, 820, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/recite/");
    await expect(page.locator("#recite-drafts option")).toHaveCount(1);
    const geometry = await page.locator(".recite-topbar").evaluate((root) => {
      const box = (element) => {
        const { x, y, width, height, bottom } = element.getBoundingClientRect();
        return { x, y, width, height, bottom };
      };
      const chooser = box(root.querySelector("#recite-drafts"));
      const actions = box(root.querySelector(".recite-topbar-actions"));
      const buttons = [...root.querySelectorAll(".recite-topbar-actions button")].map(box);
      return { chooser, actions, buttons, bounds: box(root),
        overflow: root.scrollWidth - root.clientWidth,
        viewportRight: innerWidth };
    });
    // This test covers the set-management layout, not unrelated content
    // elsewhere on the page that can affect document scrollWidth.
    expect(geometry.overflow, `set-management overflow at ${width}px`).toBeLessThanOrEqual(2);
    expect(geometry.bounds.x + geometry.bounds.width).toBeLessThanOrEqual(geometry.viewportRight + 1);
    const [first, second, third] = geometry.buttons;
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(Math.abs(second.y - third.y)).toBeLessThan(1);
    expect(Math.abs(first.height - second.height)).toBeLessThan(1);
    expect(Math.abs(second.height - third.height)).toBeLessThan(1);
    if (width <= 740) {
      expect(geometry.actions.y).toBeGreaterThanOrEqual(geometry.chooser.bottom + 5);
      expect(geometry.actions.x).toBeCloseTo(geometry.chooser.x, 0);
      expect(geometry.actions.width).toBeCloseTo(geometry.chooser.width, 0);
    } else {
      expect(geometry.actions.x).toBeGreaterThan(geometry.chooser.x + geometry.chooser.width);
      expect(Math.abs(geometry.actions.y + geometry.actions.height - geometry.chooser.bottom)).toBeLessThan(1);
    }
  }
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
  await expect(page.locator(".recite-work-header h2")).toBeVisible();
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
  await page.locator("#recite-stanzas li").last().getByRole("button", { name: /Move stanza .* up/ }).click();
  await page.locator("#recite-open-reader").click();
  await expect(page.locator(".recite-stanza-source").first()).toContainText("دوسرا مرثیہ");
  await expect(page.locator(".lyric-reading-urdu .basta-kalam-text").first()).toBeVisible();
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

test("multi-page Basta Marsiya preserves six-verse framing and both scans", async ({ page }) => {
  const id = "marsiya-two-page-draft";
  const set = {
    version: 1, title: "Two-page Marsiya", occasion: "", description: "",
    items: [{ uid: "b3ea7be2-8963-4f89-9ab1-4a0a4a22b211",
      kind: "basta", id: "basta-marsiye-117", sourceTitle: "Baba ko rote rote" }],
  };
  await page.addInitScript(({ entry }) => {
    localStorage.setItem("kalam:recitation-drafts-v1", JSON.stringify([entry]));
  }, { entry: { id, set } });
  await page.goto("/recite/read/?draft=" + id);
  await expect(page.locator(".recite-work-header h2")).toBeVisible();
  const scans = page.locator(".recite-work .lyric-reading-image img");
  await expect(scans).toHaveCount(2);
  await expect(scans.nth(0)).toHaveAttribute("src", /284\.png$/);
  await expect(scans.nth(1)).toHaveAttribute("src", /285\.png$/);
  await expect(page.locator(".recite-scan-caption")).toHaveText(["Basta page 284", "Basta page 285"]);

  // The continuation on page 285 starts with stanza 7; it must not be
  // merged into the closing couplet of stanza 6 at the page break.
  for (const language of ["urdu", "roman"]) {
    const edition = page.locator(".lyric-reading-" + language);
    // :has() is scoped to each stanza block. A full edition-root locator
    // passed to filter({has}) cannot match relative to its descendants.
    const numbered = edition.locator(".basta-kalam-text:has(.poetry-stanza-number)");
    await expect(numbered).toHaveCount(7);
    for (const i of [5, 6]) {
      await expect(numbered.nth(i).locator(".basta-verse-reverse-indent")).toHaveCount(4);
      await expect(numbered.nth(i).locator(".basta-six-closing-start")).toHaveCount(1);
      await expect(numbered.nth(i).locator(".basta-six-closing-end")).toHaveCount(1);
    }
  }
});

test("organizer can permanently preserve, renew and delete published sets @smoke", async ({ page }) => {
  const id = "123456789abcdef123456789";
  const editToken = "a".repeat(64);
  let published;
  let changes = 0;
  let deletes = 0;
  await page.route("**/api/recitation-sets/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;
    if (method === "POST" && path.endsWith("/recitation-sets/")) {
      published = request.postDataJSON();
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id, editToken, permanent: true, expiresAt: null,
      }) });
    }
    if (method === "PUT" && path.endsWith("/" + id)) {
      changes++;
      published = request.postDataJSON();
      expect(request.headers().authorization).toBe("Bearer " + editToken);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({
        id, updated: true, permanent: false, expiresAt: "2028-10-27T00:00:00.000Z",
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

test("recitation programme navigation belongs to the shared contextual toolbar", async ({ page }) => {
  await page.goto("/recite/read/");
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator(".recite-reader-toolbar")).toHaveCount(1);
  await expect(page.locator("[data-reading-root] .recite-reader-toolbar")).toHaveCount(0);
});

test("mobile contextual toolbar expands without overlaying the programme navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Responsive toolbar");
  await page.locator("#recite-source").selectOption("lyric");
  await page.locator("#recite-results li button:not([disabled])").first().click();
  await page.locator("#recite-open-reader").click();
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator(".recite-reader-toolbar")).toBeVisible();
  await controls.locator("[data-reading-regular-toggle]").click();
  const [navigation, editions] = await Promise.all([
    controls.locator(".recite-reader-toolbar").boundingBox(),
    controls.locator(".reading-view-control").boundingBox(),
  ]);
  expect(navigation && editions).toBeTruthy();
  expect(editions.y).toBeGreaterThanOrEqual(navigation.y + navigation.height - 2);
  await controls.locator("[data-reading-line-spacing]").selectOption("relaxed");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-line-spacing", "relaxed");
  const text = page.locator(".recite-editions .lyrics-text").first();
  await expect(text).toHaveCSS("line-height", /\d+(?:\.\d+)?px/);
  await controls.locator("[data-reading-focus-enter]").click();
  await expect(controls.locator(".recite-reader-toolbar")).toBeVisible();
  await controls.locator("[data-reading-focus-exit]").click();
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

test("Roman-only recitation falls back explicitly to its original scan if text is absent @smoke", async ({ page }) => {
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

test("the programme uses shared edition geometry and starts sequentially on mobile", async ({ page }) => {
  const id = "visual-layout-draft";
  await page.addInitScript(({ id }) => {
    localStorage.setItem("kalam:recitation-drafts-v1", JSON.stringify([{
      id, set: { version: 1, title: "Visual layout", occasion: "", description: "",
        items: [{ uid: "391002ab-16f4-4535-bf2a-8ca02cefc956",
          kind: "lyric", id: "aa-asghar-bin-tere", sourceTitle: "Aa Asghar" }] }
    }]));
  }, { id });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recite/read/?draft=" + id);
  const root = page.locator(".recite-reading-root");
  const grid = page.locator(".recite-editions").first();
  await expect(root).toHaveAttribute("data-reading-columns", "urdu");
  await expect(page.locator("#recite-reader-view")).toHaveValue("sequential");
  await expect(grid).toHaveAttribute("data-reading-mode", "urdu");
  await expect(grid.locator(".lyric-reading-urdu")).toBeVisible();
  await expect(grid.locator(".lyric-reading-roman")).toBeHidden();
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  await expect(grid).toHaveAttribute("data-reading-columns", "urdu roman");
  await page.setViewportSize({ width: 1100, height: 900 });
  const [roman, urdu] = await Promise.all([
    grid.locator(".lyric-reading-roman").boundingBox(),
    grid.locator(".lyric-reading-urdu").boundingBox(),
  ]);
  expect(Math.abs(roman.y - urdu.y)).toBeLessThan(25);
  expect(roman.x + roman.width).toBeLessThanOrEqual(urdu.x + 5);
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
