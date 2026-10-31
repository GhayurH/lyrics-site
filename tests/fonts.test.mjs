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
  assert.equal(FONT_CHOICES.urdu.length, 2);
});
