import test from "node:test";
import assert from "node:assert/strict";
import { compareEditions, reviewMarkdown, reviewPublicationConventions } from "../src/lib/source-review.ts";
import { normalizeBibiText } from "../src/lib/bibi-spelling.ts";

const basta = (page, urdu, roman) =>
  "---\npage: " + page + "\noriginalImage: /images/basta/original/" +
  String(page).padStart(3, "0") + ".png\n" +
  (roman === undefined ? "" : "romanLyrics: |-\n" +
    roman.split("\n").map(line => line ? "  " + line : "").join("\n") + "\n") +
  "---\n" + urdu;

const lyric = (urdu, roman) =>
  "---\ntitle: \"سلام\"\nlanguage: \"Urdu\"\nlang: \"ur\"\ndirection: \"rtl\"\nkalamType: \"Salam\"\nromanLyrics: |-\n" +
  roman.split("\n").map(x => "  " + x).join("\n") + "\n---\n" + urdu;

test("correctly aligned bilingual lyrics pass structural and script checks", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/sample.md", kind: "lyrics",
    text: lyric("۱\nاردو پہلی\nدوسری\n\n۲\nتیسری", "1\nRoman first\nRoman second\n\n2\nRoman third") });
  assert.deepEqual(file.issues, []);
  assert.equal(file.bodyLine > file.romanLine, true);
});

test("detects wrong verse counts and isolated stanza-number mismatches", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/sample.md", kind: "lyrics",
    text: lyric("۱\nپہلی\nدوسری\n\n۲\nتیسری", "1\nFirst\n\n3\nThird\nAnother") });
  const codes = file.issues.map(x => x.code);
  assert(codes.includes("stanza-number-mismatch"));
  assert(codes.includes("stanza-gap"));
  assert(!codes.includes("stanza-line-mismatch"), "do not compare wrong-number stanzas as if aligned");
  const aligned = compareEditions("۱\nپہلی\nدوسری", "1\nFirst", "ur.md", "ro.md");
  assert(aligned.some(x => x.code === "stanza-line-mismatch"));
});

test("flags mixed scripts, non-ASCII Latin transliteration and control characters", () => {
  const text = lyric("سلام ABC\nغلط\u200b", "Salām\nAli علی\nNormal");
  const issues = reviewMarkdown({ path: "src/data/lyrics/mixed.md", kind: "lyrics", text }).issues;
  const codes = issues.map(x => x.code);
  for (const code of ["latin-in-urdu", "invisible-character", "extended-latin-in-roman", "arabic-in-roman"])
    assert(codes.includes(code), code);
  assert(issues.every(x => x.path === "src/data/lyrics/mixed.md"));
  assert(issues.some(x => x.code === "latin-in-urdu" && x.line > 8));
});

test("Bibi spelling normalizes Urdu separators and preserves inflections", () => {
  for (const input of ["بیبی", "بی بی", "بی‌بی", "بی‍بی", "بي بي"])
    assert.equal(normalizeBibiText(input), "بی\u200Cبی");
  assert.equal(normalizeBibiText("بِی بِی"), "بِی\u200Cبِی");
  assert.equal(normalizeBibiText("بی بیوں"), "بی\u200Cبیوں");
  assert.equal(normalizeBibiText("بیبیاں"), "بی\u200Cبیاں");
  assert.equal(normalizeBibiText("علیبیبی"), "علیبیبی");
});

test("Bibi spelling normalizes Roman variants without altering unrelated words", () => {
  for (const input of ["Bibi", "Bi Bi", "Bee Bee", "Bi-Bi", "Bi‌Bi"])
    assert.equal(normalizeBibiText(input), "Bibi");
  for (const [input, expected] of [["bi bi", "bibi"], ["bibiyan", "bibiyan"],
    ["habibi", "habibi"], ["BIBI", "BIBI"]])
    assert.equal(normalizeBibiText(input), expected);
});

