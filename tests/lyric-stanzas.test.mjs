// File role: Non-Basta stanza boundary regressions. Blank lines, not verse counts, delimit stanzas.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isLyricStanzaNumber, splitLyricStanzas } from "../src/lib/lyric-stanzas.ts";

test("blank lines alone delimit stanzas; one blank or many behave identically", () => {
  const blocks = splitLyricStanzas("one\ntwo\n\nthree\nfour\n\n\n five\nsix");
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map(block => block.map(line => line.text)), [
    ["one", "two"], ["three", "four"], [" five", "six"],
  ]);
});

test("standalone numbers are preserved while numerals embedded in verses are not markers", () => {
  const stanzas = splitLyricStanzas("۱\nپہلا مصرع 2\nدوسرا مصرع\n\n2\nthird line");
  assert.deepEqual(stanzas.map(block => block.map(line => line.number)), [
    [true, false, false], [true, false],
  ]);
  assert.ok(isLyricStanzaNumber("۶"));
  assert.ok(isLyricStanzaNumber("6"));
  assert.ok(!isLyricStanzaNumber("6 verses"));
});

test("real Urdu non-Basta Markdown retains numbered stanzas and source breaks", () => {
  const source = readFileSync(new URL("../src/data/lyrics/aa-asghar-bin-tere.md", import.meta.url), "utf8");
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const stanzas = splitLyricStanzas(body);
  assert.equal(stanzas.length, 6);
  assert.deepEqual(stanzas.slice(1).map(block => block[0].text), ["۱", "۲", "۳", "۴", "۵"]);
  assert.ok(stanzas.slice(1).every(block => block.length >= 3));
});
