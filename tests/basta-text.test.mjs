// Pure stanza-layout contracts; source-specific editorial examples are covered by content validation.
import test from "node:test";
import assert from "node:assert/strict";
import { bastaVerseClassNames, layoutBastaKalam, splitBastaKalams } from "../src/lib/basta-text.ts";

const indents = (text, enabled = true) => layoutBastaKalam(text, enabled)
  .filter((line) => line.text.trim() && !/^\d+$/.test(line.text.trim()))
  .map((line) => line.indent);

test("two-line stanza indents only its second verse", () => {
  assert.deepEqual(indents("first\nsecond"), [false, true]);
});

test("six consecutive verses frame the closing pair without side rules", () => {
  const lines = layoutBastaKalam("a\nb\nc\nd\ne\nf");
  assert.deepEqual(lines.map(line => line.indent), [false, false, false, false, true, true]);
  assert.deepEqual(lines.map(line => Boolean(line.reverseIndent)), [true, true, true, true, false, false]);
  assert.equal(lines[4].sixClosingStart, true);
  assert.equal(lines[5].sixClosingEnd, true);
});

test("numbered 4+2 stanza frames its closing pair, removes the separating gap, and excludes credit", () => {
  const lines = layoutBastaKalam("۱\na\nb\nc\nd\n\ne\nf\n(بشکریہ شاعر)");
  assert.deepEqual(lines.map((line) => line.indent), [
    false, false, false, false, false, false, true, true, false,
  ]);
  assert.deepEqual(lines.map((line) => Boolean(line.reverseIndent)), [
    false, true, true, true, true, false, false, false, false,
  ]);
  assert.equal(lines[5].hidden, true);
  assert.equal(lines[6].sixClosingStart, true);
  assert.equal(lines[7].sixClosingEnd, true);
  assert.equal(lines[8].sixClosingStart, undefined);
  assert.equal(lines[8].sixClosingEnd, undefined);
});

test("blank lines survive and prose pages can opt out", () => {
  const content = "a\nb\n\nc\nd";
  assert.equal(layoutBastaKalam(content)[2].text, "");
  assert.deepEqual(indents(content, false), [false, false, false, false]);
});

test("verified Urdu and Roman titles collapse only the spacer before stanza one", () => {
  for (const title of ["جب خلق سے وقتِ سفر فاطمہ آیا", "Jab khalq se waqt-e-safar Fatima aaya"]) {
    const numbered = layoutBastaKalam([title, "", "1", "first", "second"].join("\n"));
    assert.equal(numbered[0].title, true);
    assert.equal(numbered[1].hidden, true);
    assert.equal(numbered[2].stanzaNumber, "1");
  }
  const withPoet = layoutBastaKalam("Opening\nPoet\n\nOpening\nSecond");
  assert.equal(withPoet[0].title, true);
  assert.equal(withPoet[1].poet, true);
  assert.equal(withPoet[2].hidden, true);
  // A regular six-line stanza break is still preserved; only a detected\n  // title gap (or an already-ruled couplet gap) is collapsed.\n  const normal = layoutBastaKalam("a\nb\nc\nd\ne\nf\n\ng\nh\ni\nj\nk\nl");\n  assert.equal(normal[6].hidden, undefined);
});

test("kalam separators keep boundaries independent", () => {
  const kalams = splitBastaKalams("a\nb\n---***---\nc\nd");
  assert.equal(kalams.length, 2);
  assert.deepEqual(kalams.map((kalam) => indents(kalam)), [
    [false, true],
    [false, true],
  ]);
});

test("Salam unbroken six lines are three couplets, unlike Marsiya six-line stanzas", () => {
  const text = "a\nb\nc\nd\ne\nf";
  assert.deepEqual(indents(text, true), [false, false, false, false, true, true]);
  assert.deepEqual(layoutBastaKalam(text, true, "couplet").map((line) => line.indent), [
    false, true, false, true, false, true,
  ]);
});

test("four-line stanza breaks remain unindented even in the Salam section", () => {
  assert.deepEqual(layoutBastaKalam("a\nb\nc\nd", true, "couplet").map((line) => line.indent), [
    false, false, false, false,
  ]);
});

test("justifies poetry titles but excludes poets and credits", () => {
  const result = layoutBastaKalam(
    ["پہلا مصرع", "شاعر", "", "پہلا مصرع", "دوسرا مصرع", "تیسرا مصرع",
      "چوتھا مصرع", "(بشکریہ خواں)"].join("\n"), true, "couplet"
  );
  assert.deepEqual(result.map((line) => line.verse), [
    false, false, false, true, true, true, true, false
  ]);
  assert.ok(result[0].title);
  assert.ok(result[1].poet, "verified byline immediately after the title is marked");
  assert.ok(bastaVerseClassNames(result[1]).includes("kalam-poet-credit"));
  assert.ok(!bastaVerseClassNames(result[1]).includes("kalam-reading-title"));
  assert.ok(bastaVerseClassNames(result[0]).includes("basta-verse-poetry"));
  assert.ok(!bastaVerseClassNames(result[1]).includes("basta-verse-poetry"));
  assert.ok(!result.at(-1)?.poet, "source credits are not poet bylines");
});