test("the canonical Urdu Bibi non-joiner is intentional, but a joiner is not", () => {
  const good = reviewMarkdown({ path: "src/data/lyrics/bibi.md", kind: "lyrics",
    text: lyric("۱\nبی‌بی کا سلام", "1\nBibi ka salam") });
  assert(!good.issues.some(x => x.code === "invisible-character"));
  const bad = reviewMarkdown({ path: "src/data/lyrics/bibi.md", kind: "lyrics",
    text: lyric("۱\nبی‍بی کا سلام", "1\nBibi ka salam") });
  assert(bad.issues.some(x => x.code === "invisible-character"));
});

test("intentional Urdu chorus extensions require explicit, still-current stanza numbers", () => {
  const raw = lyric("۱\nپہلا مصرع\nدوسرا مصرع\nاضافی جواب", "1\nPehla misra\nDusra misra");
  const withException = raw.replace('kalamType: "Salam"', 'kalamType: "Salam"\nstanzaLineExceptions: [1]');
  const approved = reviewMarkdown({ path: "src/data/lyrics/chorus.md", kind: "lyrics",
    text: withException });
  assert(!approved.issues.some(x => x.code === "stanza-line-mismatch"));
  assert(!approved.issues.some(x => x.code === "stale-stanza-exception"));

  const unapproved = reviewMarkdown({ path: "src/data/lyrics/chorus.md", kind: "lyrics",
    text: raw });
  assert(unapproved.issues.some(x => x.code === "stanza-line-mismatch"));

  const stale = reviewMarkdown({ path: "src/data/lyrics/chorus.md", kind: "lyrics",
    text: withException.replace("اضافی جواب", "") });
  assert(stale.issues.some(x => x.code === "stale-stanza-exception"));
});

test("does not confuse Roman curly apostrophes and punctuation with extended Latin letters", () => {
  const issues = reviewMarkdown({ path: "src/data/lyrics/punctuation.md", kind: "lyrics",
    text: lyric("سلام", "AhlulBait’s—'text'") }).issues;
  assert(!issues.some(x => x.code === "extended-latin-in-roman"));
});

test("reports empty/broken frontmatter and missing Roman text", () => {
  const noYaml = reviewMarkdown({ path: "src/data/lyrics/missing.md", kind: "lyrics", text: "سلام" });
  assert.equal(noYaml.issues[0].code, "frontmatter");
  const missing = reviewMarkdown({ path: "src/data/lyrics/missing.md", kind: "lyrics",
    text: "---\ntitle: سلام\nlanguage: Urdu\nlang: ur\ndirection: rtl\nkalamType: Noha\n---\nسلام" });
  assert(missing.issues.some(x => x.code === "missing-roman"));
});

test("Basta Roman literal is audited against its Urdu body without external files", () => {
  const text = basta(200, "۴\nپہلی\n---***---\n۵\nدوسری",
    "4\nFirst\n---***---\n5\nSecond");
  const file = reviewMarkdown({ path: "src/data/basta/pages/200.md", kind: "basta-urdu", text });
  assert.deepEqual(file.issues, []);
  assert.equal(file.roman, "4\nFirst\n---***---\n5\nSecond");
  assert.deepEqual(compareEditions(file.body, file.roman, file.path, file.path), []);
  assert(compareEditions(file.body, "4\nFirst", file.path, file.path)
    .some(x => x.code === "fragment-count"));
});

test("missing Basta Roman transcription is deliberately absent, not a regression", () => {
  const source = reviewMarkdown({ path: "src/data/basta/pages/200.md", kind: "basta-urdu",
    text: basta(200, "۱\nالف", undefined) });
  assert.equal(source.roman, undefined);
  assert(!source.issues.some(issue => issue.code === "missing-roman"));
});

