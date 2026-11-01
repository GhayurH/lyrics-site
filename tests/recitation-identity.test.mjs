import test from "node:test";
import assert from "node:assert/strict";
import { stanzaAnchor, applyRecitationIds, safeStanzaAnchorRefresh, stanzaPageLabel } from "../src/lib/recitation-identity.ts";
import { bastaKalamId } from "../src/lib/basta-kalam-units.ts";

test("printed Marsiya renumbering preserves locked IDs", () => {
  const stanza = { id: "stanza-007", urdu: "یک شعر\nدوسرا شعر", number: 7 };
  const anchor = stanzaAnchor(stanza.urdu);
  const lock = { version: 1, lyrics: [], basta: [{
    id: "basta-marsiye-001", key: "Marsiye:1",
    stanzas: [{ id: "stanza-002", anchor }],
  }] };
  const [poem] = applyRecitationIds([{
    id: "basta-marsiye-001", status: "ready", stanzas: [stanza],
  }], lock);
  assert.equal(poem.stanzas[0].id, "stanza-002");
  assert.equal(poem.stanzas[0].number, 7);
});
test("a different stanza never inherits the former stanza's ID", () => {
  const lock = { version: 1, lyrics: [], basta: [{
    id: "basta-marsiye-001", key: "Marsiye:1",
    stanzas: [{ id: "stanza-002", anchor: stanzaAnchor("اصل متن\nدوسرا مصرع") }],
  }] };
  const [poem] = applyRecitationIds([{
    id: "basta-marsiye-001", status: "ready", stanzas: [
      { id: "stanza-002", urdu: "مختلف متن\nمختلف مصرع" },
    ],
  }], lock);
  assert.match(poem.stanzas[0].id, /^unverified-/);
  assert.notEqual(poem.stanzas[0].id, "stanza-002");
});
test("a renamed or reclassified Basta poem can retain its stable ID", () => {
  assert.equal(bastaKalamId({
    sectionRoman: "Salam", number: 99, name: "Renamed",
    recitationId: "basta-marsiye-001", page: 300,
  }), "basta-marsiye-001");
});
test("stanza fingerprints ignore spacing and diacritics but not different text", () => {
  assert.equal(stanzaAnchor("سَلام  \nہے"), stanzaAnchor("سلام\nہے"));
  assert.notEqual(stanzaAnchor("سلام\nہے"), stanzaAnchor("سلام\nنہیں"));
});

test("explicit sync can safely refresh one edited stanza with unchanged neighbours", () => {
  const original = ["A", "B", "C", "D"].map((anchor, i) =>
    ({ id: "stanza-00" + (i + 1), anchor }));
  const locked = { id: "basta-marsiye-059", key: "Marsiye:59", stanzas: original };
  const changed = ["A", "B2", "C", "D"].map((anchor) => ({ anchor, pages: [212] }));
  const update = safeStanzaAnchorRefresh(locked, changed);
  assert.deepEqual(update, {
    id: "stanza-002", previousAnchor: "B", anchor: "B2", pages: [212],
  });
  assert.equal(locked.stanzas[1].anchor, "B", "candidate detection must not mutate the lock");
});

test("ambiguous, missing, reordered, retired and multi-edited stanzas are never auto-repinned", () => {
  const lock = { id: "basta-marsiye-059", key: "Marsiye:59",
    stanzas: ["A", "B", "C"].map((anchor, i) => ({ id: "stanza-00" + (i + 1), anchor })) };
  for (const current of [
    ["A", "B2"],                 // deletion
    ["A", "B2", "C", "D"],        // insertion
    ["B", "A", "C"],             // reordering
    ["A2", "B2", "C"],           // multiple changes
    ["A", "C", "B2"],            // shifted stanza
  ]) {
    assert.equal(safeStanzaAnchorRefresh(lock, current.map((anchor) => ({ anchor }))), null);
  }
  assert.equal(safeStanzaAnchorRefresh({ ...lock, stanzas: [lock.stanzas[0]] },
    [{ anchor: "different" }]), null);
  assert.equal(safeStanzaAnchorRefresh({ ...lock, stanzas: [
    { ...lock.stanzas[0], retired: true }, ...lock.stanzas.slice(1),
  ] }, [{ anchor: "A2" }, { anchor: "B" }, { anchor: "C" }]), null);
});

test("source location labels are precise for multi-page stanzas", () => {
  assert.equal(stanzaPageLabel([213, 212, 213]), "pages 212, 213");
  assert.equal(stanzaPageLabel([212]), "page 212");
  assert.equal(stanzaPageLabel([], 212), "page 212");
  assert.equal(stanzaPageLabel([]), "page unknown");
});
