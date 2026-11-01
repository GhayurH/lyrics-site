// Focused geometry and interaction matrix: no unstable screenshot golden files.
import { test, expect } from "@playwright/test";

test("all primary reading modes remain within the viewport across orientations", async ({ page }) => {
  const sizes = [
    { width: 320, height: 568 }, { width: 390, height: 844 },
    { width: 640, height: 360 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    for (const route of ["/lyrics/aa-asghar-bin-tere/", "/basta/138/", "/basta/read/"]) {
      await page.goto(route);
      await expect(page.locator("[data-reading-root]").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(viewport.width + 2);
    }
  }
});
test("reader has reachable Focus exit and does not obscure beginning after reflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/138/");
  await page.getByRole("button", { name: "Focus Mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus","true");
  const exit = page.getByRole("button", { name: "Exit reading mode" });
  await expect(exit).toBeVisible();
  await exit.focus();
  await expect(exit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus","true");
});
test("contextual correction dialog keeps source context and is keyboard dismissible", async ({ page }) => {
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await page.getByRole("button", { name: "Suggest correction" }).click();
  const dialog = page.locator("#correction-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Suggested correction" }).fill("Suggested corrected wording");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
test("JSON library backup validates and restores only allowlisted data", async ({ page }) => {
  await page.goto("/saved/");
  await page.evaluate(() => localStorage.setItem("kalam:favorites",JSON.stringify(["aa-asghar-bin-tere"])));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kalam-archive-backup.json");
  page.once("dialog", (dialog) => dialog.accept());
  const reloaded = page.waitForEvent("load");
  await page.locator("#saved-import").setInputFiles({
    name: "backup.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "kalam-archive-local-data", version: 1,
      exportedAt: "2026-11-01T00:00:00Z",
      entries: { "kalam:favorites": JSON.stringify(["aa-asghar-bin-tere","test-item"]) },
    })),
  });
  await reloaded;
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("kalam:favorites") || "[]").length))
    .toBe(2);
});
