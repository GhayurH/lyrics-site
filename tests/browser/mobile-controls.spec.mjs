// File role: Functional tests for compact mobile reader controls and direction-aware header.
// No screenshot tests or image baseline comparisons.
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
    expect(compact.height).toBeLessThan(100);

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

test("Focus mode retains its independent Options behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  const controls = page.locator("[data-reading-controls]");
  await controls.locator("[data-reading-focus-enter]").click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await expect(controls.locator("[data-reading-focus-options]")).toBeVisible();
  await controls.locator("[data-reading-focus-options]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
  await controls.locator("[data-reading-focus-exit]").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeVisible();
});

test("desktop readers keep their complete controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/read/");
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
  await expect(controls.locator("[data-reading-line-spacing]")).toBeVisible();
  await expect(controls.locator(".reading-page-jump")).toBeVisible();
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
  await expect(header).toBeHidden();
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

test("desktop and no-JavaScript pages keep the site header visible", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/basta/200/");
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-mobile-header-hidden", "true");
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJs = await context.newPage();
  await noJs.goto("/basta/200/");
  await noJs.evaluate(() => window.scrollTo(0, 700));
  await expect(noJs.locator(".site-header")).toBeVisible();
  await context.close();
});

test("header still retracts after tapping the theme button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("#theme-toggle").click();
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(page.locator("html")).toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
});
