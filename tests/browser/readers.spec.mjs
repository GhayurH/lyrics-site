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

test("edition preferences, Focus mode, and image enlargement work together @smoke", async ({ page }) => {
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

test("widening the Roman column grows the stanza font while every verse stays justified", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lyrics/ab-aey-hawaon-kuch-khak-urao/");
  const divider = page.getByRole("separator", { name: "Resize Roman and Urdu columns" });
  const stanza = page.locator(".lyric-reading-roman .lyric-stanza").first();
  await expect(divider).toBeVisible();
  await expect(divider).toHaveAttribute("aria-valuemax", "85");
  await expect.poll(() => stanza.locator(".lyric-verse").count()).toBeGreaterThan(1);
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
  const lines = await stanza.evaluate(node =>
    [...node.querySelectorAll(".lyric-verse")].map(verse => ({
      justified: getComputedStyle(verse).textAlignLast === "justify",
      nowrap: getComputedStyle(verse).whiteSpace === "nowrap",
      fits: verse.scrollWidth <= verse.clientWidth + 3,
    }))
  );
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.every(line => line.justified && line.nowrap && line.fits)).toBe(true);
  // Dragging is covered above. Verify the keyboard's end-stop can also
  // reduce a grown stanza without leaving the cap applied.
  await divider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expect(divider).toHaveAttribute("aria-valuenow", "60");
  await expect.poll(async () => stanza.locator(".lyric-verse").first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize)))
    .toBeLessThan(wideSize - 2);
});

test("three-edition lyrics follow the shared responsive scan and text layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lyrics/ab-aey-hawaon-kuch-khak-urao/");
  await page.locator('[data-reading-column][value="image"]').check();
  const grid = page.locator(".lyric-reading-grid");
  const figure = grid.locator(".lyric-reading-image");
  const divider = page.getByRole("separator", { name: "Resize Roman and Urdu columns" });
  await expect(figure).toBeVisible();
  await expect(grid.locator(".lyric-reading-roman")).toBeVisible();
  await expect(grid.locator(".lyric-reading-urdu")).toBeVisible();
  await expect.poll(() => figure.getAttribute("data-floating-scan")).toBe("true");
  await expect.poll(async () => grid.evaluate(element => {
    const image = element.querySelector(".lyric-reading-image").getBoundingClientRect();
    const roman = element.querySelector(".lyric-reading-roman").getBoundingClientRect();
    const urdu = element.querySelector(".lyric-reading-urdu").getBoundingClientRect();
    return image.width >= 280 && image.right <= roman.left + 3 &&
      Math.abs(image.top - roman.top) < 20 && Math.abs(roman.top - urdu.top) < 20 &&
      roman.right <= urdu.left + 3;
  })).toBe(true);
  await expect(divider).toBeVisible();

  // Below 64rem the scan is above the two resizable text editions.
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(() => figure.getAttribute("data-floating-scan")).toBe("false");
  await expect.poll(async () => grid.evaluate(element => {
    const image = element.querySelector(".lyric-reading-image").getBoundingClientRect();
    const roman = element.querySelector(".lyric-reading-roman").getBoundingClientRect();
    const urdu = element.querySelector(".lyric-reading-urdu").getBoundingClientRect();
    return image.width >= 400 && image.bottom <= roman.top + 3 &&
      Math.abs(roman.top - urdu.top) < 20 && roman.right <= urdu.left + 3;
  })).toBe(true);
  await expect(divider).toBeVisible();

  // Phones stack all three surfaces, retaining a readable scan.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(figure).toBeVisible();
  await expect(divider).toBeHidden();
  expect(await figure.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(250);
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
