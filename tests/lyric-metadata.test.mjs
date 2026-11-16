import test from "node:test";
import assert from "node:assert/strict";
import { getLyricKalamType, getLyricKalamTypes, getLyricReciters, lyricMetadataValues } from "../src/lib/lyrics.ts";

test("a poem belongs independently to every declared type", () => {
  const data = { kalamType: ["Salam", "Noha"], reciter: ["Sachey Bhai", "Shadman Raza"] };
  assert.deepEqual(getLyricKalamTypes(data), ["Salam", "Noha"]);
  assert.equal(getLyricKalamType(data), "Salam");
  assert.deepEqual(getLyricReciters(data), ["Sachey Bhai", "Shadman Raza"]);
});

test("single values preserve existing source behavior and duplicate entries are normalized", () => {
  const data = { kalamType: "Noha", reciter: "Sachey Bhai" };
  assert.deepEqual(getLyricKalamTypes(data), ["Noha"]);
  assert.deepEqual(getLyricReciters(data), ["Sachey Bhai"]);
  assert.deepEqual(lyricMetadataValues(["Noha", " Noha ", "Salam", ""]), ["Noha", "Salam"]);
});
