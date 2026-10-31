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

test("two text editions are stacked in portrait and parallel in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/138/");
  const urdu = page.locator(".basta-page-urdu");
  const roman = page.locator(".basta-page-roman");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  await expect(urdu).toBeVisible();
  await expect(roman).toBeVisible();
  let u = await urdu.boundingBox(), r = await roman.boundingBox();
  expect(Math.abs(u.y - r.y)).toBeGreaterThan(25);
  await page.setViewportSize({ width: 840, height: 390 });
  await expect.poll(async () => {
    const left = await urdu.boundingBox(), right = await roman.boundingBox();
    return Math.abs(left.y - right.y);
  }).toBeLessThan(25);
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

test("continuous reader deep links load streamed content and preserve the current page @smoke", async ({ page }) => {
  await page.goto("/basta/read/#page-138");
  const page138 = page.locator('[data-basta-page="138"]');
  await expect(page138).toBeAttached({ timeout: 20000 });
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.locator(".basta-reader-index")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".basta-reader-index")).toBeHidden();
});

test("unavailable Roman transcription shows a source scan rather than blank content @smoke", async ({ page }) => {
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

test("every visible poetry verse stays on one line and within its column at mobile widths @smoke", async ({ page }) => {
  for (const url of ["/lyrics/aa-asghar-bin-tere/", "/basta/138/", "/basta/read/#page-138"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (url.includes("/read/")) {
      await expect(page.locator('[data-basta-page="138"]')).toBeAttached({ timeout: 20000 });
      await page.locator('[data-basta-page="138"]').scrollIntoViewIfNeeded();
    }
    await page.evaluate(() => document.fonts.ready);
    const selector = url.includes("/lyrics/") ? ".lyric-verse" :
      url.includes("/read/") ? '[data-basta-page="138"] .basta-verse-poetry' : ".basta-verse-poetry";
    await expect.poll(async () => page.locator(selector).evaluateAll((lines) =>
      lines.filter((line) => {
        const style = getComputedStyle(line);
        const width = line.clientWidth;
        return width > 0 && (style.whiteSpace !== "nowrap" || line.scrollWidth > width + 2);
      }).length), { timeout: 15000 }).toBe(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  }
});
test("all three couplet dividers share equal verse-six clearance in both scripts @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/lyrics/karbala-karbala-karbala/");
  for (const spacing of ["compact", "default", "relaxed"]) {
    await page.locator("[data-reading-line-spacing]").selectOption(spacing);
    const results = await page.locator(".lyric-reading-panel").evaluateAll((panels) =>
      panels.map((panel) => {
        const stanza = panel.querySelector(".lyric-stanza-pairs");
        const verses = Array.from(stanza.querySelectorAll(".lyric-verse"));
        const next = stanza.nextElementSibling;
        return {
          verseCount: verses.length,
          rules: [verses[1], verses[3], verses[5]].map((line) => {
            const style = getComputedStyle(line);
            return {
              border: Number.parseFloat(style.borderBottomWidth),
              paddingInLines: Number.parseFloat(style.paddingBottom) /
                Number.parseFloat(style.lineHeight),
            };
          }),
          nextBorder: Number.parseFloat(getComputedStyle(next).borderTopWidth),
          nextFollowsRule: next.getBoundingClientRect().top >=
            verses[5].getBoundingClientRect().bottom,
          nowrap: verses.every((line) => getComputedStyle(line).whiteSpace === "nowrap"),
        };
      }));
    expect(results).toHaveLength(2);
    for (const panel of results) {
      expect(panel.verseCount).toBe(6);
      expect(panel.nowrap).toBe(true);
      expect(panel.nextBorder).toBe(0);
      expect(panel.nextFollowsRule).toBe(true);
      for (const rule of panel.rules) {
        expect(rule.border).toBeGreaterThan(0);
        expect(rule.paddingInLines).toBeGreaterThan(0.24);
      }
      expect(Math.max(...panel.rules.map((r) => r.paddingInLines)) -
        Math.min(...panel.rules.map((r) => r.paddingInLines))).toBeLessThan(0.01);
    }
  }
});

test("compact index presents accessible entries at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/index/");
  await expect(page.locator(".basta-parallel-index-urdu .basta-index-mobile-list").first()).toBeVisible();
  await expect(page.locator(".basta-parallel-index-urdu .basta-index-table-wrap").first()).toBeHidden();
});

