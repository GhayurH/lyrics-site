// File role: One browser renderer for Basta text shared by streamed pages and recitation programmes.
import { bastaVerseClassNames, layoutBastaKalam, type BastaStanzaStyle } from "../lib/basta-text";
import { node } from "./dom";

/** The source parser owns title/byline/stanza semantics; consumers only place blocks. */
export function renderBastaTextBlock(
  text: string,
  indentStanzas = true,
  stanzaStyle: BastaStanzaStyle = "auto",
  prefaceOnly = false,
): HTMLDivElement {
  const block = node("div", "basta-kalam-text");
  for (const line of layoutBastaKalam(text, indentStanzas, stanzaStyle, prefaceOnly)) {
    if (line.hidden) continue;
    block.append(node("span", bastaVerseClassNames(line), line.text));
  }
  return block;
}
