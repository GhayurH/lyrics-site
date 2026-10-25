// File role: Regression coverage for Basta's printed two-line and six-line stanza indentation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(lines[8].sixClosing, undefined);
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

test("justifies poetry titles but excludes poets and credits", () => {
  const result = layoutBastaKalam(
    ["پہلا مصرع", "شاعر", "", "پہلا مصرع", "دوسرا مصرع", "تیسرا مصرع",
      "چوتھا مصرع", "(بشکریہ خواں)"].join("\n"), true, "couplet"
  );
  assert.deepEqual(result.map((line) => line.verse), [
    false, false, false, true, true, true, true, false
  ]);
  assert.ok(result[0].title);
  assert.ok(bastaVerseClassNames(result[0]).includes("basta-verse-poetry"));
  assert.ok(!bastaVerseClassNames(result[1]).includes("basta-verse-poetry"));
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
  const poem = ["first", "byline", "", "first", ..."bcdefghijkl", "", "m", "n"].join("\n");
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
  assert.equal(stanza.find(line => line.text === "B")?.reverseIndent, true);
  const unnumbered = layoutBastaKalam("A\nB\nC\nD\nE\nF");
  assert.equal(unnumbered[4].sixClosingStart, true);
  assert.equal(unnumbered[1].indent, false);
  assert.equal(unnumbered[1].reverseIndent, true);
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

test("page 362 Urdu and Roman opening titles and closing lines use verse fitting", () => {
  for (const language of ["pages", "roman"]) {
    const source = readFileSync(new URL(`../src/data/basta/${language}/362.md`, import.meta.url), "utf8");
    const text = splitBastaKalams(source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""))[0];
    const lines = layoutBastaKalam(text);
    const title = lines.find(line => line.title);
    assert.ok(title, language + " title detected");
    assert.equal(title.verse, false, language + " title does not count as a verse");
    assert.ok(bastaVerseClassNames(title).includes("basta-verse-poetry"));
    const verses = lines.filter(line => line.verse);
    assert.equal(verses.length, 14);
    assert.equal(verses.filter(line => line.coupletSeparator).length, 6, language + " separators");
    assert.ok(!verses[0].coupletSeparator);
    assert.ok(verses.every((line, i) => line.indent === (i % 2 === 1)));
    assert.ok(verses.every(line => !line.sixClosing));
    assert.equal(lines.filter(line => line.hidden).length, 1, "blank between pairs collapsed");
  }
});

test("two-verse groups separated by blank lines get exactly one rule per boundary", () => {
  const lines = layoutBastaKalam("first\nsecond\n\nthird\nfourth\n\nfifth\nsixth");
  assert.deepEqual(lines.filter(l => l.coupletSeparator).map(l => l.text), ["third", "fifth"]);
  assert.deepEqual(lines.filter(l => l.hidden).map(l => l.text), ["", ""]);
  assert.deepEqual(lines.filter(l => l.indent).map(l => l.text), ["second", "fourth", "sixth"]);
  assert.ok(lines.every(l => !l.sixClosing));
});

test("unnumbered and explicitly configured long couplets insert horizontal separators between pairs", () => {
  const lines = layoutBastaKalam("a\nb\nc\nd\ne\nf", true, "couplet");
  assert.deepEqual(lines.filter(l => l.coupletSeparator).map(l => l.text), ["c", "e"]);
  assert.ok(!lines[0].coupletSeparator);
  assert.deepEqual(lines.filter(l => l.indent).map(l => l.text), ["b", "d", "f"]);
});

test("six-line stanza and source refrain have no couplet separators", () => {
  const lines = layoutBastaKalam("1\na\nb\nc\nd\n\ne\nf\n\nopening reprise");
  assert.ok(lines.every(l => !l.coupletSeparator));
  assert.ok(lines.find(l => l.text === "e")?.sixClosingStart);
  assert.ok(lines.find(l => l.text === "f")?.sixClosingEnd);
});

test("titles and final first-line reprises are justified without applying justification to poets", () => {
  const lines = layoutBastaKalam("poem title\npoet\n\npoem title\nsecond line\n\npoem title");
  const title = lines[0];
  const poet = lines[1];
  const reprise = lines.at(-1);
  assert.ok(title.title);
  assert.ok(bastaVerseClassNames(title).includes("basta-verse-poetry"));
  assert.ok(!bastaVerseClassNames(poet).includes("basta-verse-poetry"));
  assert.ok(reprise.refrain);
  assert.ok(bastaVerseClassNames(reprise).includes("basta-verse-poetry"));
  assert.ok(!reprise.coupletSeparator);
});

test("non-verse category headers and credits remain unfit and unjustified", () => {
  const text = "حمد، نعت و مناقب\n\nپہلا مصرع\nحمد / شاعر\n\nپہلا مصرع\nدوسرا مصرع";
  const lines = layoutBastaKalam(text);
  assert.ok(!lines[0].title);
  assert.ok(!lines[0].verse);
  assert.ok(lines[2].title);
  assert.ok(!lines[3].title);
  assert.ok(!lines[3].verse);
});


test("page 200 standalone titles before numbered six-line stanzas are justified", () => {
  for (const language of ["pages", "roman"]) {
    const markdown = readFileSync(new URL("../src/data/basta/" + language + "/200.md", import.meta.url), "utf8");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const kalam = splitBastaKalams(body)[1];
    const lines = layoutBastaKalam(kalam);
    const title = lines.find((line) => line.text.trim() && !line.verse && line.title);
    assert.ok(title, language + " standalone heading detected");
    assert.match(title.text, language === "pages" ? /امتحان گاہ/ : /Imtihan-gah/);
    assert.ok(bastaVerseClassNames(title).includes("basta-verse-poetry"));
    assert.ok(!lines.find((line) => /^\s*[۱1]\s*$/.test(line.text))?.title);
    const numberedStanza = lines.slice(lines.findIndex(line => /^[۱1]$/.test(line.text.trim())));
    const opening = numberedStanza.filter(line => line.verse).slice(0, 4);
    const closing = numberedStanza.filter(line => line.verse).slice(4, 6);
    assert.equal(opening.length, 4);
    assert.ok(opening.every(line => line.reverseIndent && !line.indent));
    assert.equal(closing.length, 2);
    assert.ok(closing.every(line => line.indent && !line.reverseIndent));
    assert.equal(lines.find((line) => line.sixClosingStart)?.text.trim() !== "", true);
  }
});

test("page 363 matching poem titles remain justified without justifying the byline", () => {
  for (const language of ["pages", "roman"]) {
    const markdown = readFileSync(new URL("../src/data/basta/" + language + "/363.md", import.meta.url), "utf8");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const lines = layoutBastaKalam(splitBastaKalams(body)[0]);
    assert.ok(lines[0].title);
    assert.ok(bastaVerseClassNames(lines[0]).includes("basta-verse-poetry"));
    assert.equal(lines[1].title, undefined);
    assert.ok(!bastaVerseClassNames(lines[1]).includes("basta-verse-poetry"));
  }
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

test("Urdu and Roman page 362 use opposite insets on first and second couplet lines", () => {
  for (const language of ["pages", "roman"]) {
    const markdown = readFileSync(new URL("../src/data/basta/" + language + "/362.md", import.meta.url), "utf8");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const verses = layoutBastaKalam(splitBastaKalams(body)[0]).filter((line) => line.verse);
    assert.equal(verses.length, 14);
    assert.deepEqual(verses.map((line) => Boolean(line.reverseIndent)),
      Array.from({ length: 14 }, (_, i) => i % 2 === 0));
    assert.deepEqual(verses.map((line) => line.indent),
      Array.from({ length: 14 }, (_, i) => i % 2 === 1));
    assert.equal(verses.filter((line) => line.coupletSeparator).length, 6);
  }
});

test("two-line and six-line stanza formatting stay independent", () => {
  const couplet = layoutBastaKalam("one\ntwo");
  assert.ok(couplet[0].reverseIndent && couplet[1].indent);
  const six = layoutBastaKalam("۱\nA\nB\nC\nD\n\nE\nF");
  assert.deepEqual(six.filter(line => line.verse).map(line => Boolean(line.reverseIndent)), [
    true, true, true, true, false, false,
  ]);
  assert.ok(six.find((line) => line.text === "E")?.indent);
  assert.ok(six.find((line) => line.text === "F")?.indent);
  assert.ok(six.find((line) => line.text === "E")?.sixClosingStart);
  assert.ok(six.find((line) => line.text === "F")?.sixClosingEnd);
});


test("continuous six-verse stanza uses opposing indents with one framed closing pair", () => {
  const lines = layoutBastaKalam("first\nsecond\nthird\nfourth\nfifth\nsixth");
  const firstFour = lines.slice(0, 4);
  const finalTwo = lines.slice(4);
  assert.ok(firstFour.every(line => line.reverseIndent && !line.indent && !line.sixClosing));
  assert.ok(finalTwo.every(line => line.indent && !line.reverseIndent && line.sixClosing));
  assert.deepEqual(lines.filter(line => line.sixClosingStart).map(line => line.text), ["fifth"]);
  assert.deepEqual(lines.filter(line => line.sixClosingEnd).map(line => line.text), ["sixth"]);
  assert.ok(firstFour.every(line => bastaVerseClassNames(line).includes("basta-verse-reverse-indent")));
  assert.ok(finalTwo.every(line => bastaVerseClassNames(line).includes("basta-verse-indent")));
  assert.ok(lines.every(line => !line.coupletSeparator));
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

test("a forced two-verse poem still alternates indents instead of six-verse framing", () => {
  const lines = layoutBastaKalam("a\nb\nc\nd\ne\nf", true, "couplet");
  assert.deepEqual(lines.map(line => Boolean(line.reverseIndent)), [
    true, false, true, false, true, false,
  ]);
  assert.deepEqual(lines.map(line => line.indent), [
    false, true, false, true, false, true,
  ]);
  assert.ok(lines.every(line => !line.sixClosing));
});


test("Basta Urdu and Roman stanza numbers render with the common circle class", () => {
  for (const language of ["pages", "roman"]) {
    const markdown = readFileSync(new URL("../src/data/basta/" + language + "/200.md", import.meta.url), "utf8");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const [first, second] = splitBastaKalams(body);
    for (const kalam of [first, second]) {
      const numbers = layoutBastaKalam(kalam).filter(line => line.stanzaNumber);
      assert.ok(numbers.length > 0);
      assert.ok(numbers.every(line => bastaVerseClassNames(line).includes("poetry-stanza-number")));
      assert.ok(numbers.every(line => !bastaVerseClassNames(line).includes("basta-verse-poetry")));
    }
  }
});

test("Basta circle counter strips punctuation but does not change verse numeral text", () => {
  const lines = layoutBastaKalam("۱.\nایک مصرع\nدوسرا مصرع");
  assert.equal(lines[0].stanzaNumber, "۱");
  assert.equal(lines[0].text, "۱");
  assert.ok(bastaVerseClassNames(lines[0]).includes("poetry-stanza-number"));
  assert.ok(!lines[1].stanzaNumber);
  assert.equal(lines[1].text, "ایک مصرع");
});

test("prose-mode Basta pages still mark standalone stanza numbers", () => {
  const lines = layoutBastaKalam("3\nword one\nword two", false);
  assert.equal(lines[0].stanzaNumber, "3");
  assert.ok(bastaVerseClassNames(lines[0]).includes("poetry-stanza-number"));
});
