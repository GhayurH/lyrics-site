// Theme/font presentation only. Preference storage and event handling stay in appearance.ts.
import {
  applyTheme, paletteTextColors, paletteContrastScores, PRESET_THEME_GROUPS,
  type CustomPalette, type ThemeName, type AdvancedColor,
} from "./theme";
import { applyFontPreferences, type FontPreferences } from "./fonts";

interface AppearanceViewState {
  selected: ThemeName;
  palette: CustomPalette;
  fonts: FontPreferences;
}
/** One mapping of appearance inputs to theme roles, shared by the UI and its controller. */
export const APPEARANCE_COLOR_NAMES = ["main", "secondary", "accent"] as const;
export const APPEARANCE_ADVANCED_ROLES: Record<AdvancedColor, "primary" | "muted" | "borders"> = {
  primaryText: "primary", mutedText: "muted", borders: "borders",
};
export const APPEARANCE_ADVANCED_NAMES = Object.keys(APPEARANCE_ADVANCED_ROLES) as AdvancedColor[];

/** Render every appearance control from validated state without persisting automatic theme mode. */
export function renderAppearancePreferences(
  dialog: HTMLDialogElement, fields: HTMLFieldSetElement, note: HTMLElement,
  { selected, palette, fonts }: AppearanceViewState, save: boolean,
): void {
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
  for (const name of APPEARANCE_COLOR_NAMES) {
    const input = dialog.querySelector<HTMLInputElement>("#theme-" + name);
    const output = dialog.querySelector<HTMLOutputElement>("#theme-" + name + "-value");
    if (input) input.value = palette[name];
    if (output) output.textContent = palette[name].toUpperCase();
  }
  const automatic = paletteTextColors({
    ...palette, primaryText: undefined, mutedText: undefined, borders: undefined,
  });
  for (const name of APPEARANCE_ADVANCED_NAMES) {
    const automaticControl = dialog.querySelector<HTMLInputElement>("#theme-" + name + "-auto");
    const picker = dialog.querySelector<HTMLInputElement>("#theme-" + name);
    const output = dialog.querySelector<HTMLOutputElement>("#theme-" + name + "-value");
    const isAutomatic = !palette[name];
    const value = palette[name] ?? automatic[APPEARANCE_ADVANCED_ROLES[name]];
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

