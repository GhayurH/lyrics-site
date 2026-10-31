// Saved language fonts must be independent, backwards-compatible and safe.
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FONTS, FONT_CHOICES, parseFontPreferences } from "../src/client/fonts.ts";

test("defaults preserve current typography", () => {
  assert.deepEqual(parseFontPreferences(null), DEFAULT_FONTS);
  assert.deepEqual(parseFontPreferences({}), { urdu: "nastaliq", roman: "sans" });
});
test("font choices validate each language independently", () => {
  assert.deepEqual(parseFontPreferences({ urdu: "naskh", roman: "serif" }),
    { urdu: "naskh", roman: "serif" });
  assert.deepEqual(parseFontPreferences({ urdu: "unknown", roman: "system" }),
    { urdu: "nastaliq", roman: "sans" });
  assert.deepEqual(parseFontPreferences({ urdu: "serif; color:red", roman: "url(evil)" }), DEFAULT_FONTS);
  assert.deepEqual(parseFontPreferences(["naskh", "serif"]), DEFAULT_FONTS);
  assert.deepEqual(FONT_CHOICES.urdu.map((item) => item.value), [
    "alvi", "amiri", "beaconhouse", "gulzar", "lateef",
    "markazi", "naskh", "nastaliq", "noto-sans-arabic", "scheherazade",
  ]);
  assert.deepEqual(FONT_CHOICES.roman.map((item) => item.value),
    ["sans", "serif", "lora", "merriweather", "open-sans", "source-sans"]);
  for (const urdu of ["nastaliq", "naskh", "lateef", "alvi", "gulzar", "scheherazade", "amiri", "markazi", "noto-sans-arabic", "beaconhouse"]) {
    for (const roman of ["sans", "serif", "lora", "merriweather", "open-sans", "source-sans"]) {
      assert.deepEqual(parseFontPreferences({ urdu, roman }), { urdu, roman });
    }
  }
});

test("font menus have unique values and plain labels; saved defaults migrate", () => {
  for (const list of Object.values(FONT_CHOICES)) {
    assert.equal(new Set(list.map(({ value }) => value)).size, list.length);
    assert.equal(new Set(list.map(({ label }) => label.toLowerCase())).size, list.length);
    const labels = list.map(({ label }) => label);
    assert.deepEqual(labels, [...labels].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" })),
      "font menus must stay alphabetical");
  }
  assert.deepEqual(FONT_CHOICES.roman.map(({ label }) => label),
    ["Default", "Georgia", "Lora", "Merriweather", "Open Sans", "Source Sans 3"]);
  assert.equal(parseFontPreferences({ roman: "system" }).roman, "sans");
});

test("early font restoration shares the menu allowlist", async () => {
  const { readFile } = await import("node:fs/promises");
  const layout = await readFile("src/layouts/BaseLayout.astro", "utf8");
  assert.match(layout, /fontOptions:\s*\{/);
  assert.match(layout, /FONT_CHOICES\.urdu\.map/);
  assert.match(layout, /FONT_CHOICES\.roman\.map/);
  assert.match(layout, /fontOptions\.urdu\.includes/);
  assert.match(layout, /fontOptions\.roman\.includes/);
});

test("Beaconhouse font and redistribution licence remain together", async () => {
  const { stat, readFile } = await import("node:fs/promises");
  const path = "public/fonts/beaconhouse-nastaliq/";
  const bytes = await stat(path + "BeaconhouseNastaliq-Regular.ttf");
  assert.ok(bytes.size > 100000);
  const licence = await readFile(path + "OFL.txt", "utf8");
  assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(licence, /Beaconhouse Nastaliq Project Authors/);
});