test("Basta metadata mismatch and verified OCR placeholders are surfaced without changing content", () => {
  const text = "---\npage: 300\n---\n[ابتدائی مصرعے غیر واضح]\nمتن";
  const file = reviewMarkdown({ path: "src/data/basta/pages/301.md", kind: "basta-urdu", text });
  assert(file.issues.some(x => x.code === "page-metadata"));
  assert(file.issues.some(x => x.code === "missing-image"));
  assert(file.issues.some(x => x.code === "unverified-text"));
  assert.equal(file.body.includes("متن"), true);
});

test("image-only Basta page can have an empty source body", () => {
  const file = reviewMarkdown({ path: "src/data/basta/pages/004.md", kind: "basta-urdu",
    text: "---\npage: 4\nimageOnly: true\noriginalImage: /images/basta/original/004.png\n---\n" });
  assert.equal(file.issues.length, 0);
});

test("English Basta appendices preserve Latin script without false Urdu-script findings", () => {
  const file = reviewMarkdown({
    path: "src/data/basta/pages/471.md", kind: "basta-urdu",
    text: "---\npage: 471\ncontentKind: english-appendix\noriginalImage: /images/basta/original/471.png\n---\nSalient Features of Soazkhwani",
  });
  assert.ok(!file.issues.some(x => x.code === "latin-in-urdu"));
});
test("flags other writing systems and the established Roman name conventions", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/foreign.md", kind: "lyrics",
    text: lyric("سلام", "Hussain and Hassan Αli") });
  const codes = file.issues.map(x => x.code);
  assert(codes.includes("roman-name-style"));
  assert(codes.includes("unexpected-script"));
});

test("detects editorial OCR placeholders without flagging normal prose about ambiguity", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/uncertain.md", kind: "lyrics",
    text: lyric("متن نامکمل\n[دو مصرع غیر واضح]", "Matn ghair wazeh\n[Two lines unclear]") });
  assert.equal(file.issues.filter(x => x.code === "unverified-text").length, 2);
  const prose = reviewMarkdown({ path: "src/data/lyrics/ordinary.md", kind: "lyrics",
    text: lyric("یہ عبارت نامکمل نہیں ہے", "Matn ghair wazeh nahi hai") });
  assert.equal(prose.issues.filter(x => x.code === "unverified-text").length, 0);
});

test("Basta source review flags prayer notices, not poetic prayer references", () => {
  const sample = [
    "---", "page: 135", "originalImage: /images/basta/original/135.png", "---",
    "کر لیجئے التماس دعا ہاتھ باندھ کر",
    "التماس سورۃ فاتحہ برائے ایصال ثواب",
  ].join("\n");
  const urdu = reviewMarkdown({ path: "src/data/basta/pages/135.md", kind: "basta-urdu", text: sample });
  assert.equal(urdu.issues.filter(x => x.code === "basta-prayer-block").length, 1);

  const roman = basta(137, "اردو مصرع", [
    "Kar lijiye iltimas-e-dua hath bandh kar",
    "(Iltimas Surat-e-Fatiha baraye sozkhwan)",
    "Iltimas-e-Fatiha baraye isal-e-sawab",
    "Iltimas-e-dua-e-sehat baraye shair",
  ].join("\n"));
  const romanFindings = reviewMarkdown({ path: "src/data/basta/pages/137.md", kind: "basta-urdu", text: roman });
  assert.equal(romanFindings.issues.filter(x => x.code === "basta-prayer-block").length, 3);
});

test("Basta source formatting flags double blank separators and attached acknowledgements", () => {
  const body = [
    "عنوان", "۱", "شعر", "", "", "", "دوسرا شعر", "(بشکریہ سوزخواں)", "", "تیسرا شعر",
  ].join("\n");
  const md = ["---", "page: 140",
    "originalImage: /images/basta/original/140.png", "---", body].join("\n");
  const file = reviewMarkdown({
    path: "src/data/basta/pages/140.md", kind: "basta-urdu", text: md,
  });
  assert(file.issues.some(x => x.code === "basta-excess-blank-lines"));
  assert(file.issues.some(x => x.code === "basta-courtesy-spacing"));
});


