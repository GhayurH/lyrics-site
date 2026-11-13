import test from "node:test";
import assert from "node:assert/strict";
import { stanzaAnchor, applyRecitationIds, safeStanzaAnchorRefresh, planReviewedStanzaChanges, stanzaPageLabel } from "../src/lib/recitation-identity.ts";
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
  const changed = ["A", "B2", "C", "D"].map((anchor, i) =>
    ({ id: "stanza-00" + (i + 1), anchor, pages: [212] }));
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
    assert.equal(safeStanzaAnchorRefresh(lock, current.map((anchor, i) =>
      ({ id: "stanza-00" + (i + 1), anchor }))), null);
  }
  assert.equal(safeStanzaAnchorRefresh({ ...lock, stanzas: [lock.stanzas[0]] },
    [{ id: "stanza-001", anchor: "different" }]), null);
  assert.equal(safeStanzaAnchorRefresh({ ...lock, stanzas: [
    { ...lock.stanzas[0], retired: true }, ...lock.stanzas.slice(1),
  ] }, ["A2", "B", "C"].map((anchor, i) => ({ id: "stanza-00" + (i + 1), anchor }))), null);
  // An edited and renumbered stanza cannot be inferred from position alone.
  assert.equal(safeStanzaAnchorRefresh(lock, [
    { id: "stanza-001", anchor: "A" },
    { id: "stanza-099", anchor: "B2" },
    { id: "stanza-003", anchor: "C" },
  ]), null);
});

test("source location labels are precise for multi-page stanzas", () => {
  assert.equal(stanzaPageLabel([213, 212, 213]), "pages 212, 213");
  assert.equal(stanzaPageLabel([212]), "page 212");
  assert.equal(stanzaPageLabel([], 212), "page 212");
  assert.equal(stanzaPageLabel([]), "page unknown");
});

test("reviewed multi-edit plan preserves exact IDs and does not mutate the lock", () => {
  const locked = { id: "basta-marsiye-120", key: "Marsiye:120", stanzas:
    ["A", "B", "C", "D", "E"].map((anchor, i) => ({
      id: "stanza-" + String(i + 1).padStart(3, "0"), anchor,
    })) };
  const current = ["A", "B2", "C2", "D2"].map((anchor, i) => ({
    id: "stanza-" + String(i + 1).padStart(3, "0"), anchor, pages: [287],
  }));
  const edits = new Set(["stanza-002", "stanza-003", "stanza-004"]);
  const retirement = new Set(["stanza-005"]);
  assert.deepEqual(planReviewedStanzaChanges(locked, current, edits, retirement), {
    updates: [
      { id: "stanza-002", previousAnchor: "B", anchor: "B2", pages: [287] },
      { id: "stanza-003", previousAnchor: "C", anchor: "C2", pages: [287] },
      { id: "stanza-004", previousAnchor: "D", anchor: "D2", pages: [287] },
    ],
    retiredIds: ["stanza-005"],
  });
  assert.equal(locked.stanzas[1].anchor, "B");
  assert.equal(locked.stanzas[4].retired, undefined);
});

test("reviewed stanza approvals must account for exactly the changes", () => {
  const original = ["A", "B", "C"].map((anchor, i) => ({
    id: "stanza-00" + (i + 1), anchor,
  }));
  const lock = { id: "basta-marsiye-121", key: "Marsiye:121", stanzas: original };
  const current = ["A2", "B2", "C"].map((anchor, i) => ({
    id: "stanza-00" + (i + 1), anchor,
  }));
  assert.throws(() => planReviewedStanzaChanges(
    lock, current, new Set(["stanza-001"]), new Set()), /Unapproved stanza edit/);
  assert.throws(() => planReviewedStanzaChanges(
    lock, current, new Set(["stanza-001", "stanza-002", "stanza-003"]), new Set()),
  /Unchanged stanza was approved/);
  assert.throws(() => planReviewedStanzaChanges(
    lock, current, new Set(["stanza-001", "stanza-099"]), new Set()),
  /Invalid or retired edit approval/);
});

test("reviewed mode blocks moved anchors, renumbering and unapproved removals", () => {
  const original = ["A", "B", "C"].map((anchor, i) => ({
    id: "stanza-00" + (i + 1), anchor,
  }));
  const lock = { id: "basta-marsiye-121", key: "Marsiye:121", stanzas: original };
  const edits = new Set(["stanza-001", "stanza-002"]);
  const run = (anchors, ids, removed = new Set()) =>
    planReviewedStanzaChanges(lock, anchors.map((anchor, i) =>
      ({ id: ids[i], anchor })), edits, removed);
  assert.throws(() => run(["B", "A", "C"],
    ["stanza-001", "stanza-002", "stanza-003"]), /belongs to historical/);
  assert.throws(() => run(["A2", "B2"],
    ["stanza-001", "stanza-002"]), /count or order changed/);
  assert.throws(() => run(["A2", "B2", "C"],
    ["stanza-001", "stanza-099", "stanza-003"]), /count or order changed/);
  assert.throws(() => run(["A2", "B2"], ["stanza-001", "stanza-002"],
    new Set(["stanza-099"])), /Invalid or already retired retirement approval/);
  assert.throws(() => run(["A2", "B2"], ["stanza-001", "stanza-002"],
    new Set(["stanza-003", "stanza-002"])), /Invalid or already retired retirement approval/);
});

test("reviewed corrections can coexist with previously retired stanzas", () => {
  const lock = { id: "basta-marsiye-120", key: "Marsiye:120", stanzas: [
    { id: "stanza-001", anchor: "A" },
    { id: "stanza-002", anchor: "B" },
    { id: "stanza-003", anchor: "C", retired: true },
    { id: "stanza-004", anchor: "D" },
  ] };
  assert.deepEqual(planReviewedStanzaChanges(lock, [
    { id: "stanza-001", anchor: "A2" },
    { id: "stanza-002", anchor: "B2" },
    { id: "stanza-004", anchor: "D" },
  ], new Set(["stanza-001", "stanza-002"]), new Set()).updates.map(x => x.id),
  ["stanza-001", "stanza-002"]);
  assert.throws(() => planReviewedStanzaChanges(lock, [
    { id: "stanza-001", anchor: "A2" },
    { id: "stanza-002", anchor: "C" },
    { id: "stanza-004", anchor: "D" },
  ], new Set(["stanza-001", "stanza-002"]), new Set()),
  /belongs to historical/);
});
