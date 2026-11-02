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


test("explicit editorial subtitles and major refrains render without leaking markup", () => {
  const lines = layoutBastaKalam(
    "Opening\n[[subtitle]] Special heading\n\nOpening\nSecond verse\n\n[[refrain]] Opening"
  );
  const subtitle = lines[1];
  assert.equal(subtitle.text, "Special heading");
  assert.equal(subtitle.subtitle, true);
  assert.equal(subtitle.poet, undefined);
  assert.ok(bastaVerseClassNames(subtitle).includes("basta-kalam-subtitle"));
  assert.ok(!bastaVerseClassNames(subtitle).includes("kalam-poet-credit"));
  const refrain = lines.at(-1);
  assert.equal(refrain.text, "Opening");
  assert.equal(refrain.refrain, true);
  assert.equal(refrain.verse, true);
  assert.ok(bastaVerseClassNames(refrain).includes("basta-refrain"));
  assert.ok(bastaVerseClassNames(refrain).includes("basta-verse-poetry"));
});

test("distinctive split bylines preserve proper title styling in both scripts", () => {
  for (const [title, credit, verse] of [
    ["رباعی", "پیرِ طریقت حضرت عنبر شاہ وارثیؒ", "الحمد کہ من بندۂ حیدر ہستم"],
    ["Rubai", "Pir-e-Tariqat Hazrat Anbar Shah Warsi", "Alhamd ke man banda-e-Haider hastam"],
    ["منقبت", "سید سبط جعفر", "انسان کہاں، وہ لوگ ہمیں شیطان دکھائی دیتے ہیں"],
    ["Manqabat", "Syed Sibt Jafar", "Insan kahan, wo log hamein shaitan dikhai dete hain"],
  ]) {
    const lines = layoutBastaKalam([title, credit, "", verse, "second verse"].join("\n"));
    assert.equal(lines[0].title, true, title);
    assert.equal(lines[1].poet, true, credit);
    assert.equal(lines[2].hidden, true);
    assert.equal(lines[3].verse, true);
  }
});

test("a three-line 3-verse poem preface has a title, subtitle, and poet", () => {
  for (const [name, secondary, poet] of [
    ["عقل و شعور ہیں رب کی نعمت، حقِ نعمت ادا کرو", "حقِ مودّت ادا کرو", "سبط جعفر"],
    ["Aql-o-shuur hain Rab ki nemat, Haq-e-nemat ada karo", "Haq-e-mawaddat ada karo", "Sibt Jafar"],
  ]) {
    const lines = layoutBastaKalam([name, secondary, poet, "", name, "verse two", "verse three"].join("\n"));
    assert.equal(lines[0].title, true);
    assert.equal(lines[1].subtitle, true);
    assert.equal(lines[1].verse, false);
    assert.equal(lines[2].poet, true);
    assert.equal(lines[3].hidden, true);
    assert.deepEqual(lines.slice(4).map(line => line.verse), [true,true,true]);
  }
});

test("Noha attribution distinguishes a title from unnumbered couplets", () => {
  const lines = layoutBastaKalam("روایتِ شامِ غریباں\nشفق اکبر آبادی\n\nکون آلِ پیمبر کا اب پوچھنے والا ہے\nدوسرا مصرع");
  assert.equal(lines[0].title, true);
  assert.equal(lines[1].poet, true);
});

test("recitation preface alone retains a three-line title, subtitle, and poet", () => {
  const lines = layoutBastaKalam("عقل و شعور ہیں رب کی نعمت\nحقِ مودّت ادا کرو\nسبط جعفر", true, "auto", true);
  assert.equal(lines[0].title, true);
  assert.equal(lines[1].subtitle, true);
  assert.equal(lines[2].poet, true);
});

test("Basta generic headings and unlisted poet bylines use shared title/credit styles", () => {
  for (const [heading, poet, firstVerse] of [
    ["رباعی", "سید ذیشان حیدر ذیشان", "دشوار سہی کام یہ کرنا ہوگا"],
    ["Rubai", "Syed Zeeshan Haider Zeeshan", "Dushwar sahi kam ye karna hoga"],
    ["زید شہید", "حکیم سید محمد کاظم زیدی", "زید شہید قدرتِ داور کا شاہکار"],
    ["Zaid Shahid", "Hakim Syed Muhammad Kazim Zaidi", "Zaid Shahid qudrat-e-Dawar ka shahkar"],
  ]) {
    const lines = layoutBastaKalam([heading, poet, "", firstVerse, "Second verse", "Third verse"].join("\n"));
    assert.ok(lines[0].title, heading);
    assert.ok(bastaVerseClassNames(lines[0]).includes("kalam-reading-title"));
    assert.ok(lines[1].poet, poet);
    assert.ok(bastaVerseClassNames(lines[1]).includes("kalam-poet-credit"));
    assert.ok(!lines[1].verse);
    assert.ok(lines[2].hidden);
  }
});

test("standalone genre headings are titles, standalone attribution lines are not", () => {
  for (const heading of ["[قطعہ]", "[Qit'a]", "قطعہ", "Qit'a", "سوزخوانی", "Sozkhwani", "عزاداروں سے خطاب", "Azadaron se khitab"]) {
    const lines = layoutBastaKalam([heading, "", "Verse one", "Verse two", "Verse three", "Verse four"].join("\n"));
    assert.equal(lines[0].title, true, heading);
    assert.equal(lines[0].poet, undefined, heading);
    assert.ok(lines[1].hidden);
  }
  for (const poet of ["علامہ طالب جوہری مدظلہ", "Allama Talib Jauhari Muddazillahu", "مرزا ادیب", "Mirza Adib"]) {
    const lines = layoutBastaKalam([poet, "", "Verse one", "Verse two", "Verse three", "Verse four"].join("\n"));
    assert.equal(lines[0].title, undefined, poet);
    assert.equal(lines[0].poet, true, poet);
    assert.ok(bastaVerseClassNames(lines[0]).includes("kalam-poet-credit"));
  }
});

test("minor differences in repeated first verse do not suppress title styling", () => {
  for (const [title, firstVerse] of [
    ["حسینؑ جب کہ چلے بعد دوپہر رن کو", "حسینؑ جب چلے بعد دوپہر رن کو"],
    ["Husain jab ke chale baad dopehar ran ko", "Husain jab chale baad dopehar ran ko"],
  ]) {
    const lines = layoutBastaKalam([title, "", firstVerse, "Verse two", "Verse three", "Verse four"].join("\n"));
    assert.ok(lines[0].title, title);
    assert.equal(lines[2].title, undefined);
    assert.ok(lines[2].verse);
  }
  // Distinct verses and ordinary two-line stanzas are never promoted.
  const verses = layoutBastaKalam("First ordinary verse\nSecond ordinary verse\n\nThird ordinary verse\nFourth ordinary verse");
  assert.ok(verses.every(line => !line.title && !line.poet));
});

test("a repeated poem title beginning with a poet-name prefix remains a title", () => {
  const title = "سید شہدا کی یاد میں جلتا ہے دل";
  const lines = layoutBastaKalam([title, "", title, "اگلا مصرع", "ایک اور مصرع", "آخری مصرع"].join("\n"));
  assert.equal(lines[0].title, true);
  assert.equal(lines[0].poet, undefined);
  assert.equal(lines[2].verse, true);
});
