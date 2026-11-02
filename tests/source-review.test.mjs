import test from "node:test";
import assert from "node:assert/strict";
import { compareEditions, reviewMarkdown } from "../src/lib/source-review.ts";

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

test("Basta metadata, source separators, and physical page continuation are treated separately", () => {
  const u = reviewMarkdown({ path: "src/data/basta/pages/200.md", kind: "basta-urdu",
    text: "---\npage: 200\noriginalImage: /images/basta/original/200.png\n---\n۴\nپہلی\n---***---\n۵\nدوسری" });
  const r = reviewMarkdown({ path: "src/data/basta/roman/200.md", kind: "basta-roman",
    text: "---\npage: 200\n---\n4\nFirst\n---***---\n5\nSecond" });
  assert.equal(u.issues.length, 0);
  assert.equal(r.issues.length, 0);
  assert.deepEqual(compareEditions(u.body, r.body, u.path, r.path), []);
  assert(compareEditions(u.body, "4\nFirst", u.path, r.path).some(x => x.code === "fragment-count"));
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

test("flags other writing systems and the established Roman name conventions", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/foreign.md", kind: "lyrics",
    text: lyric("سلام", "Hussain and Hassan Αli") });
  const codes = file.issues.map(x => x.code);
  assert(codes.includes("roman-name-style"));
  assert(codes.includes("unexpected-script"));
});

test("detects OCR uncertainty markers outside brackets in both scripts", () => {
  const file = reviewMarkdown({ path: "src/data/lyrics/uncertain.md", kind: "lyrics",
    text: lyric("متن نامکمل", "Matn ghair wazeh") });
  assert.equal(file.issues.filter(x => x.code === "unverified-text").length, 2);
});

test("Basta source review flags prayer notices, not poetic prayer references", () => {
  const sample = [
    "---", "page: 135", "originalImage: /images/basta/original/135.png", "---",
    "کر لیجئے التماس دعا ہاتھ باندھ کر",
    "التماس سورۃ فاتحہ برائے ایصال ثواب",
  ].join("\n");
  const urdu = reviewMarkdown({ path: "src/data/basta/pages/135.md", kind: "basta-urdu", text: sample });
  assert.equal(urdu.issues.filter(x => x.code === "basta-prayer-block").length, 1);

  const roman = [
    "---", "page: 137", "---",
    "Kar lijiye iltimas-e-dua hath bandh kar",
    "(Iltimas Surat-e-Fatiha baraye sozkhwan)",
    "Iltimas-e-Fatiha baraye isal-e-sawab",
    "Iltimas-e-dua-e-sehat baraye shair",
  ].join("\n");
  const romanFindings = reviewMarkdown({ path: "src/data/basta/roman/137.md", kind: "basta-roman", text: roman });
  assert.equal(romanFindings.issues.filter(x => x.code === "basta-prayer-block").length, 3);
});
