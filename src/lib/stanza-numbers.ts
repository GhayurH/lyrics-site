// File role: Shared stanza-number parser for Basta and standalone lyrics.
/** An isolated numeral may include source punctuation; the circle contains only the digit(s). */
export function parseStanzaNumber(value: string): string | null {
  return value.trim().match(/^([0-9٠-٩۰-۹]+)[.)۔-]?$/u)?.[1] ?? null;
}
