// File role: Global browser enhancements for appearance, navigation, and saved-item controls.
import {
  STORAGE_KEYS,
  readFavoriteIds,
  toggleFavorite,
} from "./storage";
import {
  applyTheme, DEFAULT_PALETTE, PALETTE_KEY, PALETTE_BASE_KEY, readCustomPalette,
  readCustomPaletteBase, readTheme, normalizeCssHex, paletteTextColors,
  paletteContrastScores, PRESET_THEME_GROUPS,
  type AdvancedColor, type CustomPalette, type ThemeName,
} from "./theme";
import { applyFontPreferences, DEFAULT_FONTS, FONT_STORAGE_KEY, parseFontPreferences, readFontPreferences, type FontPreferences } from "./fonts";

function syncFavoriteButtons(): void {
  const favorites = new Set(readFavoriteIds());

  document
    .querySelectorAll<HTMLButtonElement>("[data-favorite-button][data-lyric-id]")
    .forEach((button) => {
      const id = button.dataset.lyricId;
      if (!id) return;

      const saved = favorites.has(id);
      const label = saved ? "Remove from saved lyrics" : "Save this lyric";

      button.setAttribute("aria-pressed", String(saved));
      button.dataset.saved = String(saved);
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);

      const inlineLabel = button.querySelector<HTMLElement>("[data-favorite-label]");
      if (inlineLabel?.hasAttribute("data-favorite-compact-label")) {
        inlineLabel.textContent = saved ? "Saved" : "Save";
      } else if (inlineLabel) {
        inlineLabel.textContent = label;
      } else {
        button.textContent = saved ? "Saved" : "Save";
      }
    });
}

function initMobileNavigation(): void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>("#mobile-nav-toggle");
  const navigation = document.querySelector<HTMLElement>("#site-navigation");
  if (!button || !navigation) return;

  const setOpen = (open: boolean) => {
    root.dataset.mobileNavOpen = String(open);
    if (open) delete root.dataset.mobileHeaderHidden;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    button.title = open ? "Close navigation" : "Open navigation";
  };
  button.addEventListener("click", () => setOpen(root.dataset.mobileNavOpen !== "true"));
  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (root.dataset.mobileNavOpen !== "true") return;
    if (event.target instanceof Node && !event.target.parentElement?.closest(".site-header")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.mobileNavOpen === "true") {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia("(min-width: 701px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

/** Hide the header on downward reading scrolls; upward movement reveals it.
 * Desktop applies this only after the reading content starts, while mobile
 * retains the site-wide compact-header behavior.
 */
function initHeaderAutoHide(): void {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  const reading = document.querySelector<HTMLElement>("[data-reading-root]");
  const mobile = window.matchMedia("(max-width: 700px)");
  let previousY = window.scrollY;
  let lastDirection = 0;
  let distance = 0;
  let lastSource: Window | HTMLElement = window;
  let pending = false;
  const panelPositions = new WeakMap<HTMLElement, number>();

  const show = () => {
    delete root.dataset.mobileHeaderHidden;
    delete root.dataset.desktopReaderHeaderHidden;
  };
  const reset = () => {
    distance = 0;
    lastDirection = 0;
  };
  const measureHeader = () => {
    root.style.setProperty("--site-header-height", `${header.offsetHeight}px`);
  };
  const readingStarted = () =>
    Boolean(reading && reading.getBoundingClientRect().top <= header.offsetHeight + 4);

  const recordDirection = (source: Window | HTMLElement, delta: number, canHide: boolean) => {
    if (source !== lastSource) {
      lastSource = source;
      reset();
    }
    if (Math.abs(delta) < 1) return;
    const direction = Math.sign(delta);
    if (direction !== lastDirection) distance = 0;
    lastDirection = direction;
    distance += Math.abs(delta);
    if (distance < 18) return;
    if (direction < 0) show();
    else if (canHide) {
      if (mobile.matches) root.dataset.mobileHeaderHidden = "true";
      else root.dataset.desktopReaderHeaderHidden = "true";
    }
    distance = 0;
  };

  const updateWindow = () => {
    pending = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - previousY;
    previousY = y;
    // Only an actually open mobile menu pins the header; keyboard focus on
    // its buttons should not permanently prevent auto-hide.
    if (root.dataset.readingFocus === "true" ||
        (mobile.matches && root.dataset.mobileNavOpen === "true")) {
      show();
      reset();
      return;
    }
    if (mobile.matches) {
      delete root.dataset.desktopReaderHeaderHidden;
      if (y < 80) {
        show();
        reset();
        return;
      }
      recordDirection(window, delta, y > 120);
    } else {
      delete root.dataset.mobileHeaderHidden;
      if (!readingStarted()) {
        show();
        reset();
        return;
      }
      recordDirection(window, delta, true);
    }
  };
  window.addEventListener("scroll", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateWindow);
  }, { passive: true });

  // A long Urdu column can scroll without moving the document. Apply the
  // same direction behavior once the reader has reached the sticky toolbar.
  document.addEventListener("scroll", (event) => {
    const panel = event.target;
    if (!(panel instanceof HTMLElement) ||
        panel.dataset.syncedScrollable !== "true" ||
        !reading?.contains(panel)) return;
    const previous = panelPositions.get(panel) ?? 0;
    panelPositions.set(panel, panel.scrollTop);
    if (!mobile.matches && root.dataset.readingFocus !== "true" && readingStarted()) {
      recordDirection(panel, panel.scrollTop - previous, true);
    }
  }, true);

  const resetOnResize = () => {
    previousY = window.scrollY;
    lastSource = window;
    reset();
    show();
    measureHeader();
  };
  mobile.addEventListener("change", resetOnResize);
  window.addEventListener("resize", resetOnResize, { passive: true });
  header.addEventListener("focusin", show);
  window.addEventListener("pageshow", () => { show(); previousY = window.scrollY; });
  document.fonts.ready.then(measureHeader);
  measureHeader();
}

/** One compact toolbar icon opens preset and custom appearance controls. */
function initThemePicker(): void {
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
  const colorNames: (keyof CustomPalette)[] = ["main", "secondary", "accent"];
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
    const label = PRESET_THEME_GROUPS.flatMap((group) => group.themes)
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

export function initSiteShell(): void {
  const root = document.documentElement;
  if (root.dataset.siteClientReady === "true") return;
  root.dataset.siteClientReady = "true";

  initThemePicker();
  initMobileNavigation();
  initHeaderAutoHide();
  syncFavoriteButtons();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>(
      "[data-favorite-button][data-lyric-id]",
    );
    const id = button?.dataset.lyricId;
    if (!button || !id) return;

    const favorites = toggleFavorite(id);
    syncFavoriteButtons();
    window.dispatchEvent(
      new CustomEvent("kalam:favorites-changed", { detail: { favorites } }),
    );
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.favorites) syncFavoriteButtons();
  });

  window.addEventListener("kalam:cards-rendered", syncFavoriteButtons);
}
