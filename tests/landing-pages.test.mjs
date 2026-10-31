// Keep only source contracts that browser navigation tests do not cover.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const home = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const basta = readFileSync(new URL("../src/pages/basta/index.astro", import.meta.url), "utf8");

test("homepage lists all discovered Kalam Types instead of a fixed preview", () => {
  assert.match(home, /kalamTypes\.map\(/);
  assert.match(home, /groupBastaIndexByKalamType/);
  assert.doesNotMatch(home, /HOME_PREVIEW_COUNT|<LyricList/);
});

test("Basta retains a direct link to its complete original PDF", () => {
  assert.match(basta, /\/files\/basta\/basta\.pdf/);
});
