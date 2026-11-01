// Appearance remains browser-local and works across every archive route.
import { test, expect } from "@playwright/test";


test("appearance tabs, grouped fonts, and enlarged swatches work on narrow screens", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/lyrics/na-bhool-kar-bhi/");
    await page.locator("#theme-toggle").click();
    const dialog = page.locator("#theme-dialog");
    await expect(dialog.getByRole("tab", { name: "Colors" })).toHaveAttribute("aria-selected", "true");
    await expect(dialog.locator("#theme-colors-panel")).toBeVisible();
    await expect(dialog.locator("#theme-fonts-panel")).toBeHidden();
    await expect(dialog.locator("#theme-current-name")).toHaveText("Auto (device)");
    await expect(dialog.locator(".theme-preset-collection").first()).not.toHaveAttribute("open", "");
    const swatch = await dialog.locator('[data-preset-swatch="sepia"]').boundingBox();
    expect(swatch.width).toBeGreaterThan(70);
    expect(swatch.height).toBeGreaterThan(40);
    await dialog.getByRole("tab", { name: "Colors" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("tab", { name: "Fonts" })).toBeFocused();
    await expect(dialog.locator("#theme-fonts-panel")).toBeVisible();
    await expect(dialog.locator("#theme-colors-panel")).toBeHidden();
    await expect(dialog.locator("#theme-urdu-font optgroup")).toHaveCount(3);
    await expect(dialog.locator("#theme-urdu-preview")).toHaveText("یہ ایک نمونہ ہے");
    await expect(dialog.locator("#theme-roman-preview")).toHaveText("Sample reading text");
    await dialog.locator("#theme-roman-font").selectOption("lora");
    await expect.poll(() => dialog.locator("#theme-roman-preview").evaluate((el) =>
      getComputedStyle(el).fontFamily)).toContain("Lora");
    await expect.poll(() => page.locator(".site-title").evaluate((el) =>
      getComputedStyle(el).fontFamily)).not.toContain("Lora");
    await dialog.locator("#theme-fonts-default").click();
    const dimensions = await dialog.boundingBox();
    expect(dimensions.x).toBeGreaterThanOrEqual(0);
    expect(dimensions.x + dimensions.width).toBeLessThanOrEqual(viewport.width + 1);
    await expect(dialog.getByText("Changes save automatically")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("#theme-toggle")).toBeFocused();
  }
});

