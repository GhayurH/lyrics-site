import test from "node:test";
import assert from "node:assert/strict";
import { searchIndexAliases, normalizeSearchToken } from "../src/lib/search-normalization.ts";
test("search aliases cover common Roman variants in both directions", () => {
  for (const [name,variant] of [["husain","hussain"],["hasan","hassan"],["bole","bolay"],["wale","walay"],["karbala","kerbala"],["marsiya","marsia"],["asghar","asgar"]]) {
    assert.ok(searchIndexAliases(name).split(" ").includes(variant),name);
    assert.ok(searchIndexAliases(variant).split(" ").includes(name),variant);
  }
});
test("Urdu and Arabic forms normalize without rewriting source", () => {
  const original = "عَلِي يار كربلا";
  assert.ok(searchIndexAliases(original).includes("علی"));
  assert.equal(original,"عَلِي يار كربلا");
  assert.equal(normalizeSearchToken("آلِ"),"ال");
});

test("search alias tokens are unique after bidirectional expansion", () => {
  const aliases = searchIndexAliases("Husain hussain Hussein hussayn").split(" ");
  assert.equal(new Set(aliases).size, aliases.length);
});

test("nasal Roman spellings remain searchable without diacritics", () => {
  assert.equal(normalizeSearchToken("Kiuṅ"), "kiun");
  for (const token of ["kyun", "kiun", "kiuṅ"])
    assert(searchIndexAliases(token).includes("kiun") || token === "kiun");
  assert(searchIndexAliases("kiuṅ").includes("kyun"));
});