test("all text-edition combinations remain readable across themes and responsive widths", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1300, height: 880 });
  await page.goto("/basta/138/");
  const choices = ["urdu", "roman", "image"];
  for (const enabled of [["urdu"], ["roman"], ["image"], ["urdu", "roman"], ["urdu", "image"], ["roman", "image"], choices]) {
    for (const name of choices) {
      const input = page.locator(`[data-reading-column][value="${name}"]`);
      if (enabled.includes(name) && !(await input.isChecked())) await input.check();
    }
    for (const name of choices) {
      const input = page.locator(`[data-reading-column][value="${name}"]`);
      if (!enabled.includes(name) && await input.isChecked()) await input.uncheck();
    }
    await expect(page.locator("[data-reading-root]")).toHaveAttribute(
      "data-reading-columns", enabled.slice().sort().join(" ") === "image roman urdu" ? /(?:image|urdu|roman)/ : new RegExp(enabled.join("|")),
    );
    for (const name of choices) {
      const selector = name === "image" ? ".basta-original-page" : `.basta-page-${name}`;
      if (enabled.includes(name)) await expect(page.locator(selector)).toBeVisible();
      else await expect(page.locator(selector)).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 4)).toBe(true);
  }
  const toggle = page.locator("#theme-toggle");
  await toggle.click();
  await page.locator('#theme-dialog input[value="light"]').check();
  await page.locator("#theme-dialog-done").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".basta-page-urdu")).toBeVisible();
  await toggle.click();
  await page.locator('#theme-dialog input[value="dark"]').check();
  await page.locator("#theme-dialog-done").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("rotation and Focus exit retain an actual continuous page rather than the book top @smoke", async ({ page }) => {
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
});

test("non-Basta lyrics also keep the shorter parallel edition fully visible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const urdu = page.locator(".lyric-reading-urdu");
  const roman = page.locator(".lyric-reading-roman");
  await expect(urdu).toHaveAttribute("data-synced-scrollable", "true");
  await expect(roman).not.toHaveAttribute("data-synced-scrollable", "true");
  expect(await roman.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeLessThan(3);
});

test("stacked and single-column editions use only document scrolling @smoke", async ({ page }) => {
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

test("continuous Basta pages also scroll only the taller parallel edition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/read/#page-138");
  const urdu = page.locator('[data-basta-page="138"] .basta-reader-urdu');
  const roman = page.locator('[data-basta-page="138"] .basta-reader-roman');
  await expect(urdu).toBeAttached({ timeout: 20000 });
  await expect(urdu).toHaveAttribute("data-synced-scrollable", "true");
  await expect(roman).not.toHaveAttribute("data-synced-scrollable", "true");
});

test("image-only book pages remain legible without JavaScript or an edition selector", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/basta/1/");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-image-only", "true");
  await expect(page.locator(".basta-original-page")).toBeVisible();
  await expect(page.locator(".basta-original-page a")).toHaveAttribute("href", /\/images\//);
  await page.goto("/basta/138/");
  await expect(page.getByRole("link", { name: "Original scan", exact: true })).toBeVisible();
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.getByRole("link", { name: "Original lyric sheet", exact: true })).toBeVisible();
  await ctx.close();
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

test("mobile Basta index headings use separate full-width rows", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/index/");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  const urdu = page.locator(".basta-parallel-index-overall-headings .basta-parallel-index-urdu");
  const roman = page.locator(".basta-parallel-index-overall-headings .basta-parallel-index-roman");
  await expect(urdu).toBeVisible();
  await expect(roman).toBeVisible();
  const a = await urdu.boundingBox(), b = await roman.boundingBox();
  expect(Math.abs(a.y - b.y)).toBeGreaterThan(20);
});

