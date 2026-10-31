// File role: Non-Basta stanza boundary regressions. Blank lines, not verse counts, delimit stanzas.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { splitLyricStanzas } from "../src/lib/lyric-stanzas.ts";
import { parseStanzaNumber } from "../src/lib/stanza-numbers.ts";

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
  assert.equal(parseStanzaNumber("۶"), "۶");
  assert.equal(parseStanzaNumber("6"), "6");
  assert.equal(parseStanzaNumber("6 verses"), null);
});

test("real Urdu non-Basta Markdown retains numbered stanzas and source breaks", () => {
  const source = readFileSync(new URL("../src/data/lyrics/aa-asghar-bin-tere.md", import.meta.url), "utf8");
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const stanzas = splitLyricStanzas(body);
  assert.equal(stanzas.length, 6);
  assert.deepEqual(stanzas.slice(1).map(block => block[0].text), ["۱", "۲", "۳", "۴", "۵"]);
  assert.ok(stanzas.slice(1).every(block => block.length >= 3));
});


test("non-Basta Urdu and Roman standalone stanza numbering is circle-ready", () => {
  const urdu = splitLyricStanzas("۱.\nاردو مصرع\nاردو مصرع\n\n۲\nاور مصرع");
  const roman = splitLyricStanzas("1)\nRoman line\nRoman line\n\n2\nOther line");
  assert.deepEqual(urdu.map(block => block[0].text), ["۱", "۲"]);
  assert.deepEqual(roman.map(block => block[0].text), ["1", "2"]);
  assert.ok(urdu.every(block => block[0].number));
  assert.ok(roman.every(block => block[0].number));
  assert.ok(!urdu[0][1].number && !roman[0][1].number);
});

test("six-line Maula Ali stanzas have matching Urdu and Roman refrains", () => {
  const source = readFileSync(new URL("../src/data/lyrics/yeh-maula-ali-hai.md", import.meta.url), "utf8");
  const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]
    .replace(/^  /gm, "");
  assert.ok(roman);
  const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  for (const [text, refrain] of [
    [roman, "Ye Maula Ali Maula Ali Maula Ali hai"],
    [urdu, "یہ مولا علی مولا علی مولا علی ہے"],
  ]) {
    const stanzas = splitLyricStanzas(text);
    assert.equal(stanzas.length, 10);
    assert.ok(stanzas.every(block => block.length === 7 && block[0].number));
    assert.ok(stanzas.every(block => block.at(-1).text === refrain));
  }
});

test("the missing Roman stanzas align in number with their Urdu sources", () => {
  for (const [filename, expectedCount] of [
    ["shareek-e-dawat-e-islam-hain-abu-talib.md", 16],
    ["khutba-e-moula-abbas.md", 7],
  ]) {
    const source = readFileSync(new URL("../src/data/lyrics/" + filename, import.meta.url), "utf8");
    const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]
      .replace(/^  /gm, "");
    assert.ok(roman);
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const romanStanzas = splitLyricStanzas(roman);
    const urduStanzas = splitLyricStanzas(urdu);
    assert.equal(romanStanzas.length, expectedCount, filename + " Roman stanza count");
    assert.equal(urduStanzas.length, expectedCount, filename + " Urdu stanza count");
    assert.ok(romanStanzas.every(stanza => stanza.filter(line => !line.number).length === 6));
    assert.ok(urduStanzas.every(stanza => stanza.length >= 6));
  }
});
