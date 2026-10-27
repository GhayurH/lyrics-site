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
// Other reader tests cover 390px and tablet widths. This matrix is the
// broader cross-route overflow check and a small screenshot sample.
const viewports = [
  { name: "portrait-small", width: 320, height: 700 },
  { name: "landscape", width: 844, height: 390 },
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
      if (["home", "basta-page", "recitation-builder"].includes(location.name)) {
        await page.screenshot({
          path: "test-results/visual-review/" + location.name + "-" + viewport.name + ".png",
          animations: "disabled",
        });
      }
    }
  }
});

test("Basta landing has an unclipped cover and clear reader choices across layouts", async ({ page }) => {
  for (const viewport of viewports) {
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

test("an empty programme order card does not stretch to the title form", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto("/recite/");
  const detail = await page.locator(".recite-details").boundingBox();
  const order = await page.locator(".recite-programme").boundingBox();
  expect(detail.height).toBeGreaterThan(0);
  expect(order.height).toBeLessThan(detail.height);
  await expect(page.locator("#recite-empty")).toBeVisible();
});

test("recitation uses the shared 46rem stacking boundary for its column divider", async ({ page }) => {
  // Stable text fixture keeps this geometry test independent of R2 scans and
  // local draft state; the container width, not a viewport-specific 40rem rule,
  // must determine whether the separator is vertical or horizontal.
  const id = "0123456789abcdef01234567";
  await page.route("**/api/recitation-sets/" + id, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({
      id, set: { version: 1, title: "Column breakpoint", occasion: "", description: "",
        items: [{ uid: "391002ab-16f4-4535-bf2a-8ca02cefc956",
          kind: "lyric", id: "aa-asghar-bin-tere", sourceTitle: "Two editions" }] }
    }) }));
  await page.route("**/data/recitation-lyrics/aa-asghar-bin-tere.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({
      lyric: { id: "aa-asghar-bin-tere", title: "Two editions",
        urdu: "سلام", roman: "Salaam", lang: "ur", direction: "rtl" }
    }) }));
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/recite/read/?set=" + id);
  const roman = page.locator(".recite-editions .lyric-reading-roman").first();
  await expect(roman).toBeVisible();
  await expect.poll(() => roman.evaluate((el) => getComputedStyle(el).borderInlineEndWidth)).toBe("0px");
  await expect.poll(() => roman.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("1px");
  await page.setViewportSize({ width: 1120, height: 900 });
  await expect.poll(() => roman.evaluate((el) => getComputedStyle(el).borderInlineEndWidth)).toBe("1px");
  await expect.poll(() => roman.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
});
