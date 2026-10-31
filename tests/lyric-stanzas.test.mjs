// File role: Exercise non-Basta stanza parsing and six-verse presentation contracts.
import test from "node:test";
import assert from "node:assert/strict";
import { splitLyricStanzas, layoutLyricStanzas } from "../src/lib/lyric-stanzas.ts";
import { parseStanzaNumber } from "../src/lib/stanza-numbers.ts";

test("only blank lines separate stanzas, including consecutive blank lines", () => {
  const stanzas = splitLyricStanzas("one\ntwo\n\nthree\nfour\n\n\n five\nsix");
  assert.deepEqual(stanzas.map(lines => lines.map(line => line.text)), [
    ["one", "two"], ["three", "four"], [" five", "six"],
  ]);
});

test("isolated Urdu and Roman numerals are stanza markers, not inline numbers", () => {
  const stanzas = splitLyricStanzas("۱.\nپہلا مصرع 2\nدوسرا مصرع\n\n2)\nRoman verse");
  assert.deepEqual(stanzas.map(lines => lines.map(line => line.number)), [
    [true, false, false], [true, false],
  ]);
  assert.deepEqual(stanzas.map(lines => lines[0].text), ["۱", "2"]);
  assert.equal(parseStanzaNumber("۶"), "۶");
  assert.equal(parseStanzaNumber("6 verses"), null);
});

test("meaningful source asterisks are not removed by stanza parsing", () => {
  const stanzas = splitLyricStanzas("۱\n*پہلا مصرع\nدوسرا مصرع\n\n2\n*Roman verse");
  assert.equal(stanzas[0][1].text, "*پہلا مصرع");
  assert.equal(stanzas[1][1].text, "*Roman verse");
});

test("a numbered four-line group and its closing couplet display as six verses", () => {
  const source = "۱\nfirst\nsecond\nthird\nfourth\n\nfifth\nsixth\n\n۲\nnext one\nnext two";
  const original = splitLyricStanzas(source);
  const rendered = layoutLyricStanzas(source);
  assert.deepEqual(rendered.map(lines => lines.filter(line => !line.number).length), [6, 2]);
  assert.equal(rendered[0][0].text, "۱");
  assert.deepEqual(rendered.flat(), original.flat(), "display grouping must not change the words or order");
});

test("opening four-plus-two and complete six-line stanzas preserve their text", () => {
  const opening = "intro one\nintro two\nintro three\nintro four\n\nclose one\nclose two\n\n۱\nverse one\nverse two";
  const rendered = layoutLyricStanzas(opening);
  assert.deepEqual(rendered.map(lines => lines.filter(line => !line.number).length), [6, 2]);
  const complete = "۱\none\ntwo\nthree\nfour\nfive\nsix\n\n۲\nseven\neight\nnine\nten\neleven\ntwelve";
  assert.deepEqual(layoutLyricStanzas(complete), splitLyricStanzas(complete));
});

test("unrelated refrains and adjacent two-line stanzas stay separate", () => {
  const source = "opening one\nopening two\n\nrefrain one\nrefrain two\n\n۱\none\ntwo\nthree\nfour\n\nending one\nending two";
  const rendered = layoutLyricStanzas(source);
  assert.deepEqual(rendered.map(lines => lines.filter(line => !line.number).length), [2, 2, 6]);
  const couplets = "۱\nline a\nline b\n\nline c\nline d\n\nline e\nline f";
  assert.deepEqual(layoutLyricStanzas(couplets), splitLyricStanzas(couplets));
});
