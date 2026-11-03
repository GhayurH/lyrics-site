import { withoutJavaScript } from "./no-js.mjs";
import { test, expect } from "@playwright/test";

test("all reader types expose text before JavaScript initializes @smoke", async ({ browser }) => {
  await withoutJavaScript(browser, async (page) => {
    await page.goto("/lyrics/aa-asghar-bin-tere/");
    await expect(page.locator(".lyric-reading-urdu .lyric-verse").first()).toBeVisible();
    await page.goto("/basta/138/");
    await expect(page.locator(".basta-page-urdu .basta-verse-line").first()).toBeVisible();
    await expect(page.locator("[data-reading-controls] .basta-pager")).toBeVisible();
    await expect(page.locator("[data-reading-controls] .reading-focus-enter")).toBeHidden();
    await page.goto("/basta/read/");
    await expect(page.locator('.basta-reader-page[data-basta-page="3"]')).toBeVisible();
  });
});

test("printed Basta genre titles, names and near-repeated headings use shared typography", async ({ page }) => {
  await page.goto("/basta/140/");
  for (const [edition, rubai, qita, poet, finalTitle] of [
    ["urdu", "رباعی", "[قطعہ]", "علامہ طالب جوہری مدظلہ", "حسینؑ جب کہ چلے بعد دوپہر رن کو"],
    ["roman", "Rubai", "[Qit'a]", "Allama Talib Jauhari Muddazillahu", "Husain jab ke chale baad dopehar ran ko"],
  ]) {
    const poems = page.locator(`.basta-page-${edition} .basta-kalam-text`);
    await expect(poems.nth(1).locator(".kalam-reading-title")).toHaveText(rubai);
    await expect(poems.nth(1).locator(".kalam-poet-credit")).toHaveCount(1);
    await expect(poems.nth(2).locator(".kalam-reading-title")).toHaveText(qita);
    await expect(poems.nth(3).locator(".kalam-poet-credit")).toHaveText(poet);
    await expect(poems.nth(3).locator(".kalam-reading-title")).toHaveCount(0);
    await expect(poems.nth(5).locator(".kalam-reading-title")).toHaveText(finalTitle);
  }
});

test("edition preferences, Focus mode, and image enlargement work together", async ({ page }) => {
  await page.goto("/basta/138/");
  const image = page.locator(".basta-original-page");
  await expect(image).toBeVisible();
  await page.getByLabel("Image", { exact: true }).uncheck();
  await expect(image).toBeHidden();
  await page.getByLabel("Image", { exact: true }).check();
  await expect(image).toBeVisible();
  await image.locator("a").click();
  await expect(page.locator("dialog.scan-viewer")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
});

test("mobile single-edition Focus starts with stanza one via link and button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const lyricUrl = "/lyrics/na-bhool-kar-bhi/";

  const expectFirstStanza = async (edition) => {
    const root = page.locator("[data-reading-root]");
    await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
    await expect(root).toHaveAttribute("data-reading-mode", edition);
    await expect(root).toHaveCSS("justify-content", "flex-start");
    await expect.poll(() => root.evaluate((element, selected) => {
      const stanza = element.querySelector(`.lyric-reading-${selected} .lyric-stanza`);
      if (!stanza) return false;
      const viewport = element.getBoundingClientRect();
      const first = stanza.getBoundingClientRect();
      return first.top >= viewport.top && first.top < viewport.bottom;
    }, edition)).toBe(true);
  };

  for (const edition of ["urdu", "roman"]) {
    await page.goto(lyricUrl);
    await page.locator("[data-reading-regular-toggle]").click();
    await page.locator(`[data-reading-column][value="${edition}"]`).check();
    const other = edition === "urdu" ? "roman" : "urdu";
    await page.locator(`[data-reading-column][value="${other}"]`).uncheck();

    // A shared immersive URL must open at the first stanza even with the
    // selected edition saved from an earlier visit.
    await page.goto(lyricUrl + "?reading=1");
    await expectFirstStanza(edition);

    // Entering via the regular reader must follow the same layout rules.
    await page.goto(lyricUrl);
    await page.locator("[data-reading-focus-enter]").click();
    await expectFirstStanza(edition);
  }
});

