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

test("theme icon switches accessibly without placing text in the header", async ({ page }) => {
  await page.setViewportSize({ width: 342, height: 844 });
  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  await expect(toggle.locator(".theme-icon-sun")).toBeVisible();
  await expect(toggle.locator(".theme-icon-moon")).toBeHidden();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to dark mode");
  await expect(toggle.locator(".theme-icon-moon")).toBeVisible();
  await expect(toggle.locator(".theme-icon-sun")).toBeHidden();
  await page.locator("#mobile-nav-toggle").click();
  await page.locator("#site-navigation").getByRole("link", { name: "Basta" }).click();
  await expect(page).toHaveURL(/\/basta\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("selected Image Urdu Roman cells are entirely filled in every applicable reader @smoke", async ({ page }) => {
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

test("Basta page-by-page fills the full width of each stacked edition in mobile portrait @smoke", async ({ page }) => {
  for (const width of [320, 342, 390, 600]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/basta/200/");
    const root = page.locator(".basta-page-grid");
    const columns = page.locator(".basta-parallel-kalams-page");
    const urdu = page.locator(".basta-page-urdu");
    const roman = page.locator(".basta-page-roman");
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
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/basta/200/");
  const u = await page.locator(".basta-page-urdu").boundingBox();
  const r = await page.locator(".basta-page-roman").boundingBox();
  expect(Math.abs(u.y - r.y)).toBeLessThan(25);
});

test("Basta mobile portrait remains full width if the scan is also selected", async ({ page }) => {
  await page.setViewportSize({ width: 342, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="image"]').check();
  const root = page.locator(".basta-page-grid");
  const [original, text, panel] = await Promise.all([
    root.locator(".basta-original-page").boundingBox(),
    root.locator(".basta-parallel-kalams-page").boundingBox(),
    root.boundingBox(),
  ]);
  expect(original.width / panel.width).toBeGreaterThan(.9);
  expect(text.width / panel.width).toBeGreaterThan(.9);
  expect(text.y).toBeGreaterThan(original.y);
});
