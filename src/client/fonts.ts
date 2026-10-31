// Reader font options are centralized and allowlisted; user settings never become arbitrary CSS.
export const FONT_STORAGE_KEY = "kalam:reading-fonts";
export const FONT_CHOICES = {
  urdu: [
    { value: "nastaliq", label: "Noto Nastaliq Urdu" },
    { value: "naskh", label: "Noto Naskh Arabic" },
    { value: "lateef", label: "Lateef" },
    // This font's licence disallows redistribution: use only the reader's
    // locally installed copy, with a bundled Nastaliq fallback.
    { value: "alvi", label: "Alvi Nastaleeq (installed only)" },
  ],
  roman: [
    { value: "sans", label: "Inter / system sans-serif (default)" },
    { value: "system", label: "System sans-serif" },
    { value: "serif", label: "Georgia (serif)" },
    { value: "open-sans", label: "Open Sans" },
    { value: "source-sans", label: "Source Sans 3" },
    { value: "lora", label: "Lora (serif)" },
    { value: "merriweather", label: "Merriweather (serif)" },
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
  const validRoman = (candidate: unknown): candidate is FontPreferences["roman"] =>
    FONT_CHOICES.roman.some((option) => option.value === candidate);
  return {
    urdu: validUrdu(data.urdu) ? data.urdu : DEFAULT_FONTS.urdu,
    roman: validRoman(data.roman) ? data.roman : DEFAULT_FONTS.roman,
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
