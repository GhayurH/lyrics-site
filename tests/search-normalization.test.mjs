import test from "node:test";
import assert from "node:assert/strict";
import { searchIndexAliases } from "../src/lib/search-normalization.ts";

test("Roman variants are searchable without rewriting canonical verses", () => {
  const source = "Husain Hasan bole wale Karbala";
  const aliases = searchIndexAliases(source);
  for (const variant of ["hussain","hussein","hassan","bolay","walay","kerbala"])
    assert.ok(aliases.split(" ").includes(variant));
  assert.equal(source, "Husain Hasan bole wale Karbala");
});
test("Urdu diacritic and Arabic-form aliases are indexed", () => {
  assert.ok(searchIndexAliases("عَلِي يار كربلا").includes("علی"));
});
