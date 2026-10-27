import test from "node:test";
import assert from "node:assert/strict";
import {
  bastaKalamId, buildBastaKalamCatalog, normalizePrintedStanzaNumber,
  resolveStanzaSequence,
} from "../src/lib/basta-kalam-units.ts";

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
