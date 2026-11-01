// File role: Appearance tabs, color and font preferences, previews, and independent resets.
import {
  applyTheme, DEFAULT_PALETTE, PALETTE_KEY, PALETTE_BASE_KEY, readCustomPalette,
  readCustomPaletteBase, readTheme, normalizeCssHex, paletteTextColors,
  paletteContrastScores, PRESET_THEME_GROUPS,
  type AdvancedColor, type CustomPalette, type ThemeName,
} from "./theme";
import { applyFontPreferences, DEFAULT_FONTS, FONT_STORAGE_KEY, parseFontPreferences, readFontPreferences, type FontPreferences } from "./fonts";

/** One compact toolbar icon opens preset and custom appearance controls. */
export function initAppearance(): void {
  const trigger = document.querySelector<HTMLButtonElement>("#theme-toggle");
  const dialog = document.querySelector<HTMLDialogElement>("#theme-dialog");
  const fields = dialog?.querySelector<HTMLFieldSetElement>("#theme-custom-fields");
  const note = dialog?.querySelector<HTMLElement>("#theme-contrast-note");
  if (!trigger || !dialog || !fields || !note) return;

  type AppearanceTab = "colors" | "fonts";
  let activeTab: AppearanceTab = "colors";
  const switchTab = (tab: AppearanceTab, focus = false) => {
    activeTab = tab;
    for (const name of ["colors", "fonts"] as const) {
      const control = dialog.querySelector<HTMLButtonElement>("#theme-" + name + "-tab");
      const panel = dialog.querySelector<HTMLElement>("#theme-" + name + "-panel");
      const active = name === tab;
      if (control) {
        control.setAttribute("aria-selected", String(active));
        control.tabIndex = active ? 0 : -1;
        if (focus && active) control.focus();
      }
      if (panel) panel.hidden = !active;
    }
  };
  for (const name of ["colors", "fonts"] as const) {
    dialog.querySelector<HTMLButtonElement>("#theme-" + name + "-tab")?.addEventListener("click", () => switchTab(name));
  }
  dialog.querySelector<HTMLElement>(".theme-pref-tabs")?.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "colors" : event.key === "End" ? "fonts"
      : activeTab === "colors" ? "fonts" : "colors";
    switchTab(next, true);
  });

  let fonts: FontPreferences = readFontPreferences();
  let selected: ThemeName = readTheme();
  let palette: CustomPalette = readCustomPalette();
  let startingPalette: CustomPalette = readCustomPaletteBase();
  const colorNames = ["main", "secondary", "accent"] as const;
  const advancedRoles: Record<AdvancedColor, "primary" | "muted" | "borders"> = {
    primaryText: "primary", mutedText: "muted", borders: "borders",
  };
  const advancedNames = Object.keys(advancedRoles) as AdvancedColor[];

  // Read the actual preset tokens rather than duplicating their colours in TS.
  // The previous preset is still active when the user clicks Custom.
  const paletteFromCurrentPreset = (): CustomPalette => {
    const style = getComputedStyle(document.documentElement);
    const read = (property: string, fallback: string) =>
      normalizeCssHex(style.getPropertyValue(property), fallback);
    const main = read("--site-background", DEFAULT_PALETTE.main);
    const secondary = read("--surface-background", DEFAULT_PALETTE.secondary);
    return {
      main, secondary,
      accent: read("--accent-color", DEFAULT_PALETTE.accent),
      inherited: {
        main, secondary,
        primary: read("--primary-text", "#171719"),
        muted: read("--secondary-text", "#66666b"),
        borders: read("--border-colour", "#dddddf"),
      },
    };
  };

  const render = (save: boolean) => {
    const ratio = applyTheme(selected, palette, save);
    applyFontPreferences(fonts, false);
    for (const language of ["urdu", "roman"] as const) {
      const select = dialog.querySelector<HTMLSelectElement>("#theme-" + language + "-font");
      if (select) select.value = fonts[language];
    }
    dialog.querySelectorAll<HTMLInputElement>('input[name="theme-mode"]').forEach((input) => {
      input.checked = input.value === selected;
    });
    fields.hidden = selected !== "custom";
    const label = PRESET_THEME_GROUPS.flatMap((group) =>
      group.themes.map((theme) => ({ id: theme.id as string, label: theme.label })))
      .find((item) => item.id === selected)?.label ?? "My Custom theme";
    const current = dialog.querySelector<HTMLElement>("#theme-current-name");
    if (current) current.textContent = label;
    const editCurrent = dialog.querySelector<HTMLButtonElement>("#theme-edit-current");
    if (editCurrent) editCurrent.hidden = selected === "custom";
    for (const group of PRESET_THEME_GROUPS.slice(1)) {
      if (!group.themes.some((item) => item.id === selected)) continue;
      const collection = Array.from(dialog.querySelectorAll<HTMLDetailsElement>("[data-theme-collection]"))
        .find((node) => node.dataset.themeCollection === group.label);
      if (collection) collection.open = true;
    }
    // Keep the saved Custom swatch accurate while viewing another preset.
    const swatch = dialog.querySelector<HTMLElement>('[data-preset-swatch="custom"]');
    if (swatch) {
      const ink = paletteTextColors(palette).primary;
      for (const [role, value] of Object.entries({
        main: palette.main, surface: palette.secondary, ink, accent: palette.accent,
      })) swatch.style.setProperty("--swatch-" + role, value);
    }
    const alviNote = dialog.querySelector<HTMLElement>("#theme-font-install-note");
    if (alviNote) alviNote.hidden = fonts.urdu !== "alvi";
    for (const name of colorNames) {
      const input = dialog.querySelector<HTMLInputElement>("#theme-" + name);
      const output = dialog.querySelector<HTMLOutputElement>("#theme-" + name + "-value");
      if (input) input.value = palette[name];
      if (output) output.textContent = palette[name].toUpperCase();
    }
    const automatic = paletteTextColors({
      ...palette, primaryText: undefined, mutedText: undefined, borders: undefined,
    });
    for (const name of advancedNames) {
      const automaticControl = dialog.querySelector<HTMLInputElement>("#theme-" + name + "-auto");
      const picker = dialog.querySelector<HTMLInputElement>("#theme-" + name);
      const output = dialog.querySelector<HTMLOutputElement>("#theme-" + name + "-value");
      const isAutomatic = !palette[name];
      const value = palette[name] ?? automatic[advancedRoles[name]];
      if (automaticControl) automaticControl.checked = isAutomatic;
      if (picker) {
        picker.disabled = isAutomatic;
        picker.value = value;
      }
      if (output) output.textContent = value.toUpperCase();
    }
    const scores = paletteContrastScores(palette);
    for (const [role, title] of [["primary", "Main text"], ["muted", "Muted text"], ["button", "Button text"]] as const) {
      const item = dialog.querySelector<HTMLElement>("#theme-contrast-" + role);
      if (!item) continue;
      const value = scores[role];
      item.textContent = title + ": " + value.toFixed(1) + ":1 " + (value >= 4.5 ? "(AA)" : "(Low contrast)");
      item.dataset.lowContrast = String(value < 4.5);
    }
    note.hidden = selected !== "custom" || (ratio >= 4.5 && scores.button >= 4.5);
    note.textContent = note.hidden ? "" :
      (scores.button < 4.5 ? "Button text has low contrast. Choose a darker or lighter accent colour."
        : "For readable text, increase contrast between the text and both backgrounds, or switch text colours to Auto.");
  };

  // The bootstrap already applied the stored theme before paint. Sync UI
  // without turning an automatic device preference into a manual preference.
  render(false);

  trigger.addEventListener("click", () => {
    render(false);
    switchTab(activeTab);
    dialog.showModal();
  });
  dialog.querySelectorAll<HTMLInputElement>('input[name="theme-mode"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const next = input.value as ThemeName;
      if (next === "custom" && selected !== "custom") {
        // Reopening My Custom never destroys an existing saved palette.
        let hasSavedCustom = false;
        try { hasSavedCustom = localStorage.getItem(PALETTE_KEY) !== null; }
        catch { /* Storage can be blocked. */ }
        if (hasSavedCustom) {
          palette = readCustomPalette();
          startingPalette = readCustomPaletteBase();
        } else {
          palette = paletteFromCurrentPreset();
          startingPalette = { ...palette };
          try { localStorage.setItem(PALETTE_BASE_KEY, JSON.stringify(startingPalette)); }
          catch { /* Storage can be blocked. */ }
        }
      }
      selected = next;
      render(true);
    });
  });
  dialog.querySelector<HTMLButtonElement>("#theme-edit-current")?.addEventListener("click", () => {
    // Only this explicit action replaces a saved Custom palette with a preset.
    if (selected === "custom") return;
    palette = paletteFromCurrentPreset();
    startingPalette = { ...palette };
    try { localStorage.setItem(PALETTE_BASE_KEY, JSON.stringify(startingPalette)); }
    catch { /* Storage can be blocked. */ }
    selected = "custom";
    render(true);
  });
  dialog.querySelector<HTMLButtonElement>("#theme-colors-default")?.addEventListener("click", () => {
    selected = "auto";
    palette = { ...DEFAULT_PALETTE };
    startingPalette = { ...DEFAULT_PALETTE };
    try {
      localStorage.removeItem("theme");
      localStorage.removeItem(PALETTE_KEY);
      localStorage.removeItem(PALETTE_BASE_KEY);
    } catch { /* Storage can be blocked. */ }
    render(false);
  });
  dialog.querySelector<HTMLButtonElement>("#theme-fonts-default")?.addEventListener("click", () => {
    fonts = { ...DEFAULT_FONTS };
    try { localStorage.removeItem(FONT_STORAGE_KEY); }
    catch { /* Storage can be blocked. */ }
    render(false);
  });
  for (const name of colorNames) {
    dialog.querySelector<HTMLInputElement>("#theme-" + name)?.addEventListener("input", (event) => {
      const input = event.currentTarget as HTMLInputElement;
      palette = { ...palette, [name]: input.value };
      selected = "custom";
      render(true);
    });
  }
  for (const name of advancedNames) {
    dialog.querySelector<HTMLInputElement>("#theme-" + name + "-auto")?.addEventListener("change", (event) => {
      const automatic = (event.currentTarget as HTMLInputElement).checked;
      if (automatic) {
        const next = { ...palette };
        delete next[name];
        palette = next;
      } else {
        const derived = paletteTextColors(palette);
        palette = { ...palette, [name]: derived[advancedRoles[name]] };
      }
      render(true);
    });
    dialog.querySelector<HTMLInputElement>("#theme-" + name)?.addEventListener("input", (event) => {
      palette = { ...palette, [name]: (event.currentTarget as HTMLInputElement).value };
      render(true);
    });
  }
  // Typography is not tied to a colour preset or Custom's reset control.
  for (const language of ["urdu", "roman"] as const) {
    dialog.querySelector<HTMLSelectElement>("#theme-" + language + "-font")?.addEventListener("change", (event) => {
      fonts = parseFontPreferences({ ...fonts, [language]: (event.currentTarget as HTMLSelectElement).value });
      applyFontPreferences(fonts);
      render(false);
    });
  }
  dialog.querySelector<HTMLButtonElement>("#theme-reset-custom")?.addEventListener("click", () => {
    palette = { ...startingPalette };
    selected = "custom";
    render(true);
  });
  for (const id of ["#theme-dialog-close", "#theme-dialog-done"]) {
    dialog.querySelector<HTMLButtonElement>(id)?.addEventListener("click", () => dialog.close());
  }
  // The native modal handles Escape and keeps keyboard focus inside the dialog.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (selected === "auto") render(false);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== "theme" && event.key !== PALETTE_KEY &&
        event.key !== PALETTE_BASE_KEY && event.key !== FONT_STORAGE_KEY) return;
    selected = readTheme();
    palette = readCustomPalette();
    startingPalette = readCustomPaletteBase();
    fonts = readFontPreferences();
    render(false);
  });
}
