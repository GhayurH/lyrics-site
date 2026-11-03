// File role: Appearance tabs, color and font preferences, previews, and independent resets.
import {
  DEFAULT_PALETTE, PALETTE_KEY, PALETTE_BASE_KEY, readCustomPalette,
  readCustomPaletteBase, readTheme, normalizeCssHex, paletteTextColors,
  type CustomPalette, type ThemeName,
} from "./theme";
import { renderAppearancePreferences, APPEARANCE_COLOR_NAMES, APPEARANCE_ADVANCED_NAMES, APPEARANCE_ADVANCED_ROLES } from "./appearance-view";
import { applyFontPreferences, DEFAULT_FONTS, FONT_STORAGE_KEY, parseFontPreferences, readFontPreferences, type FontPreferences } from "./fonts";

/** Manage color/font preference mutations and events; view rendering lives in appearance-view.ts. */
export function initAppearance(): void {
  const trigger = document.querySelector<HTMLButtonElement>("#theme-toggle");
  const dialog = document.querySelector<HTMLDialogElement>("#theme-dialog");
  const fields = dialog?.querySelector<HTMLFieldSetElement>("#theme-custom-fields");
  const note = dialog?.querySelector<HTMLElement>("#theme-contrast-note");
  if (!trigger || !dialog || !fields || !note) return;

  type AppearanceTab = "colors" | "fonts";
  let activeTab: AppearanceTab = "colors";
  /** Maintain roving keyboard focus, ARIA selection and hidden-panel state together. */
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

  const render = (save: boolean) =>
    renderAppearancePreferences(dialog, fields, note, { selected, palette, fonts }, save);

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
  for (const name of APPEARANCE_COLOR_NAMES) {
    dialog.querySelector<HTMLInputElement>("#theme-" + name)?.addEventListener("input", (event) => {
      const input = event.currentTarget as HTMLInputElement;
      palette = { ...palette, [name]: input.value };
      selected = "custom";
      render(true);
    });
  }
  for (const name of APPEARANCE_ADVANCED_NAMES) {
    dialog.querySelector<HTMLInputElement>("#theme-" + name + "-auto")?.addEventListener("change", (event) => {
      const automatic = (event.currentTarget as HTMLInputElement).checked;
      if (automatic) {
        const next = { ...palette };
        delete next[name];
        palette = next;
      } else {
        const derived = paletteTextColors(palette);
        palette = { ...palette, [name]: derived[APPEARANCE_ADVANCED_ROLES[name]] };
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
