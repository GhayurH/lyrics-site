// File role: Preserve non-Basta lyric stanza boundaries exactly as blank lines in the source.
import { parseStanzaNumber } from "./stanza-numbers.ts";
export interface LyricDisplayLine {
  text: string;
  number: boolean;
}

/** A stanza number occupies its entire source line; inline digits are poetry. */
export function isLyricStanzaNumber(line: string): boolean {
  return parseStanzaNumber(line) !== null;
}

export function splitLyricStanzas(text: string): LyricDisplayLine[][] {
  return text.replace(/\r\n?/g, "\n").trim().split(/\n(?:[ \t]*\n)+/)
    .filter(block => block.trim().length > 0)
    .map(block => block.split("\n")
      .filter(line => line.trim().length > 0)
      .map(line => {
        const number = parseStanzaNumber(line);
        return { text: number ?? line.trimEnd(), number: number !== null };
      }));
}
