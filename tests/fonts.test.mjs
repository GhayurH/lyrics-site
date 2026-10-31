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
    { urdu: "nastaliq", roman: "system" });
  assert.deepEqual(parseFontPreferences({ urdu: "serif; color:red", roman: "url(evil)" }), DEFAULT_FONTS);
  assert.deepEqual(parseFontPreferences(["naskh", "serif"]), DEFAULT_FONTS);
  assert.deepEqual(FONT_CHOICES.urdu.map((item) => item.value), [
    "nastaliq", "naskh", "lateef", "alvi", "gulzar", "scheherazade",
    "amiri", "markazi", "noto-sans-arabic", "beaconhouse",
  ]);
  assert.deepEqual(FONT_CHOICES.roman.map((item) => item.value),
    ["sans", "system", "serif", "open-sans", "source-sans", "lora", "merriweather"]);
  for (const urdu of ["nastaliq", "naskh", "lateef", "alvi", "gulzar", "scheherazade", "amiri", "markazi", "noto-sans-arabic", "beaconhouse"]) {
    for (const roman of ["sans", "system", "serif", "open-sans", "source-sans", "lora", "merriweather"]) {
      assert.deepEqual(parseFontPreferences({ urdu, roman }), { urdu, roman });
    }
  }
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