test("source link is visibly separated from the category back link", async ({ page }) => {
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const back = await page.locator(".lyric-header .back-link").boundingBox();
  const source = await page.locator(".source-scan-link").boundingBox();
  expect(source.x - (back.x + back.width)).toBeGreaterThan(8);
});

test("standalone lyrics use stacked columns on narrow screens and parallel columns when wide enough", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  const urdu = page.locator(".lyric-reading-urdu");
  const roman = page.locator(".lyric-reading-roman");
  await expect(urdu).toBeVisible();
  await expect(roman).toBeVisible();
  const narrow = await Promise.all([urdu.boundingBox(), roman.boundingBox()]);
  expect(Math.abs(narrow[0].y - narrow[1].y)).toBeGreaterThan(25);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => {
    const [left, right] = await Promise.all([urdu.boundingBox(), roman.boundingBox()]);
    return Math.abs(left.y - right.y);
  }).toBeLessThan(25);
});

test("continuous Basta editions respond to available width, including landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/read/#page-138", { waitUntil: "domcontentloaded" });
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="roman"]').check();
  const section = page.locator('[data-basta-page="138"]');
  await expect(section).toBeAttached({ timeout: 20000 });
  const urdu = section.locator(".basta-reader-urdu");
  const roman = section.locator(".basta-reader-roman");
  await expect(urdu).toBeVisible();
  await expect(roman).toBeVisible();
  await expect.poll(async () => {
    const [a, b] = await Promise.all([urdu.boundingBox(), roman.boundingBox()]);
    return Math.abs(a.y - b.y);
  }).toBeGreaterThan(25);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => {
    const [a, b] = await Promise.all([urdu.boundingBox(), roman.boundingBox()]);
    return Math.abs(a.y - b.y);
  }).toBeLessThan(25);
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

test("the Basta index does not scroll horizontally at mobile, tablet, or desktop sizes", async ({ page }) => {
  for (const width of [390, 768, 900, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/basta/index/");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    await expect(page.locator(".basta-index-table-wrap").first()).toHaveCSS("overflow-x", width <= 640 ? "hidden" : "visible");
  }
});

test("parallel scans float below the reader toolbar, but stacked scans stay in flow", async ({ page }) => {
  await page.setViewportSize({ width: 1550, height: 900 });
  await page.goto("/basta/145/");
  await page.locator('[data-reading-column][value="image"]').check();
  const scan = page.locator(".basta-original-page");
  await expect.poll(() => scan.getAttribute("data-floating-scan")).toBe("true");
  await expect(scan).toHaveCSS("position", "sticky");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => scan.getAttribute("data-floating-scan")).toBe("false");
  await expect(scan).not.toHaveCSS("position", "sticky");
});

test("standalone scans share the same floating-column policy", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1480, height: 900 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  const option = page.locator('[data-reading-column][value="image"]');
  if (await option.count()) {
    await option.check();
    const scan = page.locator(".lyric-reading-image");
    await expect.poll(() => scan.getAttribute("data-floating-scan")).toBe("true");
    await expect(page.locator(".lyric-reading-grid")).toHaveCSS("background-color", "rgb(23, 23, 25)");
    // Clipping must not create a nested scrollport that traps the sticky scan.
    await expect(page.locator(".lyric-reading-grid")).toHaveCSS("overflow-x", "clip");
  }
});

test("a floating scan is never selected for text-column scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1550, height: 900 });
  await page.goto("/basta/145/");
  await page.locator('[data-reading-column][value="image"]').check();
  const scan = page.locator(".basta-original-page");
  await expect.poll(() => scan.getAttribute("data-floating-scan")).toBe("true");
  await expect(scan).not.toHaveAttribute("data-synced-scrollable", "true");
});

