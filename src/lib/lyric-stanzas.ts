// File role: Parse source stanza breaks and resolve six-verse presentation without altering Markdown.
import { parseStanzaNumber } from "./stanza-numbers.ts";
export interface LyricDisplayLine {
  text: string;
  number: boolean;
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
export function layoutLyricStanzas(text: string): LyricDisplayLine[][] {
  const sourceBlocks = splitLyricStanzas(text);
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
