import { test, expect } from "@playwright/test";

test("all reader types expose text before JavaScript initializes @smoke", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.locator(".lyric-reading-urdu .lyric-verse").first()).toBeVisible();
  await page.goto("/basta/138/");
  await expect(page.locator(".basta-page-urdu .basta-verse-line").first()).toBeVisible();
  await expect(page.locator("[data-reading-controls] .basta-pager")).toBeVisible();
  await expect(page.locator("[data-reading-controls] .reading-focus-enter")).toBeHidden();
  await page.goto("/basta/read/");
  await expect(page.locator('.basta-reader-page[data-basta-page="3"]')).toBeVisible();
  await context.close();
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

test("mobile single-edition Focus starts with stanza one via link and button @smoke", async ({ page }) => {
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

test("continuous reader deep links load streamed content and preserve the current page @smoke", async ({ page }) => {
  await page.goto("/basta/read/#page-138");
  const page138 = page.locator('[data-basta-page="138"]');
  await expect(page138).toBeAttached({ timeout: 20000 });
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.locator(".basta-reader-index")).toBeVisible();
  // Only one overlay may be expanded: Contents must not hide behind Options.
  await expect(page.locator("[data-reading-controls]")).toHaveAttribute("data-reading-options-open", "false");
  await expect(page.locator(".basta-reader-index a[href]").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".basta-reader-index")).toBeHidden();
  await expect(page.locator("[data-reading-focus-options]")).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
});

test("unavailable Roman transcription shows a source scan rather than blank content", async ({ page }) => {
  await page.goto("/basta/read/#page-30");
  await expect(page.locator('[data-basta-page="30"]')).toBeAttached({ timeout: 20000 });
  const options = page.locator("[data-reading-regular-toggle]");
  if (await options.isVisible()) await options.click();
  await page.getByLabel("Urdu", { exact: true }).uncheck();
  const source = page.locator('[data-basta-page="30"] .basta-reader-original-image');
  const notice = page.locator('[data-basta-page="30"] .basta-edition-unavailable');
  await expect(source).toBeVisible();
  await expect(notice).toContainText("not available");
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

test("rotation and Focus exit retain an actual continuous page rather than the book top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/read/#page-138");
  const target = page.locator('[data-basta-page="138"]');
  await expect(target).toBeAttached({ timeout: 20000 });
  await target.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate(() => window.scrollBy(0, 125));
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').uncheck();
  const editions = await page.locator("[data-reading-root]").getAttribute("data-reading-columns");
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", editions);
  // Exit at a known position within page 138, not where the preceding page crosses the reading line.
  await target.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.locator("[data-reading-root]").evaluate((node) => { node.scrollTop += 125; });
  const visiblePage = await page.locator("[data-reading-root]").evaluate((root) => {
    const viewport = root.getBoundingClientRect();
    const pages = [...root.querySelectorAll("[data-basta-page]")];
    return pages.map((node) => {
      const rect = node.getBoundingClientRect();
      return { page: Number(node.dataset.bastaPage), visible: Math.max(0,
        Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top)) };
    }).sort((a, b) => b.visible - a.visible)[0]?.page;
  });
  expect(visiblePage).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
  await expect.poll(() => new URL(page.url()).hash).toBe(`#page-${visiblePage}`);
  await expect.poll(async () => page.locator(`#page-${visiblePage}`).evaluate((node) => {
    const r = node.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  })).toBe(true);
});

test("parallel Basta keeps the shorter Roman edition fully visible and scrolls only Urdu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/138/");
  await page.locator('[data-reading-column][value="image"]').uncheck();
  await page.locator('[data-reading-column][value="roman"]').check();
  const roman = page.locator(".basta-page-roman");
  const urdu = page.locator(".basta-page-urdu");
  await expect(roman).toHaveAttribute("data-synced-active", "true");
  await expect(urdu).toHaveAttribute("data-synced-scrollable", "true");
  await expect(roman).not.toHaveAttribute("data-synced-scrollable", "true");
  expect(await roman.locator(".basta-kalam-text").count()).toBeGreaterThan(1);
  expect(await urdu.locator(".basta-kalam-text").count()).toBeGreaterThan(1);
  const sizes = await page.evaluate(() => {
    const roman = document.querySelector(".basta-page-roman");
    const urdu = document.querySelector(".basta-page-urdu");
    return {
      romanOverflow: roman.scrollHeight - roman.clientHeight,
      urduOverflow: urdu.scrollHeight - urdu.clientHeight,
      romanHeight: roman.getBoundingClientRect().height,
      urduHeight: urdu.getBoundingClientRect().height,
    };
  });
  expect(sizes.romanOverflow).toBeLessThan(3);
  expect(sizes.urduOverflow).toBeGreaterThan(10);
  expect(Math.abs(sizes.romanHeight - sizes.urduHeight)).toBeLessThan(3);
  await urdu.evaluate((node) => { node.scrollTop = (node.scrollHeight - node.clientHeight) * 0.65; });
  await expect.poll(() => urdu.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await roman.evaluate((node) => node.scrollTop)).toBe(0);
  // Standalone lyrics use the same short-column policy.
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const lyricUrdu = page.locator(".lyric-reading-urdu");
  const lyricRoman = page.locator(".lyric-reading-roman");
  await expect(lyricUrdu).toHaveAttribute("data-synced-scrollable", "true");
  await expect(lyricRoman).not.toHaveAttribute("data-synced-scrollable", "true");
  expect(await lyricRoman.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThan(3);

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