test("continuous deep link, Contents and Focus exit survive rotation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/read/#page-138", { waitUntil: "domcontentloaded" });
  const target = page.locator('[data-basta-page="138"]');
  await expect(target).toBeAttached({ timeout: 20000 });

  await page.locator("[data-reading-focus-enter]").click();
  await page.locator("[data-reading-focus-options]").click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.locator(".basta-reader-index")).toBeVisible();
  await expect(page.locator("[data-reading-controls]")).toHaveAttribute("data-reading-options-open", "false");
  await page.keyboard.press("Escape");
  await expect(page.locator(".basta-reader-index")).toBeHidden();

  await page.setViewportSize({ width: 844, height: 390 });
  await target.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.locator("[data-reading-root]").evaluate((node) => { node.scrollTop += 125; });
  const visiblePage = await page.locator("[data-reading-root]").evaluate((root) => {
    const viewport = root.getBoundingClientRect();
    return [...root.querySelectorAll("[data-basta-page]")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { page: Number(node.dataset.bastaPage), visible: Math.max(0,
        Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top)) };
    }).sort((a, b) => b.visible - a.visible)[0]?.page;
  });
  expect(visiblePage).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe(`#page-${visiblePage}`);
  await expect.poll(() => page.locator(`#page-${visiblePage}`).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight;
  })).toBe(true);
});

test("missing Roman transcription retains its source scan", async ({ page }) => {
  await page.goto("/basta/read/#page-30", { waitUntil: "domcontentloaded" });
  const page30 = page.locator('[data-basta-page="30"]');
  await expect(page30).toBeAttached({ timeout: 20000 });
  const toggle = page.locator("[data-reading-regular-toggle]");
  if (await toggle.isVisible()) await toggle.click();
  await page.locator('[data-reading-column][value="urdu"]').uncheck();
  await expect(page30.locator(".basta-reader-original-image")).toBeVisible();
  await expect(page30.locator(".basta-edition-unavailable")).toContainText("not available");
});

test("only line spacing is configurable, and its value survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.locator("[data-reading-font-size], [data-reading-wrap-verses], [data-reading-regular-options]")).toHaveCount(0);
  await page.locator("[data-reading-regular-toggle]").click();
  const spacing = page.locator("[data-reading-line-spacing]");
  await spacing.selectOption("relaxed");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-line-spacing", "relaxed");
  await page.reload();
  await expect(spacing).toHaveValue("relaxed");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-line-spacing", "relaxed");
});

test("parallel Urdu/Roman use unequal natural-width columns and a shared page scrollbar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/138/");
  await page.locator('[data-reading-column][value="image"]').uncheck();
  await page.locator('[data-reading-column][value="roman"]').check();
  const roman = page.locator(".basta-page-roman");
  const urdu = page.locator(".basta-page-urdu");
  const divider = page.getByRole("separator", { name: "Resize Roman and Urdu columns" });
  await expect(divider).toBeVisible();
  await expect(divider).toHaveAttribute("aria-valuenow", "44");
  for (const panel of [roman, urdu]) {
    await expect(panel).not.toHaveAttribute("data-synced-scrollable", "true");
    expect(await panel.evaluate((node) => ({
      overflow: getComputedStyle(node).overflowY,
      height: node.style.height,
    }))).toEqual({ overflow: "visible", height: "" });
  }
  const proportions = await page.evaluate(() => {
    const roman = document.querySelector(".basta-page-roman").getBoundingClientRect();
    const urdu = document.querySelector(".basta-page-urdu").getBoundingClientRect();
    return roman.width / (roman.width + urdu.width);
  });
  expect(proportions).toBeGreaterThan(0.36);
  expect(proportions).toBeLessThan(0.50);

  await divider.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(divider).toHaveAttribute("aria-valuenow", "49");
  await page.reload();
  await expect(page.getByRole("separator", { name: "Resize Roman and Urdu columns" })).toHaveAttribute("aria-valuenow", "49");
});

