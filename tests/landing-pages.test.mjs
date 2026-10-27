// Navigation and discovery contracts for the two main landing pages.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const home = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const basta = readFileSync(new URL("../src/pages/basta/index.astro", import.meta.url), "utf8");

test("homepage search uses the existing query-parameter search route", () => {
  assert.match(home, /<form[^>]+action="\/search\/"[^>]+method="get"/);
  assert.match(home, /name="q"/);
  assert.match(home, /type="submit">Search<\/button>/);
});

test("homepage lists every available Kalam Type without fixed sample lists", () => {
  assert.match(home, /kalamTypes\.map\(/);
  assert.match(home, /groupBastaIndexByKalamType/);
  assert.match(home, /\/categories\//);
  assert.doesNotMatch(home, /HOME_PREVIEW_COUNT|<LyricList/);
});

test("Basta landing exposes readers, book index, page jump and original PDF", () => {
  assert.match(basta, /\/basta\/read\//);
  assert.match(basta, /\/basta\/index\//);
  assert.match(basta, /data-basta-jump-form/);
  assert.match(basta, /\/files\/basta\/basta\.pdf/);
});

test("both landings preserve local Basta reading progress links", () => {
  for (const page of [home, basta]) {
    assert.match(page, /data-resume-basta[^>]+hidden/);
    assert.match(page, /initResumeBasta\(\)/);
  }
});
