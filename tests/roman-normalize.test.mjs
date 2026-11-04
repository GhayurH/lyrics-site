import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRomanMarkdown } from "../scripts/lib/roman-normalize.mjs";

const md = (u, r) => "---\ntitle: نام\nromanLyrics: |-\n" +
  r.split("\n").map(x => x ? "  " + x : "").join("\n") +
  "\n---\n" + u + "\n";
test("normalizes only Urdu-verified Roman vowels and nasalization", () => {
  const source = md("حسین کے خون میں کیوں نہیں ہیں", "Hussain ke khoon mein kyun nahin hain");
  const { text, paired } = normalizeRomanMarkdown(source, "src/data/lyrics/example.md");
  assert.equal(paired, 1);
  assert(text.includes("Husain ke khun meiṅ kiuṅ nahiṅ haiṅ"));
  assert.equal(text.slice(text.indexOf("---\n", 5) + 4), "حسین کے خون میں کیوں نہیں ہیں\n");
});
test("keeps poem-specific Zehra/Zahra, removes repetition marks and normalizes compounds", () => {
  const source = md("شب و روز بے وفا بار بار زہرا", "Shab-o-Roz be-wafa bar-bar Zehra");
  const r = normalizeRomanMarkdown(source);
  assert(r.text.includes("Shab o Roz bewafa baar baar Zehra"));
  assert(!r.text.includes("Zahra"));
  const r2 = normalizeRomanMarkdown(md("زہرا", "Zahra"));
  assert(r2.text.includes("Zahra"));
  const r3 = normalizeRomanMarkdown(md("وہ مارتی تھیں", "Wo maarti thin (x2)"));
  assert(r3.text.includes("Wo maarti thiṅ\n---\n"));
  assert.equal(r3.removedRepetitions, 1);
  const mid = normalizeRomanMarkdown(md("وہ مارتی تھیں سکینہ کو", "Wo maarti thin (x2) Sakina ko"));
  assert(mid.text.includes("Wo maarti thiṅ, Sakina ko"));
  assert.equal(mid.removedRepetitions, 1);
  const start = normalizeRomanMarkdown(md("وہ مارتی تھیں", "(x2) Wo maarti thin"));
  assert(start.text.includes("Wo maarti thiṅ\n---\n"));
  assert(!mid.text.includes("(x2)"));
  assert(!mid.text.includes("<u>"));
});
test("preserves intentionally untranscribed Basta and flags missing standalone Roman", () => {
  const source = "---\npage: 140\n---\nاردو\n";
  const a = normalizeRomanMarkdown(source, "src/data/basta/pages/140.md");
  assert.equal(a.changed, false);
  assert.deepEqual(a.findings, []);
  const b = normalizeRomanMarkdown(source, "src/data/lyrics/sample.md");
  assert(b.findings.some(x => x.includes("no Roman")));
});

test("long u and i remain standard even when Roman word counts differ", () => {
  const s = md("وہ خون رو کے یہ کہتا", "Wo khoon ro ke kehta");
  const r = normalizeRomanMarkdown(s);
  assert(r.text.includes("Wo khun ro ke kehta"));
  const repeated = normalizeRomanMarkdown(md("بار بار", "baar-baar"));
  assert(repeated.text.includes("baar baar"));
});

test("English Basta appendices are exact untouched duplicates", () => {
  const content = "---\npage: 471\ncontentKind: english-appendix\nromanLyrics: |-\n" +
    "  Schoolbook example\n---\nSchoolbook example\n";
  const result = normalizeRomanMarkdown(content, "src/data/basta/pages/471.md");
  assert.equal(result.text, content);
  assert.equal(result.changed, false);
});

test("normal noon is never nasalized by misleading token positions", () => {
  const safe = md("جو دعا کی تھی علی نے اس کے مقصد کی آمین",
    "Jo dua ki thi Ali ne us ke maqsad ki amin");
  const r = normalizeRomanMarkdown(safe);
  assert(r.text.includes("ki amin"), "آمین ends in normal ن");
  assert(!r.text.includes("amiṅ"));
  const mixed = md("کہاں ہے میرا حسین", "Kahan hai mera Husain");
  const mixedResult = normalizeRomanMarkdown(mixed);
  assert(mixedResult.text.includes("Kahaṅ hai mera Husain"));
  assert(!mixedResult.text.includes("Husaiṅ"));
});