test("dragging lyric divider refits one-line verses and supports keyboard and responsive stacking", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lyrics/aik-tehreer-uthaye-boli-darbar-mein-aa-kar-zahra/");
  const root = page.locator(".lyric-reading-grid");
  const divider = page.getByRole("separator", { name: "Resize Roman and Urdu columns" });
  await expect(divider).toBeVisible();
  const original = await root.evaluate(el => {
    const roman = el.querySelector(".lyric-reading-roman").getBoundingClientRect();
    return roman.width;
  });
  const rect = await divider.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + 32);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 - 170, rect.y + 32, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => divider.getAttribute("aria-valuenow")).not.toBe("44");
  const resized = await root.evaluate(el => el.querySelector(".lyric-reading-roman").getBoundingClientRect().width);
  expect(resized).toBeLessThan(original - 50);
  await expect.poll(async () => root.evaluate(el =>
    [...el.querySelectorAll(".lyric-reading-roman .lyric-verse")]
      .every(v => v.scrollWidth <= v.clientWidth + 2 && getComputedStyle(v).whiteSpace === "nowrap")
  )).toBe(true);
  await divider.dblclick();
  await expect(divider).toHaveAttribute("aria-valuenow", "44");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(divider).toBeHidden();
  await expect(root).toHaveCSS("flex-direction", "column");
});

test("widening the Roman reader grows stanza type instead of justifying its longest verse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lyrics/ab-aey-hawaon-kuch-khak-urao/");
  const divider = page.getByRole("separator", { name: "Resize Roman and Urdu columns" });
  const stanza = page.locator(".lyric-reading-roman .lyric-stanza").first();
  await expect(divider).toBeVisible();
  await expect(divider).toHaveAttribute("aria-valuemax", "85");
  await expect.poll(() => stanza.locator(".poetry-fitted-anchor").count()).toBe(1);
  const initialSize = await stanza.locator(".lyric-verse").first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize));
  await divider.focus();
  await page.keyboard.press("End");
  await expect(divider).toHaveAttribute("aria-valuenow", "85");
  await expect.poll(async () => stanza.locator(".lyric-verse").first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize)))
    .toBeGreaterThan(initialSize + 2);
  const wideSize = await stanza.locator(".lyric-verse").first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize));
  const widest = await stanza.evaluate(node => {
    const verses = [...node.querySelectorAll(".lyric-verse")];
    const anchors = verses.filter(verse => verse.classList.contains("poetry-fitted-anchor"));
    return {
      anchors: anchors.length,
      coverage: anchors.map(verse => {
        const range = document.createRange();
        range.selectNodeContents(verse);
        return range.getBoundingClientRect().width / verse.clientWidth;
      }),
      natural: anchors.every(verse => getComputedStyle(verse).textAlignLast === "start"),
      justified: verses.filter(verse => !verse.classList.contains("poetry-fitted-anchor"))
        .every(verse => getComputedStyle(verse).textAlignLast === "justify"),
      fitted: verses.every(verse => verse.scrollWidth <= verse.clientWidth + 3 &&
        getComputedStyle(verse).whiteSpace === "nowrap"),
    };
  });
  expect(widest.anchors).toBeLessThanOrEqual(1);
  expect(widest.natural && widest.justified && widest.fitted).toBe(true);
  for (const coverage of widest.coverage) expect(coverage).toBeGreaterThanOrEqual(.945);
  // Dragging is covered above. Verify the keyboard's end-stop can also
  // reduce a grown stanza without leaving the cap applied.
  await divider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expect(divider).toHaveAttribute("aria-valuenow", "60");
  await expect.poll(async () => stanza.locator(".lyric-verse").first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize)))
    .toBeLessThan(wideSize - 2);
});

