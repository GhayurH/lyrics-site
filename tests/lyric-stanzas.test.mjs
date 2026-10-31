// File role: Non-Basta stanza boundary regressions. Blank lines, not verse counts, delimit stanzas.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { splitLyricStanzas, layoutLyricStanzas } from "../src/lib/lyric-stanzas.ts";
import { parseStanzaNumber } from "../src/lib/stanza-numbers.ts";

test("blank lines alone delimit stanzas; one blank or many behave identically", () => {
  const blocks = splitLyricStanzas("one\ntwo\n\nthree\nfour\n\n\n five\nsix");
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map(block => block.map(line => line.text)), [
    ["one", "two"], ["three", "four"], [" five", "six"],
  ]);
});

test("standalone numbers are preserved while numerals embedded in verses are not markers", () => {
  const stanzas = splitLyricStanzas("۱\nپہلا مصرع 2\nدوسرا مصرع\n\n2\nthird line");
  assert.deepEqual(stanzas.map(block => block.map(line => line.number)), [
    [true, false, false], [true, false],
  ]);
  assert.equal(parseStanzaNumber("۶"), "۶");
  assert.equal(parseStanzaNumber("6"), "6");
  assert.equal(parseStanzaNumber("6 verses"), null);
});

test("real Urdu non-Basta Markdown retains numbered stanzas and source breaks", () => {
  const source = readFileSync(new URL("../src/data/lyrics/aa-asghar-bin-tere.md", import.meta.url), "utf8");
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const stanzas = splitLyricStanzas(body);
  assert.equal(stanzas.length, 6);
  assert.deepEqual(stanzas.slice(1).map(block => block[0].text), ["۱", "۲", "۳", "۴", "۵"]);
  assert.ok(stanzas.slice(1).every(block => block.length >= 3));
});


test("non-Basta Urdu and Roman standalone stanza numbering is circle-ready", () => {
  const urdu = splitLyricStanzas("۱.\nاردو مصرع\nاردو مصرع\n\n۲\nاور مصرع");
  const roman = splitLyricStanzas("1)\nRoman line\nRoman line\n\n2\nOther line");
  assert.deepEqual(urdu.map(block => block[0].text), ["۱", "۲"]);
  assert.deepEqual(roman.map(block => block[0].text), ["1", "2"]);
  assert.ok(urdu.every(block => block[0].number));
  assert.ok(roman.every(block => block[0].number));
  assert.ok(!urdu[0][1].number && !roman[0][1].number);
});

test("six-line Maula Ali stanzas have matching Urdu and Roman refrains", () => {
  const source = readFileSync(new URL("../src/data/lyrics/yeh-maula-ali-hai.md", import.meta.url), "utf8");
  const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]
    .replace(/^  /gm, "");
  assert.ok(roman);
  const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  for (const [text, refrain] of [
    [roman, "Ye Maula Ali Maula Ali Maula Ali hai"],
    [urdu, "یہ مولا علی مولا علی مولا علی ہے"],
  ]) {
    const stanzas = splitLyricStanzas(text);
    assert.equal(stanzas.length, 10);
    assert.ok(stanzas.every(block => block.length === 7 && block[0].number));
    assert.ok(stanzas.every(block => block.at(-1).text === refrain));
  }
});

test("the missing Roman stanzas align in number with their Urdu sources", () => {
  for (const [filename, expectedCount] of [
    ["shareek-e-dawat-e-islam-hain-abu-talib.md", 16],
    ["khutba-e-moula-abbas.md", 7],
  ]) {
    const source = readFileSync(new URL("../src/data/lyrics/" + filename, import.meta.url), "utf8");
    const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]
      .replace(/^  /gm, "");
    assert.ok(roman);
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const romanStanzas = splitLyricStanzas(roman);
    const urduStanzas = splitLyricStanzas(urdu);
    assert.equal(romanStanzas.length, expectedCount, filename + " Roman stanza count");
    assert.equal(urduStanzas.length, expectedCount, filename + " Urdu stanza count");
    assert.ok(romanStanzas.every(stanza => stanza.filter(line => !line.number).length === 6));
    assert.ok(urduStanzas.every(stanza => stanza.length >= 6));
  }
});


