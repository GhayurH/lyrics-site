import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const cases = [
  { name: "lyric-portrait", path: "/lyrics/aa-asghar-bin-tere/", width: 390, height: 844 },
  { name: "lyric-landscape", path: "/lyrics/aa-asghar-bin-tere/", width: 844, height: 390 },
  { name: "basta-page-portrait", path: "/basta/138/", width: 390, height: 844 },
  { name: "basta-page-landscape", path: "/basta/138/", width: 844, height: 390 },
  { name: "basta-page-desktop", path: "/basta/138/", width: 1440, height: 900, image: true },
  { name: "lyric-image-desktop", path: "/lyrics/aa-asghar-bin-tere/", width: 1440, height: 900, image: true },
  { name: "continuous-portrait", path: "/basta/read/#page-138", width: 390, height: 844 },
  { name: "continuous-landscape", path: "/basta/read/#page-138", width: 844, height: 390 },
  { name: "index-mobile", path: "/basta/index/", width: 390, height: 844 },
];
test("generate a visual review matrix across readers and viewports", async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir("test-results/reader-snapshots", { recursive: true });
  // Use the real R2-backed source imagery in screenshot reviews, not local 404 placeholders.
  await page.route("**/images/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.continue();
    try {
      const response = await route.fetch({ url: `https://kalamarchive.com${url.pathname}`, timeout: 20000 });
      await route.fulfill({ response });
    } catch {
      await route.abort("failed");
    }
  });
  for (const entry of cases) {
    await page.setViewportSize({ width: entry.width, height: entry.height });
    await page.goto(entry.path, { waitUntil: "domcontentloaded" });
    if (entry.path.includes("/basta/read/")) {
      await expect(page.locator('[data-basta-page="138"]')).toBeAttached({ timeout: 20000 });
    }
    if (entry.image) {
      await page.locator('[data-reading-column][value="image"]').check();
      if (test.info().project.name === "chromium") {
        await expect.poll(() => page.locator(".basta-original-page img, .lyric-reading-image img").first()
          .evaluate((img) => img.naturalWidth), { timeout: 15000 }).toBeGreaterThan(0);
      }
    }
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `test-results/reader-snapshots/${entry.name}.png`, animations: "disabled" });
    // Chromium uses committed golden references; other engines retain review screenshots.
    if (test.info().project.name === "chromium") {
      await expect(page).toHaveScreenshot(`${entry.name}.png`, {
        animations: "disabled", maxDiffPixelRatio: 0.02,
      });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 4)).toBe(true);
  }
});
