// File role: Appearance preferences and colour contrast calculation.
// All palettes are local to this browser; no account or server storage.
export type ThemeName = "light" | "dark" | "amoled" | "sepia" | "custom";
export type AdvancedColor = "primaryText" | "mutedText" | "borders";
export type CustomPalette = {
  main: string; secondary: string; accent: string;
  primaryText?: string; mutedText?: string; borders?: string;
};

export const PALETTE_KEY = "kalam:custom-theme";
export const PALETTE_BASE_KEY = "kalam:custom-theme-base";
export const DEFAULT_PALETTE: CustomPalette = {
  main: "#f4ead6",
  secondary: "#fbf4e6",
  accent: "#755238",
};

const HEX = /^#[0-9a-f]{6}$/i;
export function validHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** CSS minifiers may shorten #ffffff to #fff. Colour inputs require six digits. */
export function normalizeCssHex(value: string, fallback: string): string {
  const hex = value.trim().toLowerCase();
  if (validHex(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex))
    return "#" + [...hex.slice(1)].map((digit) => digit + digit).join("");
  return fallback;
}

export function parsePalette(value: unknown): CustomPalette {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<CustomPalette> : {};
  return {
    main: validHex(data.main) ? data.main.toLowerCase() : DEFAULT_PALETTE.main,
    secondary: validHex(data.secondary) ? data.secondary.toLowerCase() : DEFAULT_PALETTE.secondary,
    accent: validHex(data.accent) ? data.accent.toLowerCase() : DEFAULT_PALETTE.accent,
    ...(validHex(data.primaryText) ? { primaryText: data.primaryText.toLowerCase() } : {}),
    ...(validHex(data.mutedText) ? { mutedText: data.mutedText.toLowerCase() } : {}),
    ...(validHex(data.borders) ? { borders: data.borders.toLowerCase() } : {}),
  };
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

function contrast(first: number, second: number): number {
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

function blendHex(foreground: string, background: string, foregroundShare: number): string {
  const channel = (i: number) => Math.round(
    parseInt(foreground.slice(i, i + 2), 16) * foregroundShare +
    parseInt(background.slice(i, i + 2), 16) * (1 - foregroundShare),
  ).toString(16).padStart(2, "0");
  return "#" + [1, 3, 5].map(channel).join("");
}

function minTextContrast(text: string, palette: CustomPalette): number {
  const value = luminance(text);
  return Math.min(contrast(value, luminance(palette.main)), contrast(value, luminance(palette.secondary)));
}

/** A less prominent text tone that still reaches 4.5:1 on both backgrounds
 * wherever the two chosen surfaces permit it. */
function automaticMuted(primary: string, palette: CustomPalette): string {
  const average = blendHex(palette.main, palette.secondary, .5);
  let selected = primary;
  for (let share = .95; share >= .05; share -= .05) {
    const candidate = blendHex(primary, average, share);
    if (minTextContrast(candidate, palette) < 4.5) break;
    selected = candidate;
  }
  return selected;
}

export function paletteTextColors(palette: CustomPalette): {
  primary: string; muted: string; borders: string; ratio: number;
} {
  const base = paletteForeground(palette);
  const primary = palette.primaryText ?? base.text;
  const muted = palette.mutedText ?? automaticMuted(primary, palette);
  return {
    primary, muted,
    borders: palette.borders ?? blendHex(primary, palette.main, .22),
    ratio: Math.min(minTextContrast(primary, palette), minTextContrast(muted, palette)),
  };
}

/** Choose the foreground maximizing contrast against *both* page and card. */
export function paletteForeground(palette: CustomPalette): { text: string; accentText: string; ratio: number; scheme: string } {
  const backgrounds = [luminance(palette.main), luminance(palette.secondary)];
  const darkRatio = Math.min(...backgrounds.map((v) => contrast(v, luminance("#171719"))));
  const lightRatio = Math.min(...backgrounds.map((v) => contrast(v, 1)));
  const text = darkRatio >= lightRatio ? "#171719" : "#ffffff";
  return {
    text,
    accentText: contrast(luminance(palette.accent), 1) >= contrast(luminance(palette.accent), luminance("#171719")) ? "#ffffff" : "#171719",
    ratio: Math.max(darkRatio, lightRatio),
    scheme: contrast(backgrounds[0], luminance("#171719")) >= contrast(backgrounds[0], 1) ? "light" : "dark",
  };
}

export function readTheme(): ThemeName {
  let saved: string | null = null;
  try { saved = localStorage.getItem("theme"); } catch { /* Storage can be blocked. */ }
  if (saved === "light" || saved === "dark" || saved === "amoled" || saved === "sepia" || saved === "custom") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readCustomPalette(): CustomPalette {
  try { return parsePalette(JSON.parse(localStorage.getItem(PALETTE_KEY) || "{}")); }
  catch { return { ...DEFAULT_PALETTE }; }
}

/** Restore the preset Custom was derived from, including after navigation. */
export function readCustomPaletteBase(): CustomPalette {
  try { return parsePalette(JSON.parse(localStorage.getItem(PALETTE_BASE_KEY) || "{}")); }
  catch { return { ...DEFAULT_PALETTE }; }
}

/** Also sync Pagefind, the browser UI chrome and the theme-color meta tag. */
export function applyTheme(theme: ThemeName, palette: CustomPalette = readCustomPalette(), persist = true): number {
  const root = document.documentElement;
  let readability = 21;
  if (theme === "custom") {
    const { accentText, scheme } = paletteForeground(palette);
    const { primary, muted, ratio } = paletteTextColors(palette);
    // The Appearance dialog must stay readable even when the user manually
    // chooses text colours with poor contrast against the selected surfaces.
    const editorPalette = { ...palette, main: palette.secondary, secondary: palette.secondary,
      primaryText: undefined, mutedText: undefined, borders: undefined };
    const editor = paletteTextColors(editorPalette);
    const editorScheme = paletteForeground(editorPalette).scheme;
    root.style.setProperty("--theme-editor-text", editor.primary);
    root.style.setProperty("--theme-editor-muted", editor.muted);
    root.style.setProperty("--theme-editor-scheme", editorScheme);
    readability = ratio;
    root.style.setProperty("--theme-main", palette.main);
    root.style.setProperty("--theme-secondary", palette.secondary);
    root.style.setProperty("--theme-accent", palette.accent);
    root.style.setProperty("--theme-foreground", primary);
    root.style.setProperty("--theme-muted", muted);
    if (palette.borders) root.style.setProperty("--theme-border", palette.borders);
    else root.style.removeProperty("--theme-border");
    root.style.setProperty("--theme-accent-text", accentText);
    root.style.setProperty("--theme-color-scheme", scheme);
    root.dataset.pfTheme = scheme;
  } else {
    root.dataset.pfTheme = theme === "dark" || theme === "amoled" ? "dark" : "light";
  }
  root.dataset.theme = theme;
  const headerColor = theme === "custom" ? palette.main
    : theme === "sepia" ? "#f4ead6" : theme === "amoled" ? "#000000" : theme === "light" ? "#f7f7f8" : "#171719";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", headerColor);
  if (persist) {
    try {
      localStorage.setItem("theme", theme);
      if (theme === "custom") localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
    } catch { /* Private browsing and storage restrictions are supported. */ }
  }
  return readability;
}
