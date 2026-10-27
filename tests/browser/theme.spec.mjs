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
  await page.screenshot({ path: "test-results/visual-review/theme-sepia-desktop.png", animations: "disabled" });
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

test("custom applies three colour choices, derives text and remembers them @smoke", async ({ page }) => {
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
  await page.screenshot({ path: "test-results/visual-review/theme-custom-desktop.png", animations: "disabled" });
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
    await page.screenshot({ path: "test-results/visual-review/theme-custom-" + viewport.width + ".png", animations: "disabled" });
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

test("AMOLED uses pure-black page and panels and persists across routes @smoke", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="amoled"]').check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "amoled");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");
  await expect.poll(() => page.locator("#theme-dialog").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
  await page.locator("#theme-dialog-done").click();
  await page.goto("/basta/138/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "amoled");
  await expect.poll(() => page.locator(".basta-page-urdu").evaluate((el) => getComputedStyle(el).color))
    .not.toBe("rgb(0, 0, 0)");
});

test("Custom starts from whichever preset is active, including AMOLED @smoke", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const presets = [
    { name: "light", main: "#f7f7f8", secondary: "#ffffff", accent: "#1d1d1f" },
    { name: "dark", main: "#171719", secondary: "#222225", accent: "#ededed" },
    { name: "sepia", main: "#f4ead6", secondary: "#fbf4e6", accent: "#755238" },
    { name: "amoled", main: "#000000", secondary: "#000000", accent: "#f5f5f5" },
  ];
  for (const preset of presets) {
    await page.locator('#theme-dialog input[value="' + preset.name + '"]').check();
    await page.locator('#theme-dialog input[value="custom"]').check();
    for (const field of ["main", "secondary", "accent"]) {
      await expect(page.locator("#theme-" + field)).toHaveValue(preset[field]);
    }
    // Custom begins from this preset, even after an earlier Custom edit.
    await page.locator("#theme-accent").evaluate((el) => {
      el.value = "#ff00ff";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator("#theme-accent")).toHaveValue("#ff00ff");
    await page.locator("#theme-reset-custom").click();
    await expect(page.locator("#theme-accent")).toHaveValue(preset.accent);
  }
  await page.locator("#theme-dialog-done").click();
  await page.goto("/saved/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "custom");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("#theme-main")).toHaveValue("#000000");
  await expect(page.locator("#theme-secondary")).toHaveValue("#000000");
});

test("appearance offers the succinct Custom label, not Build your own", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const radio = page.locator('#theme-dialog input[value="custom"]');
  await expect(radio.locator("..")).toContainText("Custom");
  await expect(page.locator("#theme-dialog")).not.toContainText("Build your own");
});

test("Advanced colours default to Auto and save independent text and border overrides @smoke", async ({ page }) => {
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

test("manual low-contrast text is warned about, and Advanced fits narrow viewports @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/basta/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="light"]').check();
  await page.locator('#theme-dialog input[value="custom"]').check();
  await page.locator("#theme-advanced summary").click();
  await page.locator("#theme-primaryText-auto").uncheck();
  await page.locator("#theme-primaryText").evaluate((input) => {
    input.value = "#ffffff";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#theme-contrast-note")).toBeVisible();
  await expect(page.locator("#theme-contrast-note")).toContainText("readable text");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).color))
    .toBe("rgb(255, 255, 255)");
  // A poor manual foreground must not make the settings or its warning illegible.
  await expect.poll(() => page.locator("#theme-dialog-heading")
    .evaluate((el) => getComputedStyle(el).color)).toBe("rgb(23, 23, 25)");
  await expect.poll(() => page.locator("#theme-contrast-note")
    .evaluate((el) => getComputedStyle(el).color)).toBe("rgb(23, 23, 25)");
  const dialog = await page.locator("#theme-dialog").boundingBox();
  expect(dialog).toBeTruthy();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(322);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: "test-results/visual-review/theme-advanced-phone.png", animations: "disabled" });
  await page.locator("#theme-primaryText-auto").check();
  await expect(page.locator("#theme-contrast-note")).toBeHidden();
});