test("image viewer centres narrow scans and pans horizontally and vertically when zoomed @smoke", async ({ page }) => {
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

test("Basta uses one upper contextual toolbar and no redundant edition headings", async ({ page }) => {
  for (const url of ["/basta/138/", "/basta/index/"]) {
    await page.goto(url);
    const controls = page.locator("[data-reading-controls]");
    await expect(controls.locator(".basta-pager")).toHaveCount(1);
    await expect(page.locator(".basta-pager")).toHaveCount(1);
  }
  await expect(page.locator(".basta-page-text-heading, .basta-original-page figcaption")).toHaveCount(0);
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.locator(".lyric-language-label")).toHaveCount(0);
  await expect(page.locator(".reading-column-choice").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Focus Mode" })).toBeVisible();
});

test("Focus Mode centres bilingual columns and fits scans within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/images/lyrics/daastaan-e-shujaat-ka-darain-mein.png", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754"><rect width="1240" height="1754" fill="white"/></svg>' }));
  await page.goto("/lyrics/daastaan-e-shujaat-ka-darain-mein/");
  const imageToggle = page.locator('[data-reading-column][value="image"]');
  await imageToggle.uncheck();
  await page.getByRole("button", { name: "Focus Mode" }).click();
  const grid = page.locator(".lyric-reading-grid");
  const bounds = await Promise.all([".lyric-reading-roman", ".lyric-reading-urdu"]
    .map(selector => grid.locator(selector).boundingBox()));
  expect(Math.min(bounds[0].x, bounds[1].x)).toBeGreaterThan(70);
  expect(Math.max(bounds[0].x + bounds[0].width, bounds[1].x + bounds[1].width)).toBeLessThan(1370);
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await imageToggle.check();
  const scan = grid.locator(".lyric-reading-image img");
  await expect(scan).toHaveJSProperty("naturalWidth", 1240);
  const box = await scan.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(45);
  expect(box.y + box.height).toBeLessThanOrEqual(898);
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
});

// The Options overlay must not alter the source scan's geometry on Basta pages.
test("Basta Focus scan stays centred and fully visible when Options expands", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.route("**/images/basta/original/145.png", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="630" height="1080"><rect width="630" height="1080" fill="white"/></svg>' }));
  await page.goto("/basta/145/");
  await page.locator('[data-reading-column][value="image"]').check();
  await page.getByRole("button", { name: "Focus Mode" }).click();
  const scan = page.locator(".basta-original-page img");
  await expect(scan).toHaveJSProperty("naturalWidth", 630);
  const before = await scan.boundingBox();
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await expect(page.locator("[data-reading-controls]")).toHaveAttribute("data-reading-options-open", "true");
  await expect.poll(async () => (await scan.boundingBox()).y).toBeGreaterThanOrEqual(before.y - 4);
  const after = await scan.boundingBox();
  expect(Math.abs(after.y - before.y)).toBeLessThan(5);
  expect(after.y + after.height).toBeLessThanOrEqual(900);
});

test("standalone image selection never creates phantom columns and stays horizontally centred", async ({ page }) => {
  await page.setViewportSize({width: 1440, height: 900});
  const imageUrl = "/images/lyrics/bahar-aayi-bahar-aayi-zehra-ke-ghar.png";
  await page.route("**" + imageUrl, route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1200"><rect width="750" height="1200" fill="white"/></svg>',
  }));
  await page.goto("/lyrics/bahar-aayi-bahar-aayi-zehra-ke-ghar/");
  const grid = page.locator(".lyric-reading-grid");
  const image = grid.locator(".lyric-reading-image");
  const scan = image.locator("img");
  const imageToggle = page.locator('[data-reading-column][value="image"]');
  const romanToggle = page.locator('[data-reading-column][value="roman"]');
  const urduToggle = page.locator('[data-reading-column][value="urdu"]');
  await imageToggle.check();
  await romanToggle.uncheck();
  await urduToggle.uncheck();
  await expect(grid).toHaveAttribute("data-reading-mode", "image");
  await expect(scan).toHaveJSProperty("naturalWidth", 750);
  const geometry = await grid.evaluate(el => {
    const image = el.querySelector(".lyric-reading-image").getBoundingClientRect();
    const scan = el.querySelector("img").getBoundingClientRect();
    const shell = el.getBoundingClientRect();
    const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/);
    return {
      tracks: tracks.length, aligned: Math.abs((scan.left + scan.right) / 2 -
        (shell.left + shell.right) / 2),
      imageWidth: image.width, scanWidth: scan.width,
    };
  });
  expect(geometry.tracks).toBe(1);
  expect(geometry.aligned).toBeLessThan(2);
  expect(geometry.scanWidth).toBeGreaterThan(50);
  await page.setViewportSize({width: 390, height: 844});
  await expect.poll(async () => {
    const img = await scan.boundingBox();
    const shell = await grid.boundingBox();
    return Math.abs((img.x + img.width/2) - (shell.x + shell.width/2));
  }).toBeLessThan(2);
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
});