test("a page-end fifth line does not prevent fitting the first two couplets", () => {
  const result = layoutBastaKalam("a\nb\nc\nd\ne", true, "couplet");
  assert.deepEqual(result.map((line) => line.indent), [false, true, false, true, false]);
  assert.ok(result.every((line) => line.verse));
});

test("unnumbered continuous couplets are inferred without a per-page category", () => {
  const poem = ["first", "byline", "", "first", ..."bcdefghijkl", "", "m", "n"].join("\n");
  const result = layoutBastaKalam(poem);
  const verses = result.filter(line => line.verse);
  assert.equal(verses.length, 14);
  assert.deepEqual(verses.map(line => line.indent), Array.from({ length: 14 }, (_, i) => i % 2 === 1));
  assert.ok(verses.every(line => !line.sixClosingStart && !line.sixClosingEnd));
});

test("numbered 4+2 verses and ordinary six-line poems are not guessed as couplets", () => {
  const stanza = layoutBastaKalam("1\nA\nB\nC\nD\n\nE\nF");
  assert.equal(stanza.find(line => line.text === "E")?.sixClosingStart, true);
  assert.equal(stanza.find(line => line.text === "F")?.sixClosingEnd, true);
  assert.equal(stanza.find(line => line.text === "B")?.indent, false);
  assert.equal(stanza.find(line => line.text === "B")?.reverseIndent, true);
  const unnumbered = layoutBastaKalam("A\nB\nC\nD\nE\nF");
  assert.equal(unnumbered[4].sixClosingStart, true);
  assert.equal(unnumbered[1].indent, false);
  assert.equal(unnumbered[1].reverseIndent, true);
});

test("two-verse groups separated by blank lines get exactly one rule per boundary", () => {
  const lines = layoutBastaKalam("first\nsecond\n\nthird\nfourth\n\nfifth\nsixth");
  assert.deepEqual(lines.filter(l => l.coupletSeparator).map(l => l.text), ["third", "fifth"]);
  assert.deepEqual(lines.filter(l => l.hidden).map(l => l.text), ["", ""]);
  assert.deepEqual(lines.filter(l => l.indent).map(l => l.text), ["second", "fourth", "sixth"]);
  assert.ok(lines.every(l => !l.sixClosingStart && !l.sixClosingEnd));
});

test("six-line stanza and source refrain have no couplet separators", () => {
  const lines = layoutBastaKalam("1\na\nb\nc\nd\n\ne\nf\n\nopening reprise");
  assert.ok(lines.every(l => !l.coupletSeparator));
  assert.ok(lines.find(l => l.text === "e")?.sixClosingStart);
  assert.ok(lines.find(l => l.text === "f")?.sixClosingEnd);
});

test("couplet verses alternate reverse/end and regular/start indents", () => {
  const lines = layoutBastaKalam("a\nb\nc\nd\ne\nf", true, "couplet");
  assert.deepEqual(lines.map((line) => Boolean(line.reverseIndent)), [true, false, true, false, true, false]);
  assert.deepEqual(lines.map((line) => line.indent), [false, true, false, true, false, true]);
  assert.deepEqual(lines.filter((line) => line.coupletSeparator).map((line) => line.text), ["c", "e"]);
  for (const first of lines.filter((line) => line.reverseIndent)) {
    assert.ok(bastaVerseClassNames(first).includes("basta-verse-reverse-indent"));
  }
});

test("4+2 numbered stanza and its refrain keep a single shared final rule", () => {
  const lines = layoutBastaKalam("۱\nA\nB\nC\nD\n\nE\nF\n\nopening reprise");
  const verseLines = lines.filter(line => line.verse && !line.refrain);
  assert.deepEqual(verseLines.map(line => Boolean(line.reverseIndent)), [
    true, true, true, true, false, false,
  ]);
  assert.deepEqual(verseLines.map(line => line.indent), [
    false, false, false, false, true, true,
  ]);
  assert.ok(lines[5].hidden);
  assert.ok(lines[8].hidden);
  assert.equal(lines.at(-1)?.refrainSharesRule, true);
  assert.equal(lines.filter(line => line.sixClosingStart).length, 1);
  assert.equal(lines.filter(line => line.sixClosingEnd).length, 1);
});

test("four verses alone are not mistaken for the first half of a six-line stanza", () => {
  const lines = layoutBastaKalam("۱\nA\nB\nC\nD");
  assert.ok(lines.every(line => !line.reverseIndent && !line.indent));
});

test("Basta circle counter strips punctuation but does not change verse numeral text", () => {
  const lines = layoutBastaKalam("۱.\nایک مصرع\nدوسرا مصرع");
  assert.equal(lines[0].stanzaNumber, "۱");
  assert.equal(lines[0].text, "۱");
  assert.ok(bastaVerseClassNames(lines[0]).includes("poetry-stanza-number"));
  assert.ok(!lines[1].stanzaNumber);
  assert.equal(lines[1].text, "ایک مصرع");
});
