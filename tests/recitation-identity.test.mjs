import test from "node:test";
import assert from "node:assert/strict";
import { stanzaAnchor, applyRecitationIds } from "../src/lib/recitation-identity.ts";
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