test("Basta fits each numbered stanza independently instead of using the longest verse in the poem", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/kalam/basta-marsiye-117/");
  await page.locator('[data-reading-column][value="roman"]').check();
  const panel = page.locator(".basta-page-roman");
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.locator(".basta-verse-poetry").count()).toBeGreaterThan(35);
  const groups = await panel.locator(".basta-kalam-text").evaluate(node => {
    const stanzas = [];
    for (const element of node.children) {
      if (element.classList.contains("poetry-stanza-number")) stanzas.push([]);
      else if (stanzas.length && element.classList.contains("basta-verse-poetry") &&
               !element.classList.contains("basta-refrain")) stanzas.at(-1).push(element);
    }
    return stanzas.map(verses => ({
      anchors: verses.filter(verse => verse.classList.contains("poetry-fitted-anchor")).length,
      justified: verses.every(verse => verse.classList.contains("poetry-fitted-anchor") ||
        getComputedStyle(verse).textAlignLast === "justify"),
      coverage: verses.filter(verse => verse.classList.contains("poetry-fitted-anchor"))
        .map(verse => {
          const range = document.createRange();
          range.selectNodeContents(verse);
          return range.getBoundingClientRect().width / verse.clientWidth;
        }),
      sizes: verses.map(verse => Number.parseFloat(getComputedStyle(verse).fontSize)),
      fits: verses.every(verse => verse.scrollWidth <= verse.clientWidth + 3),
    }));
  });
  expect(groups).toHaveLength(7);
  for (const [index, group] of groups.entries()) {
    expect(group.anchors, "stanza " + (index + 1)).toBeLessThanOrEqual(1);
    expect(group.justified, "stanza " + (index + 1)).toBe(true);
    for (const coverage of group.coverage) expect(coverage).toBeGreaterThanOrEqual(.945);
    expect(group.fits, "stanza " + (index + 1)).toBe(true);
    expect(Math.max(...group.sizes) - Math.min(...group.sizes)).toBeLessThan(.1);
  }
});

test("stacked and single-column editions use only document scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/138/");
  const roman = page.locator(".basta-page-roman");
  const urdu = page.locator(".basta-page-urdu");
  await expect(roman).not.toHaveAttribute("data-synced-active", "true");
  await expect(urdu).not.toHaveAttribute("data-synced-scrollable", "true");
  expect(await urdu.evaluate((node) => node.style.height)).toBe("");
  await page.getByRole("button", { name: "Show reading options" }).click();
  await page.getByLabel("Roman", { exact: true }).check();
  await expect(roman).toBeVisible();
  await page.getByLabel("Roman", { exact: true }).uncheck();
  await expect(roman).toBeHidden();
  await expect(urdu).not.toHaveAttribute("data-synced-scrollable", "true");
  expect(await urdu.evaluate((node) => node.style.height)).toBe("");
});

test("resume uses within-page fractions in page-by-page and continuous routes", async ({ page }) => {
  await page.goto("/basta/138/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kalam:basta-position") || "{}").offset)).toBeGreaterThan(0.1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kalam:basta-position") || "{}"));
  // The Basta landing owns the within-page resume link; the homepage has
  // a separate Continue-reading collection.
  await page.goto("/basta/");
  const link = page.locator("[data-resume-basta]");
  await expect(link).toHaveAttribute("href", new RegExp(`/basta/138/\\?resume=`));
  await link.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(saved.offset).toBeLessThanOrEqual(1);
});