test("all non-Basta lyrics contain separate Urdu and Roman stanza numbers", () => {
  const dir = new URL("../src/data/lyrics/", import.meta.url);
  const files = readdirSync(dir).filter(name => name.endsWith(".md"));
  assert.equal(files.length, 129);
  for (const filename of files) {
    const source = readFileSync(new URL(filename, dir), "utf8");
    const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]
      .replace(/^  /gm, "");
    assert.ok(roman, filename + " has Roman lyrics");
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    for (const [label, value] of [["Roman", roman], ["Urdu", urdu]]) {
      const groups = splitLyricStanzas(value);
      assert.ok(groups.some(lines => lines[0]?.number),
        filename + " missing " + label + " stanza markers");
    }
  }
});

test("newly numbered standalone poems have consecutive Urdu and Roman markers", () => {
  const expected = [
    ["aao-ro-lein-shahe-karbala-ko.md", 5],
    ["agar-na-hotin-janabe-zainab.md", 17],
    ["aik-roz-aik-sahib.md", 8],
    ["bahar-aayi-bahar-aayi-zehra-ke-ghar.md", 5],
    ["dil-thikana-mere-hussain-ka-hai.md", 15],
    ["faatahe-badr-o-uhad-khandaq-o-khaiber-bolay.md", 11],
    ["fatima-ke-chain-ne.md", 8],
    ["ham-se-pucha-ke-kiya-zaruri-hai.md", 9],
    ["har-sanam-kabay-main-hairaan-nazar-aata-hai.md", 9],
    ["jahan-hussain-wahan-la-ilaha-illallah.md", 11],
    ["jurrat-ke-qabile-ka-sardar-ali-mola.md", 2],
    ["karbala-karbala-karbala.md", 8],
    ["khabar-la-makan-ke-makan.md", 10],
    ["lazim-thi-mujh-pe-rad-e-bala.md", 9],
    ["main-azmaton-ka-sawera-hun-naam-qasim-hai.md", 6],
    ["mazhar-e-rab-e-zuljalal-ali.md", 8],
    ["meri-basti-ke-musalman-bare-bhole-hain.md", 11],
    ["midhat-e-haider-mere-lab-par-zara-aanay-to-do.md", 6],
    ["mujrayi-khalq-mein.md", 10],
    ["munajat-imam-e-zamana.md", 11],
    ["na-bhool-kar-bhi.md", 11],
    ["naad-e-ali-ka-wird-jo-karti-chali-gayi.md", 9],
    ["naazan-hai-hum-ke-hum-ko-dare-murtaza-milaa.md", 8],
    ["nahin-hoti-gunahgaron-pe-rehmat.md", 5],
    ["parchame-ghazi-lehrata-ghar-ghar-dekha.md", 9],
    ["paya-ghazi-hussain-ne.md", 4],
    ["qadam-qadam-pe-ali-ko-pukarte-rehna.md", 7],
  ];
  for (const [filename, count] of expected) {
    const source = readFileSync(new URL("../src/data/lyrics/" + filename, import.meta.url), "utf8");
    const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1].replace(/^  /gm, "");
    assert.ok(roman, filename + " has Roman source");
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    for (const value of [roman, urdu]) {
      const numbers = splitLyricStanzas(value)
        .filter(block => block[0]?.number).map(block => block[0].text);
      const normalized = numbers.map(n => Number([...n].map(d => {
        const x = d.charCodeAt(0);
        return x >= 0x6f0 && x <= 0x6f9 ? x - 0x6f0 : d;
      }).join("")));
      assert.deepEqual(normalized, Array.from({ length: count }, (_, i) => i + 1), filename);
    }
  }
});

