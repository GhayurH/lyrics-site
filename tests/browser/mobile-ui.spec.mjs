// File role: Functional mobile layout regressions observed on the Basta reader.
// Assertions use bounding boxes and computed styles only; no screenshot testing.
import { test, expect } from "@playwright/test";

test("mobile header occupies one line with accessible menu and icon theme toggle @smoke", async ({ page }) => {
  for (const width of [320, 342, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/basta/200/");
    const header = page.locator(".site-header");
    const headerBox = await header.boundingBox();
    expect(headerBox.height).toBeLessThan(76);
    await expect(page.locator(".site-title")).toBeVisible();
    const toggle = page.locator("#mobile-nav-toggle");
    const nav = page.locator("#site-navigation");
    const theme = page.locator("#theme-toggle");
    await expect(toggle).toBeVisible();
    await expect(nav).toBeHidden();
    const toggleBox = await toggle.boundingBox();
    const themeBox = await theme.boundingBox();
    expect(themeBox.width).toBeLessThan(54);
    expect(toggleBox.width).toBeLessThan(54);
    expect(toggleBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(themeBox.y + themeBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Search" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});


test("paired lyric actions and reader controls have matching accessible heights", async ({ page }) => {
  for (const { width, height } of [{ width: 320, height: 760 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize({ width, height });
    await page.goto("/lyrics/aa-asghar-bin-tere/");
    const actions = page.locator(".lyric-header-actions");
    const save = actions.locator(".favorite-button");
    const add = actions.locator(".lyric-add-recitation");
    await expect(save).toBeVisible();
    await expect(add).toBeVisible();
    const [saveBox, addBox] = await Promise.all([save.boundingBox(), add.boundingBox()]);
    const target = await page.locator("html").evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).getPropertyValue("--ui-target")) * Number.parseFloat(getComputedStyle(el).fontSize));
    expect(Math.abs(saveBox.height - addBox.height)).toBeLessThanOrEqual(1);
    expect(saveBox.height).toBeGreaterThanOrEqual(target - 1);
    expect(addBox.height).toBeGreaterThanOrEqual(target - 1);
    const detailsBox = await page.locator(".lyric-metadata-disclosure summary").boundingBox();
    expect(detailsBox.height).toBeGreaterThanOrEqual(target - 1);

    if (width <= 700) {
      const controls = page.locator("[data-reading-controls]");
      const [focusBox, viewBox, menuBox, themeBox] = await Promise.all([
        controls.locator(".reading-focus-enter").boundingBox(),
        controls.locator(".reading-regular-toggle").boundingBox(),
        page.locator("#mobile-nav-toggle").boundingBox(),
        page.locator("#theme-toggle").boundingBox(),
      ]);
      expect(Math.abs(focusBox.height - viewBox.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(menuBox.height - themeBox.height)).toBeLessThanOrEqual(1);
      expect(focusBox.height).toBeGreaterThanOrEqual(target - 1);
      await controls.locator(".reading-regular-toggle").click();
      for (const selector of [".reading-column-choice", "[data-reading-line-spacing]"]) {
        const box = await controls.locator(selector).first().boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(target - 1);
      }
    }
  }
});

test("selected Image Urdu Roman cells are entirely filled in every applicable reader", async ({ page }) => {
  for (const route of [
    "/lyrics/aa-asghar-bin-tere/",
    "/basta/200/",
    "/basta/read/",
    "/basta/index/",
  ]) {
    await page.setViewportSize({ width: 342, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("[data-reading-regular-toggle]").click();
    const choices = page.locator(".reading-column-choice");
    await expect(choices.first()).toBeVisible();
    const count = await choices.count();
    for (let i = 0; i < count; i++) {
      const item = choices.nth(i);
      const input = item.locator("input");
      if (!(await input.isChecked()) && (await item.locator("input").getAttribute("value")) === "image") {
        await input.check();
      }
      const state = await item.evaluate((label) => {
        const span = label.querySelector("span");
        const input = label.querySelector("input");
        const a = label.getBoundingClientRect(), b = span.getBoundingClientRect();
        return {
          checked: input.checked,
          labelWidth: a.width, labelHeight: a.height,
          spanWidth: b.width, spanHeight: b.height,
          fill: getComputedStyle(span).backgroundColor,
        };
      });
      expect(Math.abs(state.labelWidth - state.spanWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(state.labelHeight - state.spanHeight)).toBeLessThanOrEqual(2);
      if (state.checked) expect(state.fill).not.toBe("rgba(0, 0, 0, 0)");
    }
  }
});

test("Basta page-by-page fills the full width of each stacked edition in mobile portrait", async ({ page }) => {
  for (const width of [320, 342, 390, 600]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/basta/200/");
    const root = page.locator(".basta-page-grid");
    const columns = page.locator(".basta-parallel-kalams-page");
    const urdu = page.locator(".basta-page-urdu");
    const roman = page.locator(".basta-page-roman");
    await page.locator("[data-reading-regular-toggle]").click();
    await page.locator('[data-reading-column][value="roman"]').check();
    await expect(urdu).toBeVisible();
    await expect(roman).toBeVisible();
    await expect.poll(async () => {
      const [container, group, u, r] = await Promise.all([
        root.boundingBox(), columns.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
      ]);
      return group.width / container.width > .9 &&
        u.width / group.width > .95 && r.width / group.width > .95 &&
        Math.abs(u.x - r.x) < 5 && Math.abs(u.y - r.y) > 30;
    }).toBe(true);
    const [container, group, u, r] = await Promise.all([
      root.boundingBox(), columns.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
    ]);
    expect(group.width / container.width).toBeGreaterThan(.9);
    expect(u.width / group.width).toBeGreaterThan(.95);
    expect(r.width / group.width).toBeGreaterThan(.95);
    expect(Math.abs(u.x - r.x)).toBeLessThan(5);
    expect(Math.abs(u.y - r.y)).toBeGreaterThan(30);
    expect(await columns.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
  }
  // The scan must not shrink the stacked text panels either.
  await page.setViewportSize({ width: 342, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="image"]').check();
  const scanRoot = page.locator(".basta-page-grid");
  const [original, text, panel] = await Promise.all([
    scanRoot.locator(".basta-original-page").boundingBox(),
    scanRoot.locator(".basta-parallel-kalams-page").boundingBox(),
    scanRoot.boundingBox(),
  ]);
  expect(original.width / panel.width).toBeGreaterThan(.9);
  expect(text.width / panel.width).toBeGreaterThan(.9);
  expect(text.y).toBeGreaterThan(original.y);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/basta/200/");
  const u = await page.locator(".basta-page-urdu").boundingBox();
  const r = await page.locator(".basta-page-roman").boundingBox();
  expect(Math.abs(u.y - r.y)).toBeLessThan(25);
});

test("mobile readers start with an uncluttered Urdu view while desktop Basta starts with source plus Urdu @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/lyrics/aa-asghar-bin-tere/", "/basta/138/", "/basta/read/", "/basta/index/"]) {
    await page.goto(url);
    await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", "urdu");
    await expect(page.locator("[data-reading-regular-label]")).toContainText("View: Urdu");
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/basta/138/");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", "image urdu");
  await expect(page.locator(".basta-original-page")).toBeVisible();
  await expect(page.locator(".basta-page-roman")).toBeHidden();
});

test("short touch landscape releases the sticky toolbar, but short desktop windows keep it", async ({ browser, page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/basta/200/");
  const pageUrl = page.url();
  const touch = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const phone = await touch.newPage();
    await phone.goto(pageUrl);
    await expect(phone.locator("[data-reading-controls]")).toBeVisible();
    expect(await phone.locator("[data-reading-controls]").evaluate((node) =>
      getComputedStyle(node).position)).toBe("static");
  } finally {
    await touch.close();
  }

  expect(await page.locator("[data-reading-controls]").evaluate((node) =>
    getComputedStyle(node).position)).toBe("sticky");
});

test("Basta stacked editions follow available container width at the mobile/tablet boundary", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 650, height: 850 },
    { width: 760, height: 500 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/basta/200/");
    const menu = page.locator("[data-reading-regular-toggle]");
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-reading-column][value="roman"]').check();
    await page.locator('[data-reading-column][value="image"]').check();
    const root = page.locator(".basta-page-grid");
    const text = page.locator(".basta-parallel-kalams-page");
    const urdu = page.locator(".basta-page-urdu");
    const roman = page.locator(".basta-page-roman");
    await expect.poll(async () => {
      const [outer, group, u, r] = await Promise.all([
        root.boundingBox(), text.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
      ]);
      return group.width / outer.width > 0.9 &&
        u.width / group.width > 0.95 && r.width / group.width > 0.95 &&
        Math.abs(u.x - r.x) < 5 && Math.abs(u.y - r.y) > 30;
    }).toBe(true);
  }
});
