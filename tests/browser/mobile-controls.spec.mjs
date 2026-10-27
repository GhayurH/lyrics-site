// File role: Functional tests for compact mobile reader controls and direction-aware header.
// No screenshot tests or image baseline comparisons.
import { test, expect } from "@playwright/test";

const readers = [
  { path: "/lyrics/aa-asghar-bin-tere/", hasPageJump: false },
  { path: "/basta/200/", hasPageJump: false },
  { path: "/basta/read/#page-200", hasPageJump: true },
  { path: "/basta/index/", hasPageJump: false },
];

test("reader settings collapse by default and expand on every mobile reading view @smoke", async ({ page }) => {
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

test("short desktop viewports also retain floating controls", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 550 });
  await page.goto("/basta/read/");
  await expect(page.locator("[data-reading-controls]")).toHaveCSS("position", "sticky");
});

test("site header hides on downward scrolling and returns on upward scrolling @smoke", async ({ page }) => {
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

test("desktop reading controls float as the site header hides and returns @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/read/");
  const header = page.locator(".site-header");
  const controls = page.locator("[data-reading-controls]");
  const html = page.locator("html");
  await expect(controls).toHaveCSS("position", "sticky");
  await expect(header).toBeVisible();
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");

  await page.evaluate(() => {
    const reader = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: window.scrollY + reader.getBoundingClientRect().top + 400, behavior: "instant" });
  });
  await expect(html).toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await expect(header).toBeHidden();
  await expect.poll(() => controls.evaluate((node) => node.getBoundingClientRect().top)).toBeGreaterThanOrEqual(7);
  await expect.poll(() => controls.evaluate((node) => node.getBoundingClientRect().top)).toBeLessThan(12);

  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await expect(header).toBeVisible();
  await expect.poll(async () => {
    const controlTop = await controls.evaluate((node) => node.getBoundingClientRect().top);
    const headerHeight = await header.evaluate((node) => node.getBoundingClientRect().height);
    return controlTop >= headerHeight - 3;
  }).toBe(true);

  await controls.getByRole("button", { name: "Focus mode" }).click();
  await expect(html).toHaveAttribute("data-reading-focus", "true");
  await expect(controls).toHaveCSS("position", "fixed");
  await controls.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(html).not.toHaveAttribute("data-reading-focus", "true");
});

test("desktop reader header hides while scrolling the taller Urdu column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/138/");
  const urdu = page.locator(".basta-page-urdu");
  const html = page.locator("html");
  await expect(urdu).toHaveAttribute("data-synced-scrollable", "true");
  await page.evaluate(() => document.querySelector("[data-reading-root]").scrollIntoView({ block: "start", behavior: "instant" }));
  await urdu.evaluate((node) => { node.scrollTop += 80; });
  await expect(html).toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await urdu.evaluate((node) => { node.scrollTop -= 50; });
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
});

test("non-reading desktop pages and pages without JavaScript keep the header", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const noJs = await context.newPage();
  await noJs.goto("/basta/read/");
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