test("Auto follows device changes, and restoring each submenu leaves the other intact @smoke", async ({ page }) => {
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

test("curated palette switching, Custom inheritance and persistence", async ({ page }) => {
  const names = ["paper", "clay", "rosewood", "sage", "ocean", "slate", "dusk", "forest", "plum", "graphite"];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await page.locator("#theme-toggle").click();
  const dialog = page.locator("#theme-dialog");
  for (const name of names) {
    const group = ["dusk", "forest", "plum", "graphite"].includes(name) ? "Dark reading" : "Light reading";
    const disclosure = dialog.locator('details[data-theme-collection="' + group + '"]');
    if (!(await disclosure.evaluate((node) => node.open))) await disclosure.locator("summary").click();
    await dialog.locator('input[name="theme-mode"][value="' + name + '"]').check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", name);
    const colors = await page.locator("html").evaluate((root) => {
      const style = getComputedStyle(root);
      const read = (role) => style.getPropertyValue(role).trim().toLowerCase();
      return {
        main: read("--site-background"), secondary: read("--surface-background"),
        accent: read("--accent-color"), primaryText: read("--primary-text"),
        mutedText: read("--secondary-text"), borders: read("--border-colour"),
        searchScheme: root.dataset.pfTheme,
      };
    });
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", colors.main);
    expect(colors.searchScheme).toBe(["dusk", "forest", "plum", "graphite"].includes(name) ? "dark" : "light");
    await dialog.locator("#theme-edit-current").click();
    for (const role of ["main", "secondary", "accent", "primaryText", "mutedText", "borders"])
      await expect(dialog.locator("#theme-" + role)).toHaveValue(colors[role]);
  }
  await dialog.locator('input[name="theme-mode"][value="forest"]').check();
  await page.locator("#theme-dialog-done").click();
  await page.goto("/search/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "dark");
  await expect.poll(() => page.locator(".search-page").evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--pf-background").trim())).toBe("#1e3832");
});

test("light, dark and sepia presets persist between pages", async ({ page }) => {
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

test("AMOLED uses pure-black page and panels and persists across routes", async ({ page }) => {
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

test("Start Custom explicitly copies each preset, including AMOLED", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const presets = [
    { name: "light", main: "#f7f7f8", secondary: "#ffffff", accent: "#1d1d1f", primary: "#1d1d1f", muted: "#66666b", borders: "#dddddf" },
    { name: "dark", main: "#171719", secondary: "#222225", accent: "#ededed", primary: "#ededed", muted: "#b5b5ba", borders: "#3a3a3f" },
    { name: "sepia", main: "#f4ead6", secondary: "#fbf4e6", accent: "#755238", primary: "#352b21", muted: "#6b5947", borders: "#d5c4a8" },
    { name: "amoled", main: "#000000", secondary: "#000000", accent: "#f5f5f5", primary: "#f5f5f5", muted: "#b5b5b5", borders: "#333333" },
  ];
  for (const preset of presets) {
    await page.locator('#theme-dialog input[value="' + preset.name + '"]').check();
    await page.locator("#theme-edit-current").click();
    for (const field of ["main", "secondary", "accent"]) {
      await expect(page.locator("#theme-" + field)).toHaveValue(preset[field]);
    }
    for (const [field, value] of [["primaryText", preset.primary], ["mutedText", preset.muted], ["borders", preset.borders]]) {
      await expect(page.locator("#theme-" + field + "-auto")).toBeChecked();
      await expect(page.locator("#theme-" + field)).toHaveValue(value);
    }
    const roles = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const expand = (value) => {
        const hex = value.trim().toLowerCase();
        return /^#[0-9a-f]{3}$/.test(hex)
          ? "#" + [...hex.slice(1)].map((digit) => digit + digit).join("") : hex;
      };
      return {
        primary: expand(css.getPropertyValue("--primary-text")),
        muted: expand(css.getPropertyValue("--secondary-text")),
        borders: expand(css.getPropertyValue("--border-colour")),
      };
    });
    expect(roles).toEqual({ primary: preset.primary, muted: preset.muted, borders: preset.borders });
    // Explicitly creating Custom from a preset replaces the previous Custom base.
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
  for (const [role, hex] of [["primaryText", "#f5f5f5"], ["mutedText", "#b5b5b5"], ["borders", "#333333"]]) {
    await expect(page.locator("#theme-" + role + "-auto")).toBeChecked();
    await expect(page.locator("#theme-" + role)).toHaveValue(hex);
  }
});

test("Dark and AMOLED preserve Auto typography until Custom surfaces actually change", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  for (const [name, ink] of [["dark", "#ededed"], ["amoled", "#f5f5f5"]]) {
    await page.locator('#theme-dialog input[value="' + name + '"]').check();
    await page.locator("#theme-edit-current").click();
    // The Advanced section is hidden until Custom is selected. Open it only
    // once, retaining its expanded state when moving between presets.
    const advanced = page.locator("#theme-advanced");
    if (!(await advanced.evaluate((el) => el.open))) await advanced.locator("summary").click();
    await expect(page.locator("#theme-primaryText-auto")).toBeChecked();
    await expect(page.locator("#theme-primaryText")).toHaveValue(ink);
    // Manual changes must not overwrite the borrowed preset Auto colour.
    await page.locator("#theme-primaryText-auto").uncheck();
    await page.locator("#theme-primaryText").evaluate((el) => {
      el.value = "#ababab";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#theme-primaryText-auto").check();
    await expect(page.locator("#theme-primaryText")).toHaveValue(ink);

    await page.locator("#theme-main").evaluate((el) => {
      el.value = "#fefefe";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Changing a background invalidates the borrowed preset Auto text,
    // so it recalculates rather than leaving light ink on a light page.
    await expect(page.locator("#theme-primaryText")).not.toHaveValue(ink);
    await page.locator("#theme-reset-custom").click();
    await expect(page.locator("#theme-primaryText")).toHaveValue(ink);
  }
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

test("manual low-contrast text is warned about, and Advanced fits narrow viewports", async ({ page }) => {
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
  // Auto muted and borders must remain legible despite manually choosing white
  // main text on a near-white page.
  await expect(page.locator("#theme-mutedText-auto")).toBeChecked();
  await expect(page.locator("#theme-borders-auto")).toBeChecked();
  await expect(page.locator("#theme-mutedText-value")).not.toHaveText("#FFFFFF");
  await expect(page.locator("#theme-borders-value")).not.toHaveText("#F9F9FA");
  const dialog = await page.locator("#theme-dialog").boundingBox();
  expect(dialog).toBeTruthy();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(322);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  await page.locator("#theme-primaryText-auto").check();
  await expect(page.locator("#theme-contrast-note")).toBeHidden();
});

test("new language fonts select and persist across pages without altering colours @smoke", async ({ page }) => {
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

test("Urdu font families are available as bundled web fonts", async ({ page }) => {
  await page.goto("/lyrics/na-bhool-kar-bhi/");
  await page.locator("#theme-toggle").click();
  await page.locator("#theme-fonts-tab").click();
  const selector = page.locator("#theme-urdu-font");
  for (const [option, family] of [
    ["gulzar", "Gulzar"],
    ["scheherazade", "Scheherazade New"],
    ["amiri", "Amiri"],
    ["markazi", "Markazi Text"],
    ["noto-sans-arabic", "Noto Sans Arabic"],
    ["beaconhouse", "Beaconhouse Nastaliq"],
  ]) {
    await selector.selectOption(option);
    await expect(page.locator("html")).toHaveAttribute("data-urdu-font", option);
    await expect.poll(() => page.locator(".lyrics-text").first().evaluate((node) =>
      getComputedStyle(node).fontFamily)).toContain(family);
    const hasLoadedFace = await page.evaluate(async (fontFamily) => {
      const faces = await document.fonts.load('400 24px "' + fontFamily + '"', "غزل اردو شاعری");
      return faces.some((face) => face.family === fontFamily && face.status === "loaded");
    }, family);
    expect(hasLoadedFace, family + " should be bundled and loaded").toBe(true);
  }
  await page.locator("#theme-dialog-done").click();
  await page.goto("/basta/138/");
  await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "beaconhouse");
  await expect.poll(() => page.locator(".basta-urdu-text").first().evaluate((node) =>
    getComputedStyle(node).fontFamily)).toContain("Beaconhouse Nastaliq");
});

test("switching Urdu fonts optically resizes every reading surface and keeps verses single-line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  for (const [url, panel, verse] of [
    ["/lyrics/chhane-lagi-shaam-e-ghareeban/", ".lyric-reading-urdu", ".lyric-reading-urdu .lyric-verse"],
    ["/basta/138/", ".basta-page-urdu .basta-urdu-text", ".basta-page-urdu .basta-verse-poetry"],
  ]) {
    await page.goto(url);
    // Start each reader at the default instead of inheriting the previous loop's choice.
    await page.evaluate(() => localStorage.removeItem("kalam:reading-fonts"));
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    const before = await page.locator(panel).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    await page.locator("#theme-toggle").click();
    await page.locator("#theme-dialog").getByRole("tab", { name: "Fonts" }).click();
    await page.locator("#theme-urdu-font").selectOption("naskh");
    await expect(page.locator("html")).toHaveAttribute("data-urdu-font", "naskh");
    await expect.poll(() => page.locator(panel).first().evaluate(el =>
      parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(before * 1.2);
    await page.locator("#theme-dialog-done").click();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator(verse).evaluateAll(lines =>
      lines.filter(line => line.clientWidth && (line.scrollWidth > line.clientWidth + 2 ||
        getComputedStyle(line).whiteSpace !== "nowrap")).length)).toBe(0);
  }
});