test("meaningful asterisks in source poetry remain intact", () => {
  const dir = new URL("../src/data/lyrics/", import.meta.url);
  const marked = [
    ["faatahe-badr-o-uhad-khandaq-o-khaiber-bolay.md", ["*aaj to", "*Baakhuda", "* آج تو", "*باخدا"]],
    ["yeh-maula-ali-hai.md", ["*اس گلِ", "*حاتم ہے", "*یہ آخری", "*یہ کون ہے"]],
  ];
  for (const [filename, markers] of marked) {
    const source = readFileSync(new URL(filename, dir), "utf8");
    for (const marker of markers) assert.ok(source.includes(marker), filename + " missing " + marker);
  }
});

test("render split 4+2 numbered six-verse stanzas as single framed groups", () => {
  const cases = [
    ["ab-aey-hawaon-kuch-khak-urao.md", 4],
    ["al-ajal-al-ajal-ya-imam-e-zamana-al-ajal.md", 8],
    ["daastaan-e-shujaat-ka-darain-mein.md", 5],
    ["hussain-al-ghareeb.md", 8],
    ["meri-marqad-bana-lena.md", 8],
    ["taqaddam-waladi.md", 10],
    ["ya-zahra.md", 8],
  ];
  for (const [filename, expectedSixStanzas] of cases) {
    const source = readFileSync(new URL("../src/data/lyrics/" + filename, import.meta.url), "utf8");
    const roman = source.match(/romanLyrics: \|-\n([\s\S]*?)\n---\n/)?.[1]?.replace(/^  /gm, "");
    assert.ok(roman, filename);
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    for (const text of [roman, urdu]) {
      const original = splitLyricStanzas(text);
      const displayed = layoutLyricStanzas(text);
      const sixStanzas = displayed.filter(block =>
        block[0]?.number && block.filter(line => !line.number).length === 6);
      assert.equal(sixStanzas.length, expectedSixStanzas, filename + " six-verse stanza count");
      assert.deepEqual(displayed.flat(), original.flat(), filename + " verse text and order preserved");
      assert.ok(sixStanzas.every(block => block.at(-1) && !block.at(-1).number));
    }
  }
});

test("already grouped six-verse stanzas retain their numbers and text", () => {
  for (const filename of [
    "yeh-maula-ali-hai.md",
    "khutba-e-moula-abbas.md",
    "shareek-e-dawat-e-islam-hain-abu-talib.md",
    "chehlum-jo-karbala-mein-bahattar-ka-ho-chuka.md",
  ]) {
    const source = readFileSync(new URL("../src/data/lyrics/" + filename, import.meta.url), "utf8");
    const urdu = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const original = splitLyricStanzas(urdu);
    assert.deepEqual(layoutLyricStanzas(urdu), original, filename);
    assert.ok(original.every(block => block.filter(line => !line.number).length === 6), filename);
  }
});

test("rendering doesn't combine unrelated opening refrains or adjacent couplets", () => {
  const intro = "intro one\nintro two\n\nrefrain one\nrefrain two\n\n۱\nfirst\nsecond\nthird\nfourth\n\nending one\nending two\n\n۲\none\ntwo\nthree\nfour\n\nending three\nending four";
  const groups = layoutLyricStanzas(intro);
  assert.deepEqual(groups.map(g => g.filter(l => !l.number).length), [2, 2, 6, 6]);
  assert.equal(groups[2][0].text, "۱");
  assert.equal(groups[3][0].text, "۲");
  const couplets = "۱\nline a\nline b\n\nline c\nline d\n\nline e\nline f";
  assert.deepEqual(layoutLyricStanzas(couplets), splitLyricStanzas(couplets));
  const unnumbered = "opening one\nopening two\nopening three\nopening four\n\nclosing one\nclosing two\n\n۱\nnext one\nnext two\nnext three\nnext four";
  const opening = layoutLyricStanzas(unnumbered);
  assert.equal(opening.length, 2);
  assert.equal(opening[0].length, 6);
});
