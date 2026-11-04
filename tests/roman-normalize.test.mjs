import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRomanMarkdown } from "../scripts/lib/roman-normalize.mjs";

const md = (urdu, roman) => "---\ntitle: نام\nromanLyrics: |-\n" +
  roman.split("\n").map(line => line ? "  " + line : "").join("\n") +
  "\n---\n" + urdu + "\n";
const normalize = (urdu, roman) => normalizeRomanMarkdown(md(urdu, roman), "src/data/lyrics/sample.md");

/** Every case must produce the expected complete Roman line and a stable result. */
function assertReading(urdu, input, expected) {
  const first = normalize(urdu, input);
  const line = first.text.split("romanLyrics: |-\n")[1]?.split("\n")[0];
  assert.equal(line, "  " + expected, JSON.stringify({ urdu, input }));
  const again = normalizeRomanMarkdown(first.text, "src/data/lyrics/sample.md");
  assert.equal(again.changed, false, "normalization must converge after one pass");
}

test("Urdu-backed vowels, consonants, nasalization and joined endings", () => {
  for (const [urdu, input, expected] of [
      ["حسین کے خون میں کیوں نہیں ہیں", "Hussain ke khoon mein kyun nahin hain", "Husain ke khun meiṅ kiuṅ nahiṅ haiṅ"],
      ["جواں وہاں زماں حسین امین", "jawan wahan zaman Husain amin", "jawaṅ wahaṅ zamaṅ Husain amin"],
      ["امام زماں", "Imam-e-Zaman", "Imam-e-Zamaṅ"],
      ["یوں ہوا رواں", "Youn hua Rawan", "Youṅ hua Rawaṅ"],
      ["تڑپ بڑی گھڑی", "tadap badi ghadi", "tarap bari ghari"],
      ["دوڑو", "Dauro", "Dauro"],
      ["میرے کہنے سے", "Merey Kehney se", "Mere Kehne se"],
      ["آئے گئے", "Aaey Gaey", "Aaye Gaye"],
      ["ہے", "Haey", "Hai"],
      ["بچوں کو ویراں", "bachchon ko viran", "bachchoṅ ko viraaṅ"],
      ["کیوں کر ایسا ہوا", "Kyunkar aisa hua", "Kiuṅkar aisa hua"],
      ["بچیوں کی آنکھوں", "bachchiyon ki aakhon", "bachchiyoṅ ki aankhoṅ"],
      ["گیسوؤں میں", "gaisuo'n meiṅ", "gaisuoṅ meiṅ"],
      ["وہ خون رو کے یہ کہتا", "Wo khoon ro ke kehta", "Wo khun ro ke kehta"],
      ["ہوں گے", "honge", "hoṅge"],
      ["آئیں گے", "aayenge", "aayeṅge"],
      ["کہیں گی", "kahengi", "kaheṅgi"],
      ["کریں گے", "karenge", "kareṅge"],
      ["دیں گے", "denge", "deṅge"],
      ["رولیں", "ro len", "ro leṅ"],
      ["میں نے", "Maine", "Maiṅ ne"]
  ])
    assertReading(urdu, input, expected);
});

test("Phonetic ayn/hamza substitutions work in Urdu and Arabic quotations", () => {
  for (const [urdu, input, expected] of [
      ["قطعات", "Qita'aat", "Qitaat"],
      ["قطعہ", "Qit'a", "Qita"],
      ["زعفر", "Za'far", "Zafar"],
      ["شفاعت", "shafa’at", "shafaat"],
      ["معذور", "Ma’zur", "Maazur"],
      ["تعجیل", "ta’jil", "taajil"],
      ["جھکتی", "jhuk'ti", "jhukti"],
      ["اٹھتا", "uth'ta", "uthta"],
      ["سائلوں", "Sa'ilon", "Sailoṅ"],
      ["لعینوں", "la'inon", "lainoṅ"],
      ["ساعت", "Saa’at", "Saaat"],
      ["يَا سَرِيعَ الرِّضَا", "Ya Sari'ar-Riza", "Ya Saria-r-Riza"],
      ["الدُّعَاءَ", "Du'a", "Duaa"],
      ["فَعَّالٌ", "Fa''alun", "Faaalun"],
      ["تَشَاءُ", "Tasha'", "Tashaa"],
      ["دَوَاءٌ", "Dawa'un", "Dawaaun"],
      ["شِفَاءٌ", "Shifa'un", "Shifaaun"],
      ["طَاعَتُهُ", "Ta'atuhu", "Taaatuhu"],
      ["ائِمّہ", "A'imma", "Aimma"],
      ["شیعیان", "Shia'an", "Shiaan"],
      ["اَسئَلُکُم", "as'alukum", "asalukum"],
      ["السَّمَاءُ", "s-sama'u", "s-samaau"],
      ["وُقُوعُ", "Wuq'u", "Wuqua"],
      ["گلعِزار", "gul'izaar", "gulaizaar"]
  ])
    assertReading(urdu, input, expected);
  assertReading("یاعلی کی", "'Ya Ali' ki", "'Ya Ali' ki");
  assertReading("شاعری", "Qit'a", "Qit'a"); // Different source word: no guessed edit
});

