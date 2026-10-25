import { test, expect } from "@playwright/test";

test("all reader types expose text before JavaScript initializes", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.locator(".lyric-reading-urdu .lyric-verse").first()).toBeVisible();
  await page.goto("/basta/138/");
  await expect(page.locator(".basta-page-urdu .basta-verse-line").first()).toBeVisible();
  await page.goto("/basta/read/");
  await expect(page.locator('.basta-reader-page[data-basta-page="3"]')).toBeVisible();
  await context.close();
});

test("two text editions are stacked in portrait and parallel in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/138/");
  const urdu = page.locator(".basta-page-urdu");
  const roman = page.locator(".basta-page-roman");
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
  await expect(image).toBeHidden();
  await page.getByLabel("Image", { exact: true }).check();
  await expect(image).toBeVisible();
  await image.locator("a").click();
  await expect(page.locator("dialog.scan-viewer")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Focus mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
});

test("continuous reader deep links load streamed content and preserve the current page", async ({ page }) => {
  await page.goto("/basta/read/#page-138");
  const page138 = page.locator('[data-basta-page="138"]');
  await expect(page138).toBeAttached({ timeout: 20000 });
  await page.getByRole("button", { name: "Focus mode" }).click();
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.locator(".basta-reader-index")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".basta-reader-index")).toBeHidden();
});

test("unavailable Roman transcription shows a source scan rather than blank content", async ({ page }) => {
  await page.goto("/basta/read/#page-30");
  await expect(page.locator('[data-basta-page="30"]')).toBeAttached({ timeout: 20000 });
  await page.getByLabel("Urdu", { exact: true }).uncheck();
  const source = page.locator('[data-basta-page="30"] .basta-reader-original-image');
  const notice = page.locator('[data-basta-page="30"] .basta-edition-unavailable');
  await expect(source).toBeVisible();
  await expect(notice).toContainText("not available");
});

test("wrapping is optional and text-size settings persist", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await page.getByRole("button", { name: "Text options" }).click();
  await page.getByLabel("Allow wrapping").check();
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-wrap-verses", "true");
  await expect.poll(() => page.locator(".lyric-verse").first().evaluate((node) => getComputedStyle(node).whiteSpace)).toBe("normal");
  await page.locator("[data-reading-font-size]").selectOption("xlarge");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-font-size", "xlarge");
  await page.reload();
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-wrap-verses", "true");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-font-size", "xlarge");
});

test("compact index presents accessible entries at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/index/");
  await expect(page.locator(".basta-index-mobile-list").first()).toBeVisible();
  await expect(page.locator(".basta-index-table-wrap").first()).toBeHidden();
});

test("all text-edition combinations remain readable across themes and responsive widths", async ({ page }) => {
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".basta-page-urdu")).toBeVisible();
  await toggle.click();
});

test("rotation and Focus exit retain an actual continuous page rather than the book top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/read/#page-138");
  const target = page.locator('[data-basta-page="138"]');
  await expect(target).toBeAttached({ timeout: 20000 });
  await target.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate(() => window.scrollBy(0, 125));
  await page.locator('[data-reading-column][value="roman"]').uncheck();
  const editions = await page.locator("[data-reading-root]").getAttribute("data-reading-columns");
  await page.getByRole("button", { name: "Focus mode" }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", editions);
  // Exit at a known position within page 138, not where the preceding page crosses the reading line.
  await target.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.locator("[data-reading-root]").evaluate((node) => { node.scrollTop += 125; });
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
  await expect.poll(() => new URL(page.url()).hash).toBe("#page-138");
  await expect.poll(async () => target.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  })).toBe(true);
});

test("the short closing Bain on page 138 keeps independent synchronized panels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/138/");
  const roman = page.locator(".basta-page-roman");
  const urdu = page.locator(".basta-page-urdu");
  await expect(roman).toHaveAttribute("data-synced-active", "true");
  await expect(urdu).toHaveAttribute("data-synced-active", "true");
  expect(await roman.locator(".basta-kalam-text").count()).toBeGreaterThan(1);
  expect(await urdu.locator(".basta-kalam-text").count()).toBeGreaterThan(1);
  await roman.evaluate((node) => { node.scrollTop = Math.max(1, (node.scrollHeight - node.clientHeight) * 0.65); });
  await expect.poll(() => urdu.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});

test("image-only book pages remain legible without JavaScript or an edition selector", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/basta/1/");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-image-only", "true");
  await expect(page.locator(".basta-original-page")).toBeVisible();
  await expect(page.locator(".basta-original-page a")).toHaveAttribute("href", /\/images\//);
  await ctx.close();
});

test("source scan links remain accessible when JavaScript is disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
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
  await page.goto("/");
  const link = page.locator("[data-resume-basta]");
  await expect(link).toHaveAttribute("href", new RegExp(`/basta/138/\\?resume=`));
  await link.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(saved.offset).toBeLessThanOrEqual(1);
});
