// File role: Guard curated Urdu/Roman stanza alignment and transliteration standards.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { splitLyricStanzas } from "../src/lib/lyric-stanzas.ts";

const lyricDir = new URL("../src/data/lyrics/", import.meta.url);
const getSource = (file) => readFileSync(new URL(file, lyricDir), "utf8");
function editions(file) {
  const source = getSource(file);
  const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]?.replace(/^  /gm, "");
  assert.ok(roman, file + " has Roman lyrics");
  const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return { roman, urdu };
}
const blocks = (text) => splitLyricStanzas(text);
const numbers = (text) => blocks(text).filter(lines => lines[0]?.number);

test("confirmed sixth refrains occur in every numbered stanza in both scripts", () => {
  const cases = [
    ["allah-hu.md", 6, "Allah Hu, Allah Hu, Allah Hu", "اللہ ہُو، اللہ ہُو، اللہ ہُو"],
    ["asghar-main-teri-maan-hun.md", 7, "Asghar Main Teri Maan Hun", "اصغر میں تیری ماں ہوں"],
    ["karbala-karbala-karbala.md", 8, "Karbala Karbala Karbala", "کربلا کربلا کربلا"],
    ["karbala-muntazir-e-ma-ast-biya-ta-be-raweem.md", 12, "Karbala Muntazir-e-Ma Ast, Biya Ta Be Raweem", "کربلا منتظرِ ما است، بیا تا برویم"],
    ["khaime-mein-aake-shah-ne-jab-alwida-kaha.md", 8, "Kohraam Mach Gaya, Kohraam Mach Gaya", "کہرام مچ گیا، کہرام مچ گیا"],
    ["laa-raha-hun-main-lasha-e-akbar.md", 6, "Umme Laila Sambhaal Zainab Ko", "اُمِ لیلی سنبھال زینب کو"],
  ];
  for (const [file, count, romanRefrain, urduRefrain] of cases) {
    const { roman, urdu } = editions(file);
    for (const [text, refrain] of [[roman, romanRefrain], [urdu, urduRefrain]]) {
      const stanzas = numbers(text);
      assert.equal(stanzas.length, count, file);
      assert.ok(stanzas.every(lines => lines.filter(line => !line.number).length === 6), file);
      assert.ok(stanzas.every(lines => lines.at(-1)?.text.trim() === refrain), file);
    }
  }
});

test("Urdu stanza order follows the Roman reference for five corrected poems", () => {
  const firstVerses = [
    ["dil-thikana-mere-hussain-ka-hai.md", [
      "دل ٹھکانہ", "تم جسے", "کوئی پوچھے", "جس کے سائے", "یہ جو کعبہ",
      "آنا فرش", "جس جگہ", "ہو اگر", "دینے والی", "مارے اک", "اُگ رہا", "ماتمی",
      "کاش کہنے", "یہ جہاں", "مجھ میں",
    ]],
    ["faatahe-badr-o-uhad-khandaq-o-khaiber-bolay.md", [
      "فاتحِ بدر", "گاڑھ کر", "آئی مشکل", "وہ الگ", "* آج", "*باخدا",
      "یہ زچه", "خانۂ کعبہ", "دیکھ کر", "حاملِ وحی", "یہ غلامانِ",
    ]],
    ["har-sanam-kabay-main-hairaan-nazar-aata-hai.md", [
      "ہر صنم", "ماں اکیلی", "فاطمہؑ", "آج ہاتھوں", "میزباں", "نعرۂ حیدری",
      "فخرِ آدم", "جس نے", "پا کے",
    ]],
    ["haye-haye-ali-akbar.md", [
      "ارمان تھا", "اتنا تو", "اٹھارہ", "ماں تیری", "کرتی تھی",
      "ٹھہرو کہ", "پہلے تو", "تم ہچکیاں", "آئیں جو", "جب کوئی",
    ]],
    ["palaan-ki-hay-baat-ye-mimbar-ki-baat-hay.md", [
      "جبرئیل", "بعدِ نبی", "فتحِ حنین", "گونجے گا", "مومن کے",
      "کیوں کر", "بھاگے نہ", "قائم ہے", "بعدِ غدیر",
    ]],
  ];
  for (const [file, expected] of firstVerses) {
    const lines = numbers(editions(file).urdu);
    assert.equal(lines.length, expected.length, file);
    assert.ok(lines.every((block, index) => block[1]?.text.startsWith(expected[index])), file);
  }
});

test("Roman names and standard word endings are normalized in non-Basta lyrics", () => {
  const files = readdirSync(lyricDir).filter(name => name.endsWith(".md"));
  assert.equal(files.length, 129);
  for (const file of files) {
    const source = getSource(file);
    const roman = editions(file).roman;
    assert.doesNotMatch(roman, /hussain|hassan|\bbolay\b/i, file);
    const title = source.match(/^alternateTitle: "([^"]*)"$/m)?.[1] || "";
    assert.doesNotMatch(title, /hussain|hassan|\bbolay\b/i, file);
  }
});

test("the alternate 2+2+2 layout is declared only for Karbala Karbala Karbala", () => {
  const src = getSource("karbala-karbala-karbala.md");
  assert.match(src, /^sixVerseLayout: "pairs"$/m);
  const css = readFileSync(new URL("../src/styles/lyrics.css", import.meta.url), "utf8");
  assert.match(css, /lyric-stanza-pairs/);
  assert.match(css, /nth-last-child\(5\)/);
  assert.match(css, /nth-last-child\(3\)/);
});

test("Basta Roman source has canonical Husain/Hasan spellings", () => {
  const directory = new URL("../src/data/basta/roman/", import.meta.url);
  const files = readdirSync(directory).filter(filename => filename.endsWith(".md"));
  assert.equal(files.length, 379);
  for (const file of files) {
    const source = readFileSync(new URL(file, directory), "utf8");
    assert.doesNotMatch(source, /hussain|hassan|\bbolay\b/i, file);
  }
});
