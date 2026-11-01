// File role: One browser renderer for Basta text shared by streamed pages and recitation programmes.
import { bastaVerseClassNames, layoutBastaKalam, type BastaStanzaStyle } from "../lib/basta-text";

/** The source parser owns title/byline/stanza semantics; consumers only place blocks. */
export function renderBastaTextBlock(
  text: string,
  indentStanzas = true,
  stanzaStyle: BastaStanzaStyle = "auto",
  prefaceOnly = false,
): HTMLDivElement {
  const block = document.createElement("div");
  block.className = "basta-kalam-text";
  for (const line of layoutBastaKalam(text, indentStanzas, stanzaStyle, prefaceOnly)) {
    if (line.hidden) continue;
    const verse = document.createElement("span");
    verse.className = bastaVerseClassNames(line);
    verse.textContent = line.text;
    block.append(verse);
  }
  return block;
}