test("Canonically spelled words are not rewritten by misleading Urdu token positions", () => {
  assertReading("جو دعا کی تھی علی نے اس کے مقصد کی آمین",
    "Jo dua ki thi Ali ne us ke maqsad ki amin",
    "Jo dua ki thi Ali ne us ke maqsad ki amin");
  assertReading("کہاں ہے میرا حسین", "Kahan hai mera Husain", "Kahaṅ hai mera Husain");
  assertReading("بچن اپنا", "bachchon apna", "bachchon apna");
  assertReading("امن میں", "aman meiṅ", "aman meiṅ");
  assertReading("ہونہ", "honge", "honge");
  assertReading("زہرا", "Zahra", "Zahra");
});

test("Vocative Ae and explicitly marked izafat are distinct", () => {
  for (const [urdu, input, expected] of [
    ["اے فرضی باپ کے بیٹوں", "E farzi baap ke betoṅ", "Ae farzi baap ke betoṅ"],
    ["چلے آؤ اے ابن", "Chale aao e Ibn", "Chale aao ae Ibn"],
    ["اے مولا", "Ay Maula", "Ae Maula"],
    ["غمِ اکبر میں", "Gham E Akbar meiṅ", "Gham-e-Akbar meiṅ"],
    ["غم اکبر میں", "Gham E Akbar meiṅ", "Gham E Akbar meiṅ"],
    ["اے حسین غمِ اکبر", "Ae Husain Gham E Akbar", "Ae Husain Gham-e-Akbar"],
  ]) assertReading(urdu, input, expected);
});

test("Compound boundaries, poem-specific name readings and (x2) notation", () => {
  assertReading("شب و روز بے وفا بار بار زہرا",
    "Shab-o-Roz be-wafa bar-bar Zehra", "Shab o Roz bewafa baar baar Zehra");
  assertReading("بار بار", "baar-baar", "baar baar");
  for (const [urdu, input, expected] of [
    ["وہ مارتی تھیں", "Wo maarti thin (x2)", "Wo maarti thiṅ"],
    ["وہ مارتی تھیں", "(x2) Wo maarti thin", "Wo maarti thiṅ"],
    ["وہ مارتی تھیں سکینہ کو", "Wo maarti thin (x2) Sakina ko", "Wo maarti thiṅ, Sakina ko"],
  ]) {
    const result = normalize(urdu, input);
    const line = result.text.split("romanLyrics: |-\n")[1]?.split("\n")[0];
    assert.equal(line, "  " + expected);
    assert.equal(result.removedRepetitions, 1);
    assert(!/<\/?u>|\(x2\)/iu.test(result.text));
  }
});

test("Roman titles, haal and accessible captions use the same spelling policy", () => {
  const source = md("میرے امام زماں", "Mere Imam-e-Zaman").replace(
    "title: نام", [
      'title: "میرے امام زماں"',
      'alternateTitle: "Mere Imam Zaman"',
      'coverAlt: "Cover image for Mere Imam Zaman"',
      'haal: "امام زماں"',
      'romanHaal: "Imam Zaman"',
      'aliases:',
      '  - "Mere Imam Zaman"',
    ].join("\n"));
  const result = normalizeRomanMarkdown(source, "src/data/lyrics/sample.md");
  assert(result.text.includes('alternateTitle: "Mere Imam Zamaṅ"'));
  assert(result.text.includes('coverAlt: "Cover image for Mere Imam Zamaṅ"'));
  assert(result.text.includes('romanHaal: "Imam Zamaṅ"'));
  assert(result.text.includes('  - "Mere Imam Zaman"'), "historical search aliases are immutable");
  const vocative = md("اے حسین", "Ae Husain").replace("title: نام",
    'title: "اے حسین"\nalternateTitle: "E Husain"');
  assert(normalizeRomanMarkdown(vocative).text.includes('alternateTitle: "Ae Husain"'));
  const izafat = md("غمِ حسین", "Gham E Husain").replace("title: نام",
    'title: "غمِ حسین"\nalternateTitle: "Gham E Husain"');
  assert(normalizeRomanMarkdown(izafat).text.includes('alternateTitle: "Gham-e-Husain"'));
  const mixed = md("اے حسین ابنِ علی", "Ae Husain Ibn E Ali").replace("title: نام",
    'title: "اے حسین ابنِ علی"\nalternateTitle: "Ae Husain Ibn E Ali"');
  assert(normalizeRomanMarkdown(mixed).text.includes('alternateTitle: "Ae Husain Ibn-e-Ali"'));
});

test("Source scope prevents overwriting missing Basta translations or English appendices", () => {
  const missing = "---\npage: 140\n---\nاردو\n";
  const a = normalizeRomanMarkdown(missing, "src/data/basta/pages/140.md");
  assert.equal(a.changed, false);
  assert.deepEqual(a.findings, []);
  assert(normalizeRomanMarkdown(missing, "src/data/lyrics/sample.md")
    .findings.some(finding => finding.includes("no Roman")));
  const appendix = "---\npage: 471\ncontentKind: english-appendix\nromanLyrics: |-\n" +
    "  Schoolbook example\n---\nSchoolbook example\n";
  assert.equal(normalizeRomanMarkdown(appendix, "src/data/basta/pages/471.md").text, appendix);
  const urdu = "حسین کے خون میں کیوں نہیں ہیں";
  const source = md(urdu, "Hussain ke khoon mein kyun nahin hain");
  const changed = normalizeRomanMarkdown(source, "src/data/lyrics/sample.md");
  assert.equal(changed.paired, 1);
  assert(changed.text.endsWith("---\n" + urdu + "\n"), "never edit authoritative Urdu");
});
