// Appearance remains browser-local and works across every archive route.
import { test, expect } from "@playwright/test";


test("Auto follows device changes, and restoring each submenu leaves the other intact", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "light");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator('input[name="theme-mode"][value="dark"]').check();
  await dialog.getByRole("tab", { name: "Fonts" }).click();
  await dialog.locator("#theme-urdu-font").selectOption("lateef");
  await dialog.locator("#theme-roman-font").selectOption("lora");
  await dialog.locator("#theme-fonts-default").click();
  await expect(dialog.locator("#theme-urdu-font")).toHaveValue("nastaliq");
  await expect(dialog.locator("#theme-roman-font")).toHaveValue("sans");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kalam:reading-fonts"))).toBeNull();
  await dialog.locator("#theme-urdu-font").selectOption("amiri");
  await dialog.getByRole("tab", { name: "Colors" }).click();
  await dialog.locator("#theme-colors-default").click();
  await expect(dialog.locator('input[name="theme-mode"][value="auto"]')).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "amiri");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#171719");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(23, 23, 25)");
  await page.locator("#theme-dialog-done").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "amiri");
});

test("My Custom is preserved on preset changes and copying a preset is explicit", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator('input[value="sepia"]').check();
  await dialog.locator('input[value="custom"]').check();
  await dialog.locator("#theme-accent").evaluate((el) => {
    el.value = "#123456";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(dialog.locator("#theme-contrast-button")).toContainText("Button text:");
  await expect(dialog.locator("#theme-contrast-primary")).toContainText("Main text:");
  await dialog.locator('input[value="dark"]').check();
  await dialog.locator('input[value="custom"]').check();
  await expect(dialog.locator("#theme-accent")).toHaveValue("#123456");
  await expect(dialog.locator("#theme-main")).toHaveValue("#f4ead6");
  await dialog.locator('input[value="dark"]').check();
  await dialog.locator("#theme-edit-current").click();
  await expect(dialog.locator("#theme-main")).toHaveValue("#171719");
  await expect(dialog.locator("#theme-accent")).toHaveValue("#ededed");
  await dialog.locator("#theme-colors-default").click();
  await expect(dialog.locator('input[value="auto"]')).toBeChecked();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kalam:custom-theme"))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kalam:custom-theme-base"))).toBeNull();
});

test("selected theme persists across navigation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="sepia"]').check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await page.locator("#theme-dialog-done").click();
  await page.goto("/basta/138/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
});

test("custom applies three colour choices, derives text and remembers them", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await expect(dialog.locator('input[value="custom"]').locator("..")).toContainText("Custom");
  await expect(dialog).not.toContainText("Build your own");
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
  // This session started Custom from the current Light preset.
  await expect(page.locator("#theme-main")).toHaveValue("#f7f7f8");
  await expect(page.locator("#theme-secondary")).toHaveValue("#ffffff");
  await expect(page.locator("#theme-accent")).toHaveValue("#1d1d1f");
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

test("invalid persisted Custom colours cannot inject CSS", async ({ page }) => {
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

test("advanced Custom overrides persist and can return to Auto", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator('input[value="custom"]').check();
  await dialog.locator("#theme-advanced summary").click();

  for (const [name, hex] of [["primaryText", "#112233"], ["borders", "#8899aa"]]) {
    await expect(dialog.locator("#theme-" + name + "-auto")).toBeChecked();
    await dialog.locator("#theme-" + name + "-auto").uncheck();
    await dialog.locator("#theme-" + name).evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, hex);
    await expect(dialog.locator("#theme-" + name)).toHaveValue(hex);
  }
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color))
    .toBe("rgb(17, 34, 51)");
  await dialog.locator("#theme-dialog-done").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await page.locator("#theme-toggle").click();
  await dialog.locator("#theme-advanced summary").click();
  await expect(dialog.locator("#theme-primaryText")).toHaveValue("#112233");
  await expect(dialog.locator("#theme-borders")).toHaveValue("#8899aa");
  await dialog.locator("#theme-primaryText-auto").check();
  await expect(dialog.locator("#theme-primaryText")).toBeDisabled();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("kalam:custom-theme")))).not.toHaveProperty("primaryText");
});

test("Urdu and Roman font choices persist after reload", async ({ page }) => {
  await page.goto("/lyrics/na-bhool-kar-bhi/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator("#theme-fonts-tab").click();
  await dialog.locator("#theme-roman-font").selectOption("lora");
  await dialog.locator("#theme-urdu-font").selectOption("lateef");
  await expect(page.locator("html")).toHaveAttribute("data-roman-font", "lora");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "lateef");
  await dialog.locator("#theme-dialog-done").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-roman-font", "lora");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "lateef");
});