test("scan enlargement measures zoom relative to native image pixels", async ({ page }) => {
  const onePixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZcAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route("**/images/basta/original/138.png", async (route) => {
    await route.fulfill({ body: onePixel, contentType: "image/png" });
  });
  await page.goto("/basta/138/");
  await page.locator('[data-reading-column][value="image"]').check();
  await page.locator(".basta-original-page a").click();
  const viewer = page.locator("dialog.scan-viewer");
  await expect(viewer).toBeVisible();
  const enlarged = viewer.locator("img");
  await expect.poll(() => enlarged.evaluate((img) => img.naturalWidth)).toBe(1);
  await viewer.getByRole("button", { name: "100%" }).click();
  await expect(enlarged).toHaveJSProperty("width", 1);
  await expect(enlarged).toHaveAttribute("style", /width: 1px/);
  await viewer.getByRole("button", { name: "200%" }).click();
  await expect(enlarged).toHaveAttribute("style", /width: 2px/);
  await viewer.getByRole("button", { name: "Fit" }).click();
  await expect(viewer.locator('[data-scan-zoom="fit"]')).toHaveAttribute("aria-pressed", "true");
  await expect(viewer.locator(".scan-viewer-canvas")).toHaveAttribute("data-zoom", "fit");
  // The mocked image is literally one pixel, so "Fit" may also be 1px wide.
});

test("image viewer centres narrow scans and pans horizontally and vertically when zoomed", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  // Mock the external R2 scan so geometry is deterministic in preview builds.
  await page.route("**/images/basta/original/138.png", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200"><rect width="600" height="1200" fill="white"/></svg>' }));
  await page.goto("/basta/138/");
  await page.locator('[data-reading-column][value="image"]').check();
  await page.locator(".basta-original-page a").click();
  const viewer = page.locator(".scan-viewer");
  const canvas = viewer.locator(".scan-viewer-canvas");
  const image = canvas.locator("img");
  await expect(viewer).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 600);
  await viewer.getByRole("button", { name: "100%" }).click();
  await expect.poll(() => canvas.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const offset = await canvas.evaluate((el) => {
    const box = el.getBoundingClientRect(), scan = el.querySelector("img").getBoundingClientRect();
    return Math.abs((scan.left + scan.right) / 2 - (box.left + box.right) / 2);
  });
  expect(offset).toBeLessThan(2);
  await viewer.getByRole("button", { name: "200%" }).click();
  await expect.poll(() => canvas.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(100);
  await canvas.evaluate((el) => { el.scrollLeft = 0; el.scrollTop = 0; });
  const bounds = await canvas.boundingBox();
  const x = bounds.x + bounds.width * .65, y = bounds.y + bounds.height * .65;
  const before = await canvas.evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y - 90, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => canvas.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before.x + 50);
  await expect.poll(() => canvas.evaluate((el) => el.scrollTop)).toBeGreaterThan(before.y + 50);
  await viewer.getByRole("button", { name: "Close" }).click();
});

test("Basta kalam and stanza bookmarks survive navigation without shifting poetry", async ({ page }) => {
  await page.goto("/basta/200/");
  const kalam = page.locator(".basta-page-urdu .basta-kalam-text").first();
  const button = kalam.locator("[data-basta-save-selection]").first();
  await expect(button).toBeAttached();
  const verse = kalam.locator(".basta-verse-line").first();
  const before = await verse.boundingBox();
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  const after = await verse.boundingBox();
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  const stanza = page.locator(".basta-page-urdu .basta-stanza-bookmark").first();
  if (await stanza.count()) {
    await stanza.click();
    await expect(stanza).toHaveAttribute("aria-pressed", "true");
  }
  await page.goto("/saved/");
  await expect(page.locator("#basta-selections-list a").first()).toContainText("Basta");
  await page.locator("#basta-selections-list a").first().click();
  await expect(page.locator("[data-reading-root]")).toBeVisible();
});

