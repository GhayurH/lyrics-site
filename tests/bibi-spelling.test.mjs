import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBibiText, stripCanonicalBibiNonJoiners } from "../src/lib/bibi-spelling.ts";

test("Bibi has one intentional Urdu non-joiner, regardless of original separator", () => {
  for (const original of ["بیبی", "بی بی", "بی‌بی", "بی‍بی", "بي بي"]) {
    assert.equal(normalizeBibiText(original), "بی\u200Cبی", original);
  }
  assert.equal(normalizeBibiText("بِی بِی"), "بِی\u200Cبِی");
  assert.equal(normalizeBibiText("بی بیوں"), "بی\u200Cبیوں");
  assert.equal(normalizeBibiText("بیبیاں"), "بی\u200Cبیاں");
  assert.equal(normalizeBibiText("علیبیبی"), "علیبیبی", "not an embedded name");
});
test("Roman Bibi never has a separator, while other words stay unchanged", () => {
  for (const original of ["Bibi", "Bi Bi", "Bee Bee", "Bi-Bi", "Bi‌Bi"])
    assert.equal(normalizeBibiText(original), "Bibi");
  assert.equal(normalizeBibiText("bi bi"), "bibi");
  assert.equal(normalizeBibiText("bibiyan"), "bibiyan");
  assert.equal(normalizeBibiText("habibi"), "habibi");
  assert.equal(normalizeBibiText("BIBI"), "BIBI");
});
test("only the deliberate Urdu non-joiner is exempt from invisible-control checks", () => {
  assert.equal(stripCanonicalBibiNonJoiners("بی‌بی"), "بیبی");
  assert.equal(stripCanonicalBibiNonJoiners("بی‍بی"), "بی‍بی");
  assert.equal(stripCanonicalBibiNonJoiners("بی‌بی\u200B"), "بیبی\u200B");
});
