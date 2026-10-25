// File role: Preserve non-Basta lyric stanza boundaries exactly as blank lines in the source.
export interface LyricDisplayLine {
  text: string;
  number: boolean;
}

/** A stanza number occupies its entire source line; inline digits are poetry. */
export function isLyricStanzaNumber(line: string): boolean {
  return /^[0-9٠-٩۰-۹]+[.)۔-]?$/.test(line.trim());
}

export function splitLyricStanzas(text: string): LyricDisplayLine[][] {
  return text.replace(/\r\n?/g, "\n").trim().split(/\n(?:[ \t]*\n)+/)
    .filter(block => block.trim().length > 0)
    .map(block => block.split("\n")
      .filter(line => line.trim().length > 0)
      .map(line => ({ text: line.trimEnd(), number: isLyricStanzaNumber(line) })));
}