test("Roman and Urdu Basta stanza bookmarks share a key and restore the visible edition", async ({ page }) => {
  await page.goto("/basta/200/");
  const urdu = page.locator(".basta-page-urdu .basta-stanza-bookmark").first();
  const roman = page.locator(".basta-page-roman .basta-stanza-bookmark").first();
  await expect(urdu).toBeAttached();
  await expect(roman).toBeAttached();
  const key = await roman.getAttribute("data-basta-save-selection");
  expect(key).toMatch(/^200:stanza:\d+$/);
  await expect(urdu).toHaveAttribute("data-basta-save-selection", key);

  // Save in Roman-only mode and verify the equivalent Urdu button updates.
  await page.locator('[data-reading-column][value="roman"]').check();
  await page.locator('[data-reading-column][value="urdu"]').uncheck();
  await expect(roman).toBeVisible();
  await roman.click();
  await expect(roman).toHaveAttribute("aria-pressed", "true");
  await expect(urdu).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved/");
  const saved = page.locator('#basta-selections-list a[href*="basta-stanza"]').first();
  await expect(saved).toBeVisible();
  await saved.click();
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", /roman/);
  await expect(page.locator(".basta-page-roman .basta-stanza-bookmark").first()).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => page.locator(".basta-page-roman .basta-stanza-bookmark").first().evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < innerHeight;
  })).toBe(true);
  await page.locator(".basta-page-roman .basta-stanza-bookmark").first().click();
  await expect(page.locator(".basta-page-urdu .basta-stanza-bookmark").first()).toHaveAttribute("aria-pressed", "false");

  // Streamed pages have the same controls and storage identities.
  await page.goto("/basta/read/#page-200", { waitUntil: "domcontentloaded" });
  const printed = page.locator('[data-basta-page="200"]');
  await expect(printed).toBeAttached({ timeout: 20000 });
  const streamRoman = printed.locator(".basta-reader-roman .basta-stanza-bookmark").first();
  const streamUrdu = printed.locator(".basta-reader-urdu .basta-stanza-bookmark").first();
  await expect(streamRoman).toBeAttached();
  await expect(streamUrdu).toBeAttached();
  await expect(streamRoman).toHaveAttribute("data-basta-save-selection",
    await streamUrdu.getAttribute("data-basta-save-selection"));
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  await page.locator('[data-reading-column][value="urdu"]').uncheck();
  await streamRoman.click();
  await expect(streamUrdu).toHaveAttribute("aria-pressed", "true");
});

test("Basta page progress tracks the Focus scroller instead of document scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("[data-reading-focus-enter]").click();
  const reading = page.locator("[data-reading-root]");
  await expect.poll(() => reading.evaluate((root) =>
    root.scrollHeight - root.clientHeight)).toBeGreaterThan(200);
  await reading.evaluate((root) => {
    root.scrollTop = (root.scrollHeight - root.clientHeight) * 0.6;
  });
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kalam:basta-position") || "{}");
    return saved.mode === "page" && saved.page === 200 ? saved.offset : 0;
  })).toBeGreaterThan(0.4);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2000);
});

test("Basta numbered stanza gaps are identical across Roman, Urdu, and stitched kalam pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const url of ["/basta/284/", "/basta/kalam/basta-marsiye-117/"]) {
    await page.goto(url);
    await page.locator('[data-reading-column][value="roman"]').check();
    await page.locator('[data-reading-column][value="urdu"]').check();
    const gaps = [];
    for (const edition of ["roman", "urdu"]) {
      const panel = page.locator(`.basta-page-${edition}`);
      await expect(panel).toBeVisible();
      const stats = await panel.evaluate((element) => {
        const counters = [...element.querySelectorAll(".basta-kalam-text > .poetry-stanza-number")];
        return counters.map((counter) => {
          const before = counter.previousElementSibling;
          const after = counter.nextElementSibling;
          const style = getComputedStyle(counter);
          const rect = counter.getBoundingClientRect();
          return {
            label: counter.textContent.trim(),
            marginTop: parseFloat(style.marginTop),
            marginBottom: parseFloat(style.marginBottom),
            height: rect.height,
            gapBefore: before ? rect.top - before.getBoundingClientRect().bottom : null,
            gapAfter: after ? after.getBoundingClientRect().top - rect.bottom : null,
            beforeBlank: before?.textContent.trim() === "",
            afterBlank: after?.textContent.trim() === "",
          };
        });
      });
      expect(stats.length).toBeGreaterThan(5);
      const sixth = stats[5];
      expect(sixth.marginTop).toBeGreaterThan(15);
      expect(sixth.marginBottom).toBeGreaterThan(8);
      expect(sixth.beforeBlank).toBe(false);
      expect(sixth.afterBlank).toBe(false);
      if (url.includes("/kalam/")) {
        expect(stats).toHaveLength(7);
        expect(stats[6].gapBefore).toBeGreaterThan(15);
      }
      gaps.push(stats);
    }
    for (const index of [1, 5, ...(url.includes("/kalam/") ? [6] : [])]) {
      const roman = gaps[0][index], urdu = gaps[1][index];
      for (const metric of ["marginTop", "marginBottom", "height", "gapBefore", "gapAfter"])
        expect(Math.abs(roman[metric] - urdu[metric]), url + " stanza " + (index + 1) + " " + metric).toBeLessThan(2);
    }
  }
});

