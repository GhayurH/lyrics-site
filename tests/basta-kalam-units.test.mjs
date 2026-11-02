import test from "node:test";
import assert from "node:assert/strict";
import {
  bastaKalamId, buildBastaKalamCatalog, normalizePrintedStanzaNumber,
  resolveStanzaSequence,
} from "../src/lib/basta-kalam-units.ts";
import { auditBastaEditorial } from "../src/lib/basta-editorial-audit.ts";
import { readFile } from "node:fs/promises";

const first = {
  section: "مراثی", sectionRoman: "Marsiye", number: 1,
  name: "گھر سے جب بہر سفر", page: 142,
};
const second = {
  section: "مراثی", sectionRoman: "Marsiye", number: 2,
  name: "جاتی ہے بہار", page: 143,
};
const catalog = () => buildBastaKalamCatalog([first, second], [
  { page: 142, urdu: "گھر سے جب بہر سفر\n\n۱\nپہلا شعر\nدوسرا شعر\n\n۲\nتیسرا شعر",
    roman: "Ghar se jab\n\n1\nPehla sher\nDusra sher\n\n2\nTisra sher" },
  { page: 143, urdu: "چوتھا شعر\n\n۳\nپانچواں شعر\n\n---***---\n\nجاتی ہے بہار\n\n۱\nدوسرا کلام",
    roman: "Chautha sher\n\n3\nPanchwan sher\n\n---***---\n\nJati hai bahar\n\n1\nDusra kalam" },
  { page: 144, urdu: "۲\nاگلا بند", roman: "2\nAgla band" },
]);

test("stable IDs use index numbers, not mutable spellings", () => {
  assert.equal(bastaKalamId(first), "basta-marsiye-001");
  assert.equal(normalizePrintedStanzaNumber("۱۲"), 12);
  assert.equal(normalizePrintedStanzaNumber("١٢."), 12);
  assert.equal(normalizePrintedStanzaNumber("۱۲۳ (متن)"), null);
});

test("kalams keep identity across page boundaries and isolate stanzas", () => {
  const { kalams, orphans } = catalog();
  assert.equal(orphans.length, 0);
  assert.equal(kalams[0].status, "ready");
  assert.deepEqual(kalams[0].pages, [142, 143]);
  assert.deepEqual(kalams[0].stanzas.map((item) => item.number), [1, 2, 3]);
  assert.match(kalams[0].stanzas[1].urdu, /چوتھا شعر/);
  assert.equal(kalams[0].stanzas[2].roman, "Panchwan sher");
  assert.deepEqual(kalams[1].pages, [143, 144]);
  assert.deepEqual(kalams[1].stanzas.map((item) => item.number), [1, 2]);
  assert.doesNotMatch(kalams[0].urdu, /دوسرا کلام/);
});

test("a reciter can reorder and borrow verified stanzas without altering source", () => {
  const { kalams } = catalog();
  const sequence = resolveStanzaSequence({
    kalamId: kalams[0].id,
    stanzaSequence: [
      { kalamId: kalams[0].id, stanzaId: "stanza-003" },
      { kalamId: kalams[1].id, stanzaId: "stanza-001" },
      { kalamId: kalams[0].id, stanzaId: "stanza-001" },
    ],
  }, kalams);
  assert.deepEqual(sequence.map((item) => item.urdu), [
    "پانچواں شعر", "دوسرا کلام", "پہلا شعر\nدوسرا شعر",
  ]);
  assert.equal(sequence[1].sourceKalamId, kalams[1].id);
  assert.equal(kalams[0].stanzas.length, 3);
});

test("repeated stanza numbers require review instead of ambiguous IDs", () => {
  const report = buildBastaKalamCatalog([first], [{
    page: 142, urdu: "گھر سے جب بہر سفر\n\n۱\nالف\n\n۱\nب",
  }]);
  assert.equal(report.kalams[0].status, "review");
  assert.match(report.kalams[0].issues.join(" "), /Repeated stanza number/);
});

test("missing separators never silently merge two indexed poems", () => {
  const report = buildBastaKalamCatalog([{ ...first, page: 142 }, { ...second, page: 142 }], [{
    page: 142, urdu: "گھر سے جب بہر سفر\n۱\nالف\nجاتی ہے بہار\n۱\nب",
  }]);
  assert.equal(report.kalams.some((item) => item.status === "review"), true);
});


