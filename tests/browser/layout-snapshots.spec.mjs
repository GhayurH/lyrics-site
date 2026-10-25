import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const cases = [
  { name: "lyric-portrait", path: "/lyrics/aa-asghar-bin-tere/", width: 390, height: 844 },
  { name: "lyric-landscape", path: "/lyrics/aa-asghar-bin-tere/", width: 844, height: 390 },
  { name: "basta-page-portrait", path: "/basta/138/", width: 390, height: 844 },
  { name: "basta-page-landscape", path: "/basta/138/", width: 844, height: 390 },
  { name: "basta-page-desktop", path: "/basta/138/", width: 1440, height: 900 },
  { name: "continuous-portrait", path: "/basta/read/#page-138", width: 390, height: 844 },
  { name: "continuous-landscape", path: "/basta/read/#page-138", width: 844, height: 390 },
  { name: "index-mobile", path: "/basta/index/", width: 390, height: 844 },
];
test("generate a visual review matrix across readers and viewports", async ({ page }) => {
  await mkdir("test-results/reader-snapshots", { recursive: true });
  for (const entry of cases) {
    await page.setViewportSize({ width: entry.width, height: entry.height });
    await page.goto(entry.path);
    if (entry.path.includes("/basta/read/")) {
      await expect(page.locator('[data-basta-page="138"]')).toBeAttached({ timeout: 20000 });
    }
    await page.screenshot({ path: `test-results/reader-snapshots/${entry.name}.png`, animations: "disabled" });
  }
});
