// File role: Regression coverage for Basta's printed two-line and six-line stanza indentation.
import test from "node:test";
import assert from "node:assert/strict";
import { layoutBastaKalam, splitBastaKalams } from "../src/lib/basta-text.ts";

const indents = (text, enabled = true) => layoutBastaKalam(text, enabled)
  .filter((line) => line.text.trim() && !/^\d+$/.test(line.text.trim()))
  .map((line) => line.indent);

test("two-line stanza indents only its second verse", () => {
  assert.deepEqual(indents("first\nsecond"), [false, true]);
});

test("six consecutive verses indent only the closing two", () => {
  assert.deepEqual(indents("a\nb\nc\nd\ne\nf"), [false, false, false, false, true, true]);
});

test("numbered 4+2 stanza offsets both closing verses but not the credit", () => {
  const lines = layoutBastaKalam("۱\na\nb\nc\nd\n\ne\nf\n(بشکریہ شاعر)");
  assert.deepEqual(lines.map((line) => line.indent), [
    false, false, false, false, false, false, true, true, false,
  ]);
});

test("Roman 4+2 convention and subsequent two-line stanza remain independent", () => {
  const content = "1\na\nb\nc\nd\n\ne\nf\n\n2\ng\nh";
  assert.deepEqual(indents(content), [
    false, false, false, false, true, true, false, true,
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