test("extra unindexed parts are audited instead of assigned to indexed poems", () => {
  const entries = [
    { ...first, page: 139, number: 82 },
    ...[86, 87, 88, 89].map((number) => ({
      ...first, page: 140, number, name: "Index " + number,
    })),
  ];
  const parts = ["continuation", "poem 86", "poem 87", "unindexed", "poem 88", "poem 89"];
  const result = buildBastaKalamCatalog(entries, [
    { page: 139, urdu: "Original beginning" },
    { page: 140, urdu: parts.join("\n---***---\n") },
  ]);
  assert.equal(result.orphans.length, 1);
  assert.equal(result.orphans[0].opening, "unindexed");
  assert.match(result.kalams[0].urdu, /continuation/);
  assert.equal(result.kalams[1].urdu, "poem 86");
  assert.equal(result.kalams[3].urdu, "poem 88");
});


test("multi-fragment pages retain the numbered continuation but not adjacent poems", () => {
  const result = buildBastaKalamCatalog([
    { ...first, page: 173, number: 27, name: "پچھلا مرثیہ" },
    { ...second, page: 175, number: 28, name: "نیا مرثیہ" },
  ], [
    { page: 173, urdu: "پچھلا مرثیہ\n۱\nپہلا\n۲\nدوسرا",
      roman: "Pichhla marsiya\n1\nPehla\n2\nDusra" },
    { page: 174, urdu: "۳\nتیسرا\n---***---\nالگ کلام",
      roman: "3\nTisra\n---***---\nAlag kalam" },
    { page: 175, urdu: "نیا مرثیہ\n۱\nاوّل\n۲\nدوم",
      roman: "Naya marsiya\n1\nAwwal\n2\nDom" },
    { page: 176, urdu: "۳\nسوم\n---***---\nایک الگ شعر\n---***---\nدوسرا الگ شعر",
      roman: "3\nSom\n---***---\nEk alag sher\n---***---\nDusra alag sher" },
  ]);
  assert.deepEqual(result.kalams.map(k => k.pages), [[173, 174], [175, 176]]);
  assert.deepEqual(result.kalams.map(k => k.stanzas.map(s => s.number)), [[1, 2, 3], [1, 2, 3]]);
  assert.deepEqual(result.kalams.map(k => k.status), ["ready", "ready"]);
  assert.equal(result.orphans.length, 3);
  assert.deepEqual(result.orphans.map(o => o.page), [174, 176, 176]);
  assert.doesNotMatch(result.kalams[1].urdu, /ایک الگ شعر/);
});

test("a new indexed poem followed by an unindexed excerpt is not mistaken for a continuation", () => {
  const previous = { ...first, number: 81, page: 137, name: "پچھلا کلام" };
  const current = { ...first, number: 82, page: 138, name: "اے چاند کربلا کے تو نے تو دیکھے" };
  const result = buildBastaKalamCatalog([previous, current], [
    { page: 137, urdu: "پچھلا کلام\n\n۱\nسابق شعر" },
    { page: 138, urdu: "اے چاند کربلا کے تو نے تو دیکھے\n\n۱\nنیا شعر\n---***---\nبین\n\nایک الگ کلام" },
  ]);
  assert.equal(result.kalams[0].status, "ready");
  assert.equal(result.kalams[1].status, "ready");
  assert.deepEqual(result.kalams[1].pages, [138]);
  assert.doesNotMatch(result.kalams[1].urdu, /ایک الگ کلام/);
  assert.equal(result.orphans[0].page, 138);
});

