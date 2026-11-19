import test from "node:test";
import assert from "node:assert/strict";
import { searchIndexAliases, normalizeSearchToken, searchExcerptLines, normalizeSearchQuery } from "../src/lib/search-normalization.ts";
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

test("search snippets do not repeat the title but preserve later refrains", () => {
  const title = "ہاشم کے گھرانے کے قمر ہے میری فریاد";
  const original = `${title}\nمیرے دلِ تاریک میں تھوڑی سی ضیا دو\n\n۱\n${title}`;
  assert.deepEqual(searchExcerptLines(original, title), [
    "میرے دلِ تاریک میں تھوڑی سی ضیا دو", "۱", title,
  ]);
  assert.equal(original.split("\n")[0], title);
  assert.deepEqual(searchExcerptLines("Hashim Ke Gharane Ke Qamar\nAnother verse", "hashim ke gharane ke qamar"), ["Another verse"]);
  assert.deepEqual(searchExcerptLines("A verse\nAnother verse", "Different title"), ["A verse", "Another verse"]);
  assert.deepEqual(searchExcerptLines(undefined, undefined), []);
});


test("Arabic keyboard and harakat variants have one canonical query", () => {
  assert.equal(normalizeSearchQuery("عَلِي كربلا"), "علی کربلا");
  assert.equal(normalizeSearchQuery("علی کربلا"), "علی کربلا");
  assert.ok(searchIndexAliases("علی").split(" ").includes("علي"));
  assert.ok(searchIndexAliases("كربلا").split(" ").includes("کربلا"));
});
test("ZWNJ and nasal marks normalize only within the search index", () => {
  const original = "بی‌بی";
  assert.equal(normalizeSearchQuery(original), "بیبی");
  assert.ok(searchIndexAliases(original).split(" ").includes("بیبی"));
  assert.equal(original, "بی‌بی");
  assert.equal(normalizeSearchQuery("Kiuṅ, Zahrā!"), "kiun, zahra!");
});
test("bari ye remains distinct from choti ye", () => {
  assert.notEqual(normalizeSearchToken("ے"), normalizeSearchToken("ی"));
  assert.ok(!searchIndexAliases("میرے").split(" ").includes("میری"));
});
test("all common Husain spellings work in both directions", () => {
  for (const spelling of ["husain", "hussain", "hussein", "husayn"]) {
    const terms = new Set([spelling, ...searchIndexAliases(spelling).split(" ")]);
    assert.ok(terms.has("husain"));
    assert.ok(terms.has("hussein"));
  }
});
