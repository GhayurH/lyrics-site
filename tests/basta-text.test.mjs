// File role: Regression coverage for Basta's printed two-line and six-line stanza indentation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { layoutBastaKalam, splitBastaKalams } from "../src/lib/basta-text.ts";

const indents = (text, enabled = true) => layoutBastaKalam(text, enabled)
  .filter((line) => line.text.trim() && !/^\d+$/.test(line.text.trim()))
  .map((line) => line.indent);

test("two-line stanza indents only its second verse", () => {
  assert.deepEqual(indents("first\nsecond"), [false, true]);
});

test("six consecutive verses frame the closing pair without side rules", () => {
  const lines = layoutBastaKalam("a\nb\nc\nd\ne\nf");
  assert.deepEqual(lines.map(line => line.indent), [false, false, false, false, false, false]);
  assert.equal(lines[4].sixClosingStart, true);
  assert.equal(lines[5].sixClosingEnd, true);
});

test("numbered 4+2 stanza frames its closing pair, removes the separating gap, and excludes credit", () => {
  const lines = layoutBastaKalam("۱\na\nb\nc\nd\n\ne\nf\n(بشکریہ شاعر)");
  assert.deepEqual(lines.map((line) => line.indent), Array(9).fill(false));
  assert.equal(lines[5].hidden, true);
  assert.equal(lines[6].sixClosingStart, true);
  assert.equal(lines[7].sixClosingEnd, true);
  assert.equal(lines[8].sixClosing, undefined);
});

test("Roman 4+2 convention and subsequent two-line stanza remain independent", () => {
  const content = "1\na\nb\nc\nd\n\ne\nf\n\n2\ng\nh";
  assert.deepEqual(indents(content), [
    false, false, false, false, false, false, false, true,
  ]);
});

test("blank lines survive and prose pages can opt out", () => {
  const content = "a\nb\n\nc\nd";
  assert.equal(layoutBastaKalam(content)[2].text, "");
  assert.deepEqual(indents(content, false), [false, false, false, false]);
});

test("kalam separators keep boundaries independent", () => {
  const kalams = splitBastaKalams("a\nb\n---***---\nc\nd");
  assert.equal(kalams.length, 2);
  assert.deepEqual(kalams.map((kalam) => indents(kalam)), [
    [false, true],
    [false, true],
  ]);
});

test("page 139 heading/poet stay unindented while each Urdu couplet is offset", () => {
  const stanza = [
    "کربلا کی خاک پر کیا آدمی سجدے میں ہے",
    "افتخار عارف",
    "",
    "کربلا کی خاک پر کیا آدمی سجدے میں ہے",
    "موت رسوا ہوچکی ہے، زندگی سجدے میں ہے",
    "یہ جو موجیں سر جھکتی ہیں سرِ نہرِ فرات",
    "ایسا لگتا ہے یہاں پیاسا کوئی سجدے میں ہے",
    "نوکِ نیزہ پر بھی ہوتی ہے تلاوت بعدِ عصر",
    "مصحفِ ناطق، یہ فخرِ آدمی سجدے میں ہے",
    "(بشکریہ سوزخواں برادران کاظم و عباس)",
  ].join("\n");
  const result = layoutBastaKalam(stanza, true, "couplet");
  assert.deepEqual(result.map((line) => line.indent), [
    false, false, false, false, true, false, true, false, true, false,
  ]);
});

test("page 139 Roman couplets use the same layout", () => {
  const text = [
    "Khuda-shinasi o khud-agahi Husain se hai",
    "Anwar Turabi",
    "",
    "Khuda-shinasi o khud-agahi Husain se hai",
    "Ke aadmi ba-Khuda aadmi Husain se hai",
    "Jala gaya hai bahattar chiragh",
    "Jahan mein char taraf roshni",
    "Usul-e-din ka tahaffuz",
    "Jahan mein kal ki tarah aaj bhi",
    "Jahan se farq-e-halal o haram uth jata",
    "Ye waqfiyat-e-amr o nahi Husain se hai",
  ].join("\n");
  assert.deepEqual(layoutBastaKalam(text, true, "couplet").map((line) => line.indent), [
    false, false, false, false, true, false, true, false, true, false, true,
  ]);
});