// Real source fixtures and editorial audit invariants.
async function file(path) {
  return readFile(new URL("../src/data/basta/" + path, import.meta.url), "utf8");
}
function body(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

test("editorial diagnostics report duplicate IDs, Roman gaps and separator mismatch without modifying sources", () => {
  const index = [
    { sectionRoman: "Salam", number: 1, name: "سلام", romanName: "Salam", page: 42 },
    { sectionRoman: "Salam", number: 1, name: "دوسرا", page: 43 },
  ];
  const pages = [
    { page:42, urdu:"اوّل\n---***---\nدوم", roman:"First" },
    { page:43, urdu:"واحد" },
  ];
  const original = JSON.stringify({index,pages});
  const result = auditBastaEditorial(index,pages);
  assert.deepEqual(result.duplicateIndexEntries,["Salam:1"]);
  assert.deepEqual(result.absentRomanTranscriptions,[43]);
  assert.deepEqual(result.mismatchedPageBoundaries,[42]);
  assert.deepEqual(result.missingRomanTitles,["Salam:1"]);
  assert.deepEqual(result.nonMonotonicSectionNumbers,["Salam:1"]);
  assert.equal(JSON.stringify({index,pages}),original);
});

test("an exact single-word title can identify a poem after an unindexed excerpt", () => {
  const entries = [
    { ...first, name: "پچھلا کلام", number: 1, page: 150 },
    { ...second, name: "رخصتی", number: 2, page: 151 },
  ];
  const result = buildBastaKalamCatalog(entries, [
    { page: 150, urdu: "پچھلا کلام\n۱\nپہلی سطر" },
    {
      page: 151,
      urdu: [
        "۲", "دوسری سطر", "---***---",
        "ایک الگ غیر درج کلام", "ایک اور سطر", "---***---",
        "رخصتی", "یہ عنوان ہے", "دوسری سطر",
      ].join("\n"),
    },
  ]);
  assert.equal(result.kalams[0].status, "ready");
  assert.equal(result.kalams[1].status, "ready");
  assert.equal(result.kalams[1].startPage, 151);
  assert.deepEqual(result.kalams[1].pages, [151]);
  assert.equal(result.orphans.length, 1);
});


test("representative complex Basta pages retain aligned Roman and Urdu poem structures", async () => {
  // Multi-kalam boundaries, split bylines, editorial subtitles, refrains,
  // and varied stanza lengths are permanent rendering contracts.
  const pages = [342, 344, 367, 375, 385, 393, 398, 399, 428, 435, 451];
  const layout = (text) => body(text).split("\n").map((line) =>
    line.trim() === "---***---" ? "boundary" : line.trim() ? "verse" : "blank");
  for (const page of pages) {
    const [urdu, roman] = await Promise.all([
      file("pages/" + page + ".md"), file("roman/" + page + ".md"),
    ]);
    assert.deepEqual(layout(roman), layout(urdu), "Basta page " + page);
  }
});

test("exact short Urdu titles are distinct from their neighboring continuations", () => {
  const result = buildBastaKalamCatalog([
    { ...first, page: 434, number: 38, name: "اے خمینی زندہ باد" },
    { ...first, page: 435, number: 39, name: "اے پاک وطن پائندہ باد" },
    { ...first, page: 435, number: 40, name: "ماں" },
  ], [
    { page: 434, urdu: "اے خمینی زندہ باد\nپہلا شعر" },
    { page: 435, urdu: [
      "بقیہ کلام", "---***---",
      "(مطبوعہ حاشیہ)", "اے پاک وطن پائندہ باد", "پہلا شعر",
      "---***---", "ماں", "دوسرا شعر",
    ].join("\n") },
  ]);
  assert.deepEqual(result.kalams.map(k => k.status), ["ready", "ready", "ready"]);
  assert.deepEqual(result.kalams.map(k => k.pages), [[434, 435], [435], [435]]);
  assert.equal(result.orphans.length, 0);
});

test("a gap cannot join an indexed poem to a later appendix", () => {
  const result = buildBastaKalamCatalog([first], [
    { page: 142, urdu: "گھر سے جب بہر سفر\nشروع" },
    { page: 150, urdu: "An English appendix without an index entry" },
  ]);
  assert.deepEqual(result.kalams[0].pages, [142]);
  assert.equal(result.orphans.length, 1);
});

test("page 451 is a subtitle of poem 49 rather than a new indexed identity", async () => {
  const index = JSON.parse(await file("index.json"));
  const entries = index.filter((item) => item.sectionRoman === "Mutafarriqat-o-Qaumiyat");
  assert.ok(entries.some((item) => item.number === 49 && item.page === 444));
  assert.equal(entries.some((item) => item.number === 50), false);
  assert.ok(entries.some((item) => item.number === 51 && item.page === 454));
  const locks = JSON.parse(await readFile(
    new URL("../src/data/recitation/identity-lock.json", import.meta.url), "utf8"));
  const retired = locks.basta.find((item) => item.id === "basta-mutafarriqat-o-qaumiyat-050");
  assert.equal(retired?.retired, true);
  for (const kind of ["pages", "roman"]) {
    assert.match(body(await file(kind + "/451.md")), /\[\[subtitle\]\]/);
  }
});