test("explicit Basta subtitles and refrains are not mistaken for Urdu-script contamination", () => {
  const urdu = [
    "---", "page: 398", "originalImage: /images/basta/original/398.png", "---",
    "[[subtitle]] عنوانِ ثانوی", "", "[[refrain]] آئیے اپنے مولا سے باتیں کریں",
  ].join("\n");
  const file = reviewMarkdown({
    path: "src/data/basta/pages/398.md", kind: "basta-urdu", text: urdu,
  });
  assert.ok(!file.issues.some(x => x.code === "latin-in-urdu"));
  const bad = reviewMarkdown({
    path: "src/data/basta/pages/398.md", kind: "basta-urdu",
    text: urdu + "\nIncorrect Latin prose",
  });
  assert.ok(bad.issues.some(x => x.code === "latin-in-urdu"));
});

test("publication checks enforce EOF and never require missing Basta Roman", () => {
  const valid = basta(200, "۱\nالف", undefined) + "\n";
  const reviewed = reviewMarkdown({ path: "src/data/basta/pages/200.md", kind: "basta-urdu", text: valid });
  assert.deepEqual(reviewPublicationConventions(reviewed, valid), []);
  for (const text of [valid.trimEnd(), valid + "\n"]) {
    const file = reviewMarkdown({ path: reviewed.path, kind: reviewed.kind, text });
    assert(reviewPublicationConventions(file, text).some(f => f.code === "source-final-newline"));
  }
  const emptyRoman = basta(200, "۱\nالف", "") + "\n";
  const file = reviewMarkdown({ path: reviewed.path, kind: reviewed.kind, text: emptyRoman });
  assert(reviewPublicationConventions(file, emptyRoman).some(f => f.code === "empty-basta-roman"));
});

test("publication checks own lyric stanza-number and pairs declarations", () => {
  const path = "src/data/lyrics/sample.md";
  const check = (text) => {
    const file = reviewMarkdown({ path, kind: "lyrics", text });
    return reviewPublicationConventions(file, text).map(issue => issue.code);
  };
  const missing = lyric("پہلی\nدوسری", "First\nSecond") + "\n";
  assert.equal(check(missing).filter(code => code === "missing-lyric-stanza-number").length, 2);
  const pairs = lyric("۱\nپہلی\nدوسری", "1\nFirst\nSecond")
    .replace('kalamType: "Salam"', 'kalamType: "Salam"\nsixVerseLayout: "pairs"') + "\n";
  assert.equal(check(pairs).filter(code => code === "invalid-six-verse-layout").length, 2);
  const valid = lyric("۱\n" + Array(6).fill("پہلی").join("\n"),
    "1\n" + Array(6).fill("First").join("\n"))
    .replace('kalamType: "Salam"', 'kalamType: "Salam"\nsixVerseLayout: "pairs"') + "\n";
  assert.deepEqual(check(valid), []);
  assert.deepEqual(check(pairs.replace('sixVerseLayout: "pairs"', 'published: false\nsixVerseLayout: "pairs"')), []);
});

test("Roman ṅ is the sole accepted Latin diacritic, including in Roman metadata", () => {
  const raw = lyric("۱\nمیں ہوں", "1\nmeiṅ huṅ")
    .replace('kalamType: "Salam"', 'kalamType: "Salam"\nalternateTitle: "Maiṅ Huṅ"');
  const allowed = reviewMarkdown({ path: "src/data/lyrics/nasal.md", kind: "lyrics", text: raw });
  assert(!allowed.issues.some(x => x.code.includes("extended-latin")), "dotted n is canonical");
  const disallowed = reviewMarkdown({ path: "src/data/lyrics/nasal.md", kind: "lyrics",
    text: raw.replaceAll("ṅ", "ā") });
  assert(disallowed.issues.some(x => x.code.includes("extended-latin")));
});
