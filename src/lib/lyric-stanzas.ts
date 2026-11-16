// File role: Parse source stanza breaks and resolve six-verse presentation without altering Markdown.
import { parseStanzaNumber } from "./stanza-numbers.ts";
import type { StanzaPattern } from "./stanza-pattern.ts";
export interface LyricDisplayLine {
  text: string;
  number: boolean;
}

/** Shared stanza classes for server-rendered lyrics and recitation content. */
export function lyricStanzaClassNames(stanza: readonly LyricDisplayLine[], pattern?: StanzaPattern): string {
  const count = stanza.filter((line) => !line.number).length;
  return ["lyric-stanza", count === 2 && pattern === 2 && "lyric-stanza-couplet",
    count === 6 && "lyric-stanza-six",
    count === 6 && pattern === "2+2+2" && "lyric-stanza-pairs"]
    .filter(Boolean).join(" ");
}

export function lyricLineClassName(line: LyricDisplayLine): string {
  return line.number ? "poetry-stanza-number" : "lyric-verse";
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

/**
 * Resolve six-verse presentation groups without changing the blank-line
 * boundaries stored in Markdown. Some sources print a numbered four-verse
 * section followed by its unnumbered two-verse closing couplet.
 *
 * The opening 4+2 form is also recognised when immediately followed by a
 * numbered stanza. Other source breaks remain untouched, including repeated
 * 2-line refrains and sequences whose verse grouping is ambiguous.
 */
export function layoutLyricStanzas(text: string, pattern?: StanzaPattern): LyricDisplayLine[][] {
  const sourceBlocks = splitLyricStanzas(text);
  // An explicit non-six-line form rules out the automatic 4+2 joining.
  if (pattern !== undefined && pattern !== 6 && pattern !== "4+2" && pattern !== "2+2+2")
    return sourceBlocks;
  const displayBlocks: LyricDisplayLine[][] = [];

  for (let index = 0; index < sourceBlocks.length; index++) {
    const first = sourceBlocks[index];
    const closing = sourceBlocks[index + 1];
    const verseCount = first.filter(line => !line.number).length;
    const numberedFour = first[0]?.number && verseCount === 4;
    const openingFour = index === 0 && !first.some(line => line.number) &&
      verseCount === 4 && sourceBlocks[index + 2]?.[0]?.number;
    const closingCouplet = closing?.length === 2 &&
      closing.every(line => !line.number);

    if ((numberedFour || openingFour) && closingCouplet) {
      displayBlocks.push([...first, ...closing]);
      index++;
    } else {
      displayBlocks.push(first);
    }
  }

  return displayBlocks;
}
