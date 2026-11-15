// Responsive navigation, toolbar, and reader geometry across real viewport sizes.
import { test, expect } from "@playwright/test";

test("reader routes share article width and breadcrumb styling", async ({ page }) => {
  await page.setViewportSize({ width: 1530, height: 900 });
  const routes = [
    "/lyrics/ab-aey-hawaon-kuch-khak-urao/",
    "/basta/138/",
    "/basta/kalam/basta-marsiye-117/",
    "/basta/read/",
    "/basta/index/",
    "/recite/read/",
  ];
  let reference;
  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const nav = page.locator(".reader-subnav");
    await expect(nav).toBeVisible();
    const geometry = await page.locator("[data-reader-shell]").evaluate(shell => {
      const nav = shell.querySelector(".reader-subnav");
      const css = getComputedStyle(nav);
      return {
        width: Math.round(shell.getBoundingClientRect().width),
        display: css.display,
        gap: css.columnGap,
        fontSize: css.fontSize,
        linkDecoration: getComputedStyle(nav.querySelector("a")).textDecorationLine,
      };
    });
    expect(geometry.width, route).toBeGreaterThan(1200);
    if (reference) expect(geometry, route).toEqual(reference);
    else reference = geometry;
  }
});

test("mobile reader settings expand and collapse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lyrics/aa-asghar-bin-tere/", { waitUntil: "domcontentloaded" });
  const controls = page.locator("[data-reading-controls]");
  const toggle = controls.locator("[data-reading-regular-toggle]");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(controls.locator(".reading-view-control")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(controls.locator(".reading-view-control")).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("mobile header scroll lifecycle preserves navigation and keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  const header = page.locator(".site-header");
  const root = page.locator("html");
  await expect(header).toBeVisible();
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(root).toHaveAttribute("data-mobile-header-hidden", "true");
  await expect.poll(() => header.evaluate(node => node.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(1);
  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).toBeVisible();

  // Keeping the mobile navigation open overrides scroll-away behavior.
  await page.locator("#mobile-nav-toggle").click();
  await expect(page.locator("#site-navigation")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(header).toBeVisible();
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-navigation")).toBeHidden();

  // Once the menu is closed, keyboard focus still recovers a hidden header.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  // The header's scroll handler is coalesced in requestAnimationFrame.
  // Allow the upward scroll to be observed before the next downward move.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(root).toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => document.querySelector("#theme-toggle").focus({ preventScroll: true }));
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await expect(page.locator("#theme-toggle")).toBeFocused();
});

test("desktop reader settings compact on scroll without hiding navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/138/", { waitUntil: "domcontentloaded" });
  const controls = page.locator("[data-reading-controls]");
  await page.evaluate(() => {
    const root = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: scrollY + root.getBoundingClientRect().top + 300, behavior: "instant" });
  });
  await expect(controls).toHaveAttribute("data-reader-compact", "true");
  await expect(controls.locator(".reading-view-control")).toBeHidden();
  await expect(controls.locator(".basta-pager")).toBeVisible();
  await controls.locator("[data-reading-regular-toggle]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
});

test("Urdu Nastaliq ink clearance preserves verse width across readers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [
    ["/lyrics/aa-asghar-bin-tere/", ".lyric-reading-urdu .lyric-verse"],
    ["/basta/140/", ".basta-page-urdu .basta-verse-line.basta-verse-poetry"],
    ["/basta/read/#page-138", '[data-basta-page="138"] .basta-reader-urdu .basta-verse-line.basta-verse-poetry'],
  ];
  for (const [url, selector] of cases) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const line = page.locator(selector).first();
    await expect(line).toBeVisible();
    const metrics = await line.evaluate((node) => {
      const style = getComputedStyle(node);
      const startPadding = Number.parseFloat(style.paddingInlineStart);
      const endMargin = Number.parseFloat(style.marginInlineEnd);
      return { direction: style.direction, startPadding, endMargin,
        // Couplets intentionally indent their start or inset their end.
        // Excluding those existing offsets, the ink gutter must cost no width.
        contentWidth: node.clientWidth - startPadding -
          (Number.parseFloat(style.paddingInlineEnd) || 0),
        intendedInset: (Number.parseFloat(style.marginInlineStart) || 0) +
          (Number.parseFloat(style.paddingInlineEnd) || 0),
        parentWidth: node.parentElement.clientWidth };
    });
    expect(metrics.direction).toBe("rtl");
    expect(metrics.startPadding).toBeGreaterThan(3);
    expect(metrics.endMargin).toBeLessThan(-3);
    expect(Math.abs(metrics.startPadding + metrics.endMargin)).toBeLessThan(1);
    // The right-side gutter must not steal the usable width for verse fitting.
    expect(metrics.contentWidth + metrics.intendedInset).toBeGreaterThanOrEqual(metrics.parentWidth - 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
