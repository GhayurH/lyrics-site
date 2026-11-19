// One metadata contract shared by standalone lyrics and printed Basta fragments.
// A scalar gives the number of verses; the two named six-line patterns select
// their established 4+2 or 2+2+2 typography without altering source wording.
export type StanzaPattern = number | "4+2" | "2+2+2";

export function stanzaVerseCount(pattern: StanzaPattern): number {
  return typeof pattern === "number" ? pattern : 6;
}

/** Basta fragment indices are one-based, in printed ---***--- order. */
export function fragmentStanzaPattern(
  fallback: StanzaPattern | undefined,
  overrides: Readonly<Record<string, StanzaPattern>> | undefined,
  index: number,
): StanzaPattern | undefined {
  return overrides?.[String(index + 1)] ?? fallback;
}