test("Marsiye 117 preserves closing rules in Urdu and Roman stanzas across pages 284–285", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/kalam/basta-marsiye-117/");
  for (const edition of ["roman", "urdu"]) {
    const panel = page.locator(`.basta-page-${edition}`);
    await expect(panel.locator(".poetry-stanza-number")).toHaveCount(7);
    const stanzas = await panel.evaluate(element => {
      const groups = [];
      for (const line of element.querySelectorAll(".poetry-stanza-number, .basta-verse-line")) {
        if (line.classList.contains("poetry-stanza-number")) groups.push([]);
        else if (groups.length && line.classList.contains("basta-verse-poetry") &&
                 !line.classList.contains("basta-refrain")) {
          groups.at(-1).push({
            reverse: line.classList.contains("basta-verse-reverse-indent"),
            indent: line.classList.contains("basta-verse-indent"),
            upper: line.classList.contains("basta-six-closing-start"),
            lower: line.classList.contains("basta-six-closing-end"),
          });
        }
      }
      return groups;
    });
    for (const number of [6, 7]) {
      const verses = stanzas[number - 1];
      expect(verses, edition + " stanza " + number).toHaveLength(6);
      expect(verses.map(x => x.reverse)).toEqual([true, true, true, true, false, false]);
      expect(verses.map(x => x.indent)).toEqual([false, false, false, false, true, true]);
      expect(verses.map(x => x.upper)).toEqual([false, false, false, false, true, false]);
      expect(verses.map(x => x.lower)).toEqual([false, false, false, false, false, true]);
    }
  }
});

test("Basta page Focus resume restores its own scroll offset from the URL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/?reading=1&resume=0.65");
  const root = page.locator("[data-reading-root]");
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await expect.poll(() => root.evaluate((node) => {
    const range = node.scrollHeight - node.clientHeight;
    return range > 0 ? node.scrollTop / range : 0;
  })).toBeGreaterThan(0.5);
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("kalam:basta-position") || "{}");
    return saved.mode === "page" && saved.page === 200 ? saved.offset : 0;
  })).toBeGreaterThan(0.5);
  await expect.poll(() => page.evaluate(() => new URL(location.href)
    .searchParams.has("resume"))).toBe(false);
});

test("Escape dismisses Focus Options before exiting the reader", async ({ page }) => {
  await page.goto("/lyrics/na-bhool-kar-bhi/");
  await page.locator("[data-reading-focus-enter]").click();
  const html = page.locator("html");
  const controls = page.locator("[data-reading-controls]");
  const options = page.locator("[data-reading-focus-options]");
  await options.click();
  await expect(controls).toHaveAttribute("data-reading-options-open", "true");
  await page.keyboard.press("Escape");
  await expect(controls).toHaveAttribute("data-reading-options-open", "false");
  await expect(options).toBeFocused();
  await expect(html).toHaveAttribute("data-reading-focus", "true");
  await page.keyboard.press("Escape");
  await expect(html).not.toHaveAttribute("data-reading-focus", "true");
});
