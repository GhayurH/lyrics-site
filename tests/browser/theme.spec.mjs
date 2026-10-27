// Appearance remains browser-local and works across every archive route.
import { test, expect } from "@playwright/test";

test("light, dark and sepia presets persist between pages @smoke", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[value="sepia"]').check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4ead6");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "light");
  await page.locator("#theme-dialog-done").click();
  await page.goto("/basta/138/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await page.locator("#theme-toggle").click();
  await expect(dialog.locator('input[value="sepia"]')).toBeChecked();
  await dialog.locator('input[value="light"]').check();
  await page.locator("#theme-dialog-done").click();
  await page.goto("/search/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#theme-toggle").click();
  await dialog.locator('input[value="dark"]').check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("build your own applies three colour choices, derives text and remembers them @smoke", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator('input[value="custom"]').check();
  await expect(page.locator("#theme-custom-fields")).toBeVisible();
  const palette = { main: "#102030", secondary: "#172637", accent: "#ffd166" };
  for (const [name, hex] of Object.entries(palette)) {
    await page.locator("#theme-" + name).evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, hex);
    await expect(page.locator("#theme-" + name + "-value")).toHaveText(hex.toUpperCase());
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(16, 32, 48)");
  await expect.poll(() => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--button-background").trim())).toBe("#ffd166");
  await expect(page.locator("#theme-contrast-note")).toBeHidden();
  await page.locator("#theme-dialog-done").click();
  await page.goto("/saved/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await page.locator("#theme-toggle").click();
  for (const [name, hex] of Object.entries(palette)) {
    await expect(page.locator("#theme-" + name)).toHaveValue(hex);
  }
  await page.locator("#theme-reset-custom").click();
  await expect(page.locator("#theme-main")).toHaveValue("#f4ead6");
  await expect(page.locator("#theme-accent")).toHaveValue("#755238");
});

test("unreadable main and secondary combinations show actionable contrast guidance", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="custom"]').check();
  for (const [name, hex] of [["main", "#000000"], ["secondary", "#ffffff"]]) {
    await page.locator("#theme-" + name).evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, hex);
  }
  await expect(page.locator("#theme-contrast-note")).toBeVisible();
  await expect(page.locator("#theme-contrast-note")).toContainText("readable text");
  await page.locator("#theme-reset-custom").click();
  await expect(page.locator("#theme-contrast-note")).toBeHidden();
});

test("dialog stays in the viewport and Escape closes it on small phones and landscape @smoke", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 700 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/basta/");
    await page.locator("#theme-toggle").click();
    const dialog = page.locator("#theme-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[value="custom"]').check();
    const rect = await dialog.boundingBox();
    expect(rect).toBeTruthy();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 2);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 2);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("#theme-toggle")).toBeFocused();
  }
});

test("old saved light/dark themes work and invalid palettes never inject CSS", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "custom");
    localStorage.setItem("kalam:custom-theme", JSON.stringify({
      main: "red; color: transparent", secondary: "#bad", accent: "#abcdef",
    }));
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(244, 234, 214)");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("#theme-main")).toHaveValue("#f4ead6");
  await expect(page.locator("#theme-secondary")).toHaveValue("#fbf4e6");
  await expect(page.locator("#theme-accent")).toHaveValue("#abcdef");
});
