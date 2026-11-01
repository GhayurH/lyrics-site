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

test("light, dark and sepia presets persist between pages @smoke", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "auto");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "dark");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[value="sepia"]').check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4ead6");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "light");
  await page.locator("#theme-dialog-done").click();
  await page.goto("/search/");
  await expect.poll(() => page.locator(".search-page").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--pf-background").trim())).toBe("#fbf4e6");
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

test("Advanced colours default to Auto and save independent text and border overrides", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="light"]').check();
  await page.locator('#theme-dialog input[value="custom"]').check();
  const advanced = page.locator("#theme-advanced");
  await expect(advanced).not.toHaveAttribute("open", "");
  await advanced.locator("summary").click();
  await expect(advanced).toHaveAttribute("open", "");
  const automaticPrimary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary-text").trim());
  const automaticMuted = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--secondary-text").trim());
  expect(automaticMuted).not.toEqual(automaticPrimary);

  const overrides = { primaryText: "#112233", mutedText: "#455667", borders: "#8899aa" };
  for (const [name, hex] of Object.entries(overrides)) {
    await expect(page.locator("#theme-" + name + "-auto")).toBeChecked();
    await expect(page.locator("#theme-" + name)).toBeDisabled();
    await page.locator("#theme-" + name + "-auto").uncheck();
    await expect(page.locator("#theme-" + name)).toBeEnabled();
    await page.locator("#theme-" + name).evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, hex);
    await expect(page.locator("#theme-" + name + "-value")).toHaveText(hex.toUpperCase());
  }
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color))
    .toBe("rgb(17, 34, 51)");
  await expect.poll(() => page.locator(".site-footer-about p").evaluate((el) => getComputedStyle(el).color))
    .toBe("rgb(69, 86, 103)");
  await expect.poll(() => page.locator(".site-footer").evaluate((el) => getComputedStyle(el).borderTopColor))
    .toBe("rgb(136, 153, 170)");
  await expect(page.locator("#theme-contrast-note")).toBeHidden();
  // Accent button text remains automatically contrasting even with manual typography.
  await expect.poll(() => page.locator("#theme-dialog-done")
    .evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
  await page.locator("#theme-dialog-done").click();

  await page.goto("/saved/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color))
    .toBe("rgb(17, 34, 51)");
  await page.locator("#theme-toggle").click();
  await page.locator("#theme-advanced summary").click();
  for (const [name, hex] of Object.entries(overrides)) {
    await expect(page.locator("#theme-" + name + "-auto")).not.toBeChecked();
    await expect(page.locator("#theme-" + name)).toHaveValue(hex);
  }
  await page.locator("#theme-mutedText-auto").check();
  await expect(page.locator("#theme-mutedText")).toBeDisabled();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("kalam:custom-theme")))).not.toHaveProperty("mutedText");
  await page.locator("#theme-reset-custom").click();
  for (const name of Object.keys(overrides)) {
    await expect(page.locator("#theme-" + name + "-auto")).toBeChecked();
  }
  await expect(page.locator("#theme-main")).toHaveValue("#f7f7f8");
});

test("new language fonts select and persist across pages without altering colours", async ({ page }) => {
  await page.goto("/lyrics/na-bhool-kar-bhi/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  await dialog.locator("#theme-fonts-tab").click();
  const verse = await page.locator(".lyric-reading-roman .roman-lyrics-text .lyric-verse").first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.textAlign, style.textAlignLast, style.whiteSpace];
    });
  expect(verse).toEqual(["justify", "justify", "nowrap"]);
  const urduPicker = dialog.locator("#theme-urdu-font");
  const romanPicker = dialog.locator("#theme-roman-font");
  for (const [value, family] of [
    ["open-sans", "Open Sans"], ["source-sans", "Source Sans 3"],
    ["lora", "Lora"], ["merriweather", "Merriweather"],
  ]) {
    await romanPicker.selectOption(value);
    await expect.poll(() => page.locator(".roman-lyrics-text").evaluate((node) =>
      getComputedStyle(node).fontFamily)).toContain(family);
    await expect.poll(() => page.evaluate((family) =>
      document.fonts.check('400 20px "' + family + '"', "A poem in Roman Urdu"), family)).toBe(true);
  }
  await urduPicker.selectOption("lateef");
  await expect.poll(() => page.locator(".lyrics-text").evaluate((node) =>
    getComputedStyle(node).fontFamily)).toContain("Lateef");
  await expect.poll(() => page.evaluate(() =>
    document.fonts.check('400 20px "Lateef"', "اردو"))).toBe(true);
  await urduPicker.selectOption("alvi");
  await expect.poll(() => page.locator(".lyrics-text").evaluate((node) =>
    getComputedStyle(node).fontFamily)).toContain("Alvi Nastaleeq");
  await expect.poll(() => page.locator(".lyrics-text").evaluate((node) =>
    getComputedStyle(node).fontFamily)).toContain("Noto Nastaliq Urdu");
  await page.locator("#theme-dialog-done").click();
  await page.goto("/basta/138/");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "alvi");
  await expect(page.locator("html")).toHaveAttribute("data-roman-font", "merriweather");
  await page.locator("#theme-toggle").click();
  await expect(dialog.locator("#theme-urdu-font")).toHaveValue("alvi");
  await expect(dialog.locator("#theme-roman-font")).toHaveValue("merriweather");
});
