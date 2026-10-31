// Reader font options are centralized and allowlisted; user settings never become arbitrary CSS.
export const FONT_STORAGE_KEY = "kalam:reading-fonts";
export const FONT_CHOICES = {
  urdu: [
    { value: "nastaliq", label: "Noto Nastaliq Urdu" },
    { value: "naskh", label: "Noto Naskh Arabic" },
    { value: "lateef", label: "Lateef" },
    // This font's licence disallows redistribution: use only the reader's
    // locally installed copy, with a bundled Nastaliq fallback.
    { value: "alvi", label: "Alvi Nastaleeq" },
    { value: "gulzar", label: "Gulzar" },
    { value: "scheherazade", label: "Scheherazade New" },
    { value: "amiri", label: "Amiri" },
    { value: "markazi", label: "Markazi Text" },
    { value: "noto-sans-arabic", label: "Noto Sans Arabic" },
    { value: "beaconhouse", label: "Beaconhouse Nastaliq" },
  ],
  roman: [
    { value: "sans", label: "Default" },
    { value: "serif", label: "Georgia" },
    { value: "open-sans", label: "Open Sans" },
    { value: "source-sans", label: "Source Sans 3" },
    { value: "lora", label: "Lora" },
    { value: "merriweather", label: "Merriweather" },
  ],
} as const;
export type FontPreferences = {
  urdu: (typeof FONT_CHOICES.urdu)[number]["value"];
  roman: (typeof FONT_CHOICES.roman)[number]["value"];
};
export const DEFAULT_FONTS: FontPreferences = { urdu: "nastaliq", roman: "sans" };

export function parseFontPreferences(value: unknown): FontPreferences {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const validUrdu = (candidate: unknown): candidate is FontPreferences["urdu"] =>
    FONT_CHOICES.urdu.some((option) => option.value === candidate);
  // The old "system" option was identical to the default. Migrate its saved value.
  const roman = data.roman === "system" ? "sans" : data.roman;
  const validRoman = (candidate: unknown): candidate is FontPreferences["roman"] =>
    FONT_CHOICES.roman.some((option) => option.value === candidate);
  return {
    urdu: validUrdu(data.urdu) ? data.urdu : DEFAULT_FONTS.urdu,
    roman: validRoman(roman) ? roman : DEFAULT_FONTS.roman,
  };
}

export function readFontPreferences(): FontPreferences {
  try { return parseFontPreferences(JSON.parse(localStorage.getItem(FONT_STORAGE_KEY) || "{}")); }
  catch { return { ...DEFAULT_FONTS }; }
}

export function applyFontPreferences(fonts: FontPreferences, persist = true): void {
  const root = document.documentElement;
  const changed = root.dataset.urduFont !== fonts.urdu || root.dataset.romanFont !== fonts.roman;
  root.dataset.urduFont = fonts.urdu;
  root.dataset.romanFont = fonts.roman;
  if (persist) {
    try { localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(fonts)); }
    catch { /* Private browsing and storage restrictions are supported. */ }
  }
  if (changed) window.dispatchEvent(new Event("kalam:fonts-changed"));
}
