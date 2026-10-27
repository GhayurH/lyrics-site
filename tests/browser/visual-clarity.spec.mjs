// File role: Responsive, interactive geometry review and representative
// screenshots for major Kalam Archive surfaces. Screenshots are an inspection
// aid, never a substitute for behavioural assertions or source fidelity.
import { test, expect } from "@playwright/test";

const locations = [
  { name: "home", url: "/" },
  { name: "basta", url: "/basta/" },
  { name: "basta-page", url: "/basta/138/" },
  { name: "basta-index", url: "/basta/index/" },
  { name: "lyric", url: "/lyrics/aa-asghar-bin-tere/" },
  { name: "recitation-builder", url: "/recite/" },
  { name: "saved", url: "/saved/" },
];
const viewports = [
  { name: "portrait-small", width: 320, height: 700 },
  { name: "portrait", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test("archive layouts remain inside each viewport in both themes", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ colorScheme: viewport.name === "desktop" ? "dark" : "light" });
    for (const location of locations) {
      await page.goto(location.url, { waitUntil: "domcontentloaded" });
      await expect.poll(() => page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: innerWidth,
      })), { message: location.name + " " + viewport.name }).toMatchObject({
        viewport: viewport.width,
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, location.name + " sideways overflow at " + viewport.width).toBeLessThanOrEqual(3);
      if (["home", "basta", "basta-page", "lyric", "recitation-builder"].includes(location.name)
          && ["portrait-small", "landscape", "desktop"].includes(viewport.name)) {
        await page.screenshot({
          path: "test-results/visual-review/" + location.name + "-" + viewport.name + ".png",
          animations: "disabled",
        });
      }
    }
  }
});

test("Basta landing has an unclipped cover and clear reader choices across layouts", async ({ page }) => {
  for (const viewport of [viewports[0], viewports[2], viewports[4]]) {
    await page.setViewportSize(viewport);
    await page.goto("/basta/");
    const cover = page.locator(".basta-home-scan img");
    await expect(cover).toHaveCSS("object-fit", "contain");
    const modes = page.locator(".basta-home-mode-card");
    await expect(modes).toHaveCount(2);
    await expect(modes.first()).toHaveAttribute("href", /\/basta\/\d+\//);
    await expect(modes.nth(1)).toHaveAttribute("href", "/basta/read/");
    const first = await modes.first().boundingBox();
    const next = await modes.nth(1).boundingBox();
    expect(first.width, "reader card width").toBeGreaterThan(160);
    expect(next.width, "continuous card width").toBeGreaterThan(160);
    expect(first.x + first.width).toBeLessThanOrEqual(viewport.width + 3);
    expect(next.x + next.width).toBeLessThanOrEqual(viewport.width + 3);
  }
});

test("compact reader keeps essential page navigation and restores edition controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/read/#page-138");
  const controls = page.locator("[data-reading-controls]");
  await page.evaluate(() => {
    const root = document.querySelector("[data-reading-root]");
    window.scrollTo({top: scrollY + root.getBoundingClientRect().top + 500, behavior: "instant"});
  });
  await expect(controls).toHaveAttribute("data-reader-compact", "true");
  for (const selector of [".reading-page-jump", ".reading-current-page", ".reading-open-page", ".reading-contents-button"]) {
    await expect(controls.locator(selector)).toBeVisible();
  }
  await expect(controls.locator(".reading-view-control")).toBeHidden();
  await controls.locator("[data-reading-regular-toggle]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
});

test("printed verses never wrap or overflow reading columns", async ({ page }) => {
  for (const viewport of [viewports[0], viewports[1], viewports[2], viewports[4]]) {
    await page.setViewportSize(viewport);
    for (const url of ["/lyrics/aa-asghar-bin-tere/", "/basta/138/"]) {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const lines = page.locator(".lyric-verse, .basta-verse-poetry");
      const bad = await lines.evaluateAll((items) => items.filter(el => {
        const css = getComputedStyle(el);
        return el.clientWidth > 0 && (css.whiteSpace !== "nowrap" || el.scrollWidth > el.clientWidth + 2);
      }).length);
      expect(bad, "verse clipping/wrapping in " + url + " at " + viewport.width).toBe(0);
    }
  }
});
