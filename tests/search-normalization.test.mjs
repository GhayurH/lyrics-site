import test from "node:test";
import assert from "node:assert/strict";
import { searchIndexAliases, normalizeSearchToken, searchExcerptLines } from "../src/lib/search-normalization.ts";
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