test("Salam unbroken six lines are three couplets, unlike Marsiya six-line stanzas", () => {
  const text = "a\nb\nc\nd\ne\nf";
  assert.deepEqual(indents(text, true), [false, false, false, false, false, false]);
  assert.deepEqual(layoutBastaKalam(text, true, "couplet").map((line) => line.indent), [
    false, true, false, true, false, true,
  ]);
});

test("four-line stanza breaks remain unindented even in the Salam section", () => {
  assert.deepEqual(layoutBastaKalam("a\nb\nc\nd", true, "couplet").map((line) => line.indent), [
    false, false, false, false,
  ]);
});

test("justifies poetry but excludes repeated titles, poets and credits", () => {
  const result = layoutBastaKalam(
    ["پہلا مصرع", "شاعر", "", "پہلا مصرع", "دوسرا مصرع", "تیسرا مصرع",
      "چوتھا مصرع", "(بشکریہ خواں)"].join("\n"), true, "couplet"
  );
  assert.deepEqual(result.map((line) => line.verse), [
    false, false, false, true, true, true, true, false
  ]);
});

test("unformatted prose never gains the poetry-justification flag", () => {
  assert.deepEqual(layoutBastaKalam("Prose heading\nProse paragraph", false).map((line) => line.verse), [false, false]);
});

test("a page-end fifth line does not prevent fitting the first two couplets", () => {
  const result = layoutBastaKalam("a\nb\nc\nd\ne", true, "couplet");
  assert.deepEqual(result.map((line) => line.indent), [false, true, false, true, false]);
  assert.ok(result.every((line) => line.verse));
});

test("unnumbered continuous couplets are inferred without a per-page category", () => {
  const poem = "heading\nbyline\n\nheading\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n\n13\n14";
  const result = layoutBastaKalam(poem);
  const verses = result.filter(line => line.verse);
  assert.equal(verses.length, 14);
  assert.deepEqual(verses.map(line => line.indent), Array.from({ length: 14 }, (_, i) => i % 2 === 1));
  assert.ok(verses.every(line => !line.sixClosing));
});

test("page 362's first Hamd is paired correctly in both scripts, ignoring category and title/byline", () => {
  for (const language of ["pages", "roman"]) {
    const source = readFileSync(new URL(`../src/data/basta/${language}/362.md`, import.meta.url), "utf8");
    const markdownBody = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const kalam = splitBastaKalams(markdownBody)[0];
    const lines = layoutBastaKalam(kalam);
    const verseLines = lines.filter(line => line.verse);
    assert.equal(verseLines.length, 14, `${language}: 12 contiguous verses and final 2`);
    assert.deepEqual(verseLines.map(line => line.indent),
      Array.from({ length: 14 }, (_, i) => i % 2 === 1),
      `${language}: only the second line of every couplet is inset`);
    assert.equal(lines.filter(line => line.text.trim() && !line.verse).length, 3,
      `${language}: section heading, title, and byline are not treated as verses`);
    assert.ok(verseLines.every(line => !line.sixClosing),
      `${language}: no six-line framing on two-line stanzas`);
  }
});

test("numbered 4+2 verses and ordinary six-line poems are not guessed as couplets", () => {
  const stanza = layoutBastaKalam("1\nA\nB\nC\nD\n\nE\nF");
  assert.equal(stanza.find(line => line.text === "E")?.sixClosingStart, true);
  assert.equal(stanza.find(line => line.text === "F")?.sixClosingEnd, true);
  assert.equal(stanza.find(line => line.text === "B")?.indent, false);
  const unnumbered = layoutBastaKalam("A\nB\nC\nD\nE\nF");
  assert.equal(unnumbered[4].sixClosingStart, true);
  assert.equal(unnumbered[1].indent, false);
});

test("long unnumbered couplet poems continue correctly onto the next page", () => {
  const source = readFileSync(new URL("../src/data/basta/pages/364.md", import.meta.url), "utf8");
  const markdownBody = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const kalam = splitBastaKalams(markdownBody)[0];
  const lines = layoutBastaKalam(kalam);
  assert.equal(lines.filter(line => line.verse).length, 14);
  assert.deepEqual(lines.filter(line => line.verse).map(line => line.indent),
    Array.from({ length: 14 }, (_, i) => i % 2 === 1));
});
