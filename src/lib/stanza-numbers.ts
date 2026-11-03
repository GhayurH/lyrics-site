// File role: Shared stanza-number parser for Basta and standalone lyrics.
/** An isolated numeral may include source punctuation; the circle contains only the digit(s). */
export function parseStanzaNumber(value: string): string | null {
  return value.trim().match(/^([0-9٠-٩۰-۹]+)[.)۔-]?$/u)?.[1] ?? null;
}

/** Convert printed Latin, Arabic-Indic, and Eastern Arabic-Indic digits. */
export function stanzaNumberValue(value: string): number | null {
  const parsed = parseStanzaNumber(value);
  if (parsed === null) return null;
  const digits = [...parsed].map(digit => {
    const n = digit.codePointAt(0)!;
    if (n >= 0x06f0 && n <= 0x06f9) return String(n - 0x06f0);
    if (n >= 0x0660 && n <= 0x0669) return String(n - 0x0660);
    return digit;
  }).join("");
  return Number(digits);
}
