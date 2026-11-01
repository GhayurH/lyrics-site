// Responsive navigation, toolbar, and reader geometry across real viewport sizes.
import { test, expect } from "@playwright/test";

const readers = [
  { path: "/lyrics/aa-asghar-bin-tere/", hasPageJump: false },
  { path: "/basta/200/", hasPageJump: false },
  { path: "/basta/read/#page-200", hasPageJump: true },
  { path: "/basta/index/", hasPageJump: false },
];

test("reader settings collapse by default and expand on every mobile reading view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { path, hasPageJump } of readers) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const controls = page.locator("[data-reading-controls]");
    const toggle = controls.locator("[data-reading-regular-toggle]");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(controls.locator(".reading-view-control")).toBeHidden();
    await expect(controls.locator("[data-reading-line-spacing]")).toBeHidden();
    await expect(controls.locator(".reading-focus-enter")).toBeVisible();
    if (hasPageJump) {
      await expect(controls.locator(".reading-page-jump")).toBeHidden();
      await expect(controls.locator(".reading-contents-button")).toBeHidden();
    }
    const compact = await controls.boundingBox();
    const combinedPager = await controls.locator(".reading-context-nav").count() > 0;
    expect(compact.height).toBeLessThan(combinedPager ? 150 : 100);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(controls.locator(".reading-view-control")).toBeVisible();
    await expect(controls.locator("[data-reading-line-spacing]")).toBeVisible();
    if (hasPageJump) {
      await expect(controls.locator(".reading-page-jump")).toBeVisible();
      await expect(controls.locator(".reading-contents-button")).toBeVisible();
    }
    await controls.locator("[data-reading-line-spacing]").selectOption("relaxed");
    await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-line-spacing", "relaxed");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(controls.locator(".reading-view-control")).toBeHidden();
  }
});

test("site header hides on downward scrolling and returns on upward scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  const header = page.locator(".site-header");
  const root = page.locator("html");
  await expect(header).toBeVisible();
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(root).toHaveAttribute("data-mobile-header-hidden", "true");
  await expect.poll(() => header.evaluate((node) =>
    node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
  const controls = page.locator("[data-reading-controls]");
  await expect.poll(() => controls.evaluate((el) => getComputedStyle(el).top)).toBe("8px");

  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await expect(header).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).toBeVisible();
});

test("the open mobile navigation never hides during scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("#mobile-nav-toggle").click();
  await expect(page.locator("#site-navigation")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-navigation")).toBeHidden();
});

test("desktop settings collapse after scrolling into the poem but navigation stays available", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/138/");
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await page.evaluate(() => {
    const reading = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + 300, behavior: "instant" });
  });
  await expect(controls).toHaveAttribute("data-reader-compact", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeVisible();
  await expect(controls.locator(".reading-view-control")).toBeHidden();
  await expect(controls.locator(".basta-pager")).toBeVisible();
  // A single printed page has the pager; full-book page-jump and Contents
  // actions belong to the separate continuous-reader route.
  await controls.locator("[data-reading-regular-toggle]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();

  await page.goto("/basta/read/#page-138");
  const continuous = page.locator("[data-reading-controls]");
  await page.evaluate(() => {
    const reading = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + 500, behavior: "instant" });
  });
  await expect(continuous).toHaveAttribute("data-reader-compact", "true");
  await expect(continuous.locator(".reading-contents-button")).toBeVisible();
  await expect(continuous.locator(".reading-page-jump")).toBeVisible();
  await expect(continuous.locator(".reading-open-page")).toBeVisible();
  await expect(continuous.locator(".reading-current-page")).toBeVisible();
});

test("retracted headers remain keyboard reachable without upward scrolling", async ({ page }) => {
  for (const config of [
    { width: 390, height: 844, url: "/basta/200/", flag: "data-mobile-header-hidden", distance: 650 },
    { width: 1280, height: 820, url: "/basta/read/", flag: "data-desktop-reader-header-hidden", distance: 400 },
  ]) {
    await page.setViewportSize({ width: config.width, height: config.height });
    await page.goto(config.url);
    await page.evaluate(({ distance }) => {
      const reading = document.querySelector("[data-reading-root]");
      window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + distance, behavior: "instant" });
    }, config);
    await expect(page.locator("html")).toHaveAttribute(config.flag, "true");
    const header = page.locator(".site-header");
    await expect.poll(() => header.evaluate((node) =>
      node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    await page.evaluate(() => document.querySelector("#theme-toggle").focus({ preventScroll: true }));
    await expect(page.locator("#theme-toggle")).toBeFocused();
    await expect(page.locator("html")).not.toHaveAttribute(config.flag, "true");
    await expect.poll(() => header.evaluate((node) =>
      node.getBoundingClientRect().bottom)).toBeGreaterThan(30);
  }
});