test("standalone scan plus Urdu/Roman is parallel when wide and centred above text at medium width", async ({ page }) => {
  const imageUrl = "/images/lyrics/bahar-aayi-bahar-aayi-zehra-ke-ghar.png";
  await page.route("**" + imageUrl, route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1200"><rect width="750" height="1200" fill="white"/></svg>',
  }));
  await page.setViewportSize({width: 1600, height: 900});
  await page.goto("/lyrics/bahar-aayi-bahar-aayi-zehra-ke-ghar/");
  const grid = page.locator(".lyric-reading-grid");
  const image = grid.locator(".lyric-reading-image");
  const roman = grid.locator(".lyric-reading-roman");
  const urdu = grid.locator(".lyric-reading-urdu");
  await page.locator('[data-reading-column][value="image"]').check();
  await page.locator('[data-reading-column][value="roman"]').check();
  await page.locator('[data-reading-column][value="urdu"]').check();
  await expect.poll(() => image.getAttribute("data-floating-scan")).toBe("true");
  const wide = await Promise.all([image,roman,urdu].map(el=>el.boundingBox()));
  expect(Math.max(...wide.map(box=>box.y))-Math.min(...wide.map(box=>box.y))).toBeLessThan(25);
  await page.setViewportSize({width: 1050, height: 900});
  await expect.poll(() => image.getAttribute("data-floating-scan")).toBe("false");
  const medium = await Promise.all([image,roman,urdu].map(el=>el.boundingBox()));
  expect(medium[0].y + medium[0].height).toBeLessThanOrEqual(medium[1].y+3);
  expect(Math.abs(medium[1].y - medium[2].y)).toBeLessThan(3);
  expect(medium[0].height).toBeLessThan(680);
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await expect(image).not.toHaveCSS("position", "sticky");
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
});

test("standalone image plus either single text edition occupies only two columns", async ({ page }) => {
  await page.setViewportSize({width: 1400, height: 900});
  await page.goto("/lyrics/bahar-aayi-bahar-aayi-zehra-ke-ghar/");
  const grid = page.locator(".lyric-reading-grid");
  const image = grid.locator(".lyric-reading-image");
  await page.locator('[data-reading-column][value="image"]').check();
  for (const remaining of ["urdu","roman"]) {
    await page.locator('[data-reading-column][value="urdu"]').setChecked(remaining === "urdu");
    await page.locator('[data-reading-column][value="roman"]').setChecked(remaining === "roman");
    const expected = remaining === "urdu" ? ".lyric-reading-urdu" : ".lyric-reading-roman";
    const rectangles = await Promise.all([image,grid.locator(expected)].map(el=>el.boundingBox()));
    expect(Math.abs(rectangles[0].y - rectangles[1].y)).toBeLessThan(25);
    expect(rectangles[0].x + rectangles[0].width).toBeLessThanOrEqual(rectangles[1].x+5);
    const tracks = await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    expect(tracks).toBe(2);
  }
});

test("Basta kalam and stanza bookmarks survive navigation without shifting poetry @smoke", async ({ page }) => {
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
