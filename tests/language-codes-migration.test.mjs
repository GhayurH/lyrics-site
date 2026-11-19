import test from "node:test";
import assert from "node:assert/strict";
import { migrateLanguageCode } from "../scripts/one-time-language-codes.mjs";
const fixture = (language, lang, direction = "rtl") => [
  "---", "title: مثال", "language: " + language,
  ...(lang === null ? [] : ["lang: " + lang]),
  "direction: " + direction, "romanLyrics: |-", "  Roman verse", "---", "اصل شعر", "",
].join("\n");
test("migrate only the source-language field, idempotently", () => {
  for (const [name, before, after] of [
    ["Urdu", "en", "ur"], ["Panjabi", '"pa"', '"pa-Arab"'],
    ["Saraiki", "skr", "skr-Arab"], ["Balti", "bft", "bft-Arab"],
  ]) {
    const initial = fixture(name, before);
    const result = migrateLanguageCode(initial);
    assert.equal(result.outcome, "changed");
    assert.ok(result.text.includes("lang: " + after));
    assert.equal(result.text.split("---").at(-1), initial.split("---").at(-1));
    assert.equal(migrateLanguageCode(result.text).outcome, "already-correct");
  }
});
test("missing language code is inserted; unrelated languages stay untouched", () => {
  assert.match(migrateLanguageCode(fixture("Urdu", null)).text, /language: Urdu\nlang: ur\ndirection: rtl/u);
  for (const [lang, dir] of [
    ["Panjabi", "ltr"], ["Balti", "ltr"], ["Roman Urdu", "rtl"],
    ["English", "ltr"], ["Persian", "rtl"],
  ]) {
    const original = fixture(lang, "en", dir);
    assert.deepEqual(migrateLanguageCode(original), { text: original, outcome: "skipped" });
  }
});