test("vocative standalone E and Ay are Ae only when Urdu spells اے", () => {
  const matching = md("اے فرضی باپ کے بیٹوں", "E farzi baap ke betoṅ");
  const corrected = normalizeRomanMarkdown(matching);
  assert(corrected.text.includes("Ae farzi baap ke betoṅ"));
  const lower = normalizeRomanMarkdown(md("چلے آؤ اے ابن", "Chale aao e Ibn"));
  assert(lower.text.includes("Chale aao ae Ibn"));
  const older = normalizeRomanMarkdown(md("اے مولا", "Ay Maula"));
  assert(older.text.includes("Ae Maula"));
  const izafat = normalizeRomanMarkdown(md("غمِ اکبر میں", "Gham E Akbar meiṅ"));
  assert(izafat.text.includes("Gham E Akbar"), "a standalone E is not always اے");
  const unclear = normalizeRomanMarkdown(md("اے حسین غمِ اکبر", "Ae Husain Gham E Akbar"));
  assert(unclear.text.includes("Ae Husain Gham E Akbar"));
  assert.equal(unclear.findings.length, 0, "already-correct Ae must preserve unrelated izafat E");
});

test("alternate title E is corrected only when source Urdu title uses اے", () => {
  const base = md("اے حسین", "Ae Husain");
  const source = base.replace("title: نام", "title: اے حسین\nalternateTitle: \"E Husain\"");
  assert(normalizeRomanMarkdown(source).text.includes('alternateTitle: "Ae Husain"'));
  const izafat = base.replace("title: نام", "title: غمِ حسین\nalternateTitle: \"Gham E Husain\"");
  assert(normalizeRomanMarkdown(izafat).text.includes('alternateTitle: "Gham E Husain"'));
});

test("mixed vocative and izafat in canonical title stay distinct", () => {
  const source = md("اے حسین", "Ae Husain")
    .replace("title: نام", "title: اے حسین ابنِ علی\nalternateTitle: \"Ae Husain Ibn E Ali\"");
  const result = normalizeRomanMarkdown(source, "src/data/lyrics/sample.md");
  assert.equal(result.changed, false);
  assert.deepEqual(result.findings, []);
});


test("normalizes matching noon-ghunna without corrupting ordinary noon", () => {
  const source = md("جواں وہاں زماں حسین امین", "jawan wahan zaman Husain amin");
  const after = normalizeRomanMarkdown(source).text;
  assert(after.includes("jawaṅ wahaṅ zamaṅ Husain amin"), after);
  const compounds = normalizeRomanMarkdown(md("امام زماں", "Imam-e-Zaman"));
  assert(compounds.text.includes("Imam-e-Zamaṅ"));
  const vowels = normalizeRomanMarkdown(md("یوں ہوا رواں", "Youn hua Rawan"));
  assert(vowels.text.includes("Youṅ hua Rawaṅ"), vowels.text);
});

test("transliterates Urdu ڑ as r without replacing other d consonants", () => {
  const one = normalizeRomanMarkdown(md("تڑپ بڑی گھڑی", "tadap badi ghadi"));
  assert(one.text.includes("tarap bari ghari"), one.text);
  const distinct = normalizeRomanMarkdown(md("دوڑو", "Dauro"));
  assert(distinct.text.includes("Dauro"));
});

test("normalizes ye endings only against corresponding Urdu word", () => {
  const r = normalizeRomanMarkdown(md("میرے کہنے سے", "Merey Kehney se"));
  assert(r.text.includes("Mere Kehne se"), r.text);
  const s = normalizeRomanMarkdown(md("آئے گئے", "Aaey Gaey"));
  assert(s.text.includes("Aaye Gaye"), s.text);
  const h = normalizeRomanMarkdown(md("ہے", "Haey"));
  assert(h.text.includes("Hai"), h.text);
});
