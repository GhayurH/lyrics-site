// File role: Validate durable standalone-lyric metadata and Roman edition conventions.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { splitLyricStanzas, layoutLyricStanzas } from "../src/lib/lyric-stanzas.ts";

const root = new URL("../src/data/lyrics/", import.meta.url);
const files = readdirSync(root).filter(file => file.endsWith(".md"));

function editions(filename) {
  const source = readFileSync(new URL(filename, root), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(match, filename + ": missing frontmatter");
  const roman = match[1].match(/^romanLyrics: \|-\r?\n([\s\S]*)$/m)?.[1]?.replace(/^  /gm, "");
  return { metadata: match[1], roman, urdu: match[2] };
}

test("published lyric editions retain standalone stanza markers", () => {
  assert.ok(files.length > 0);
  for (const filename of files) {
    const { metadata, urdu, roman } = editions(filename);
    if (/^published: false$/m.test(metadata)) continue;
    for (const [label, text] of [["Urdu", urdu], ["Roman", roman]]) {
      if (!text?.trim()) continue;
      assert.ok(splitLyricStanzas(text).some(stanza => stanza[0]?.number),
        filename + " missing " + label + " stanza numbers");
    }
  }
});

test("paired six-verse layouts are declared only for six-verse content", () => {
  for (const filename of files) {
    const { metadata, urdu, roman } = editions(filename);
    if (!/^sixVerseLayout: "pairs"$/m.test(metadata)) continue;
    for (const [label, text] of [["Urdu", urdu], ["Roman", roman]]) {
      if (!text?.trim()) continue;
      assert.ok(layoutLyricStanzas(text).some(stanza =>
        stanza.filter(line => !line.number).length === 6),
      filename + " " + label + " has no six-verse stanza");
    }
  }
});
