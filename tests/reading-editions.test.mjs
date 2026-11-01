import test from "node:test";
import assert from "node:assert/strict";
import { readingModeFromEditions, selectedEditions } from "../src/client/reading-editions.ts";
import { romanUnavailable } from "../src/lib/edition-availability.ts";

test("all three editions may appear together", () => {
  assert.deepEqual(selectedEditions(undefined, ["image", "urdu", "roman"]), ["urdu", "roman"]);
  assert.deepEqual(selectedEditions(["image", "urdu", "roman"], ["image", "urdu", "roman"]), ["image", "urdu", "roman"]);
  assert.equal(readingModeFromEditions(["image", "urdu", "roman"]), "parallel");
});

test("saved choices are filtered by each page's available editions", () => {
  assert.deepEqual(selectedEditions(["roman", "image"], ["urdu"]), ["urdu"]);
  assert.deepEqual(selectedEditions(["image"], ["image", "urdu"]), ["image"]);
  assert.deepEqual(selectedEditions(["roman", "roman", "image"], ["image", "urdu", "roman"]), ["roman", "image"]);
});

test("image-only Basta pages always have a viewable edition", () => {
  assert.deepEqual(selectedEditions(["urdu", "roman"], ["image"], true), ["image"]);
  assert.equal(readingModeFromEditions(["image"]), "image");
  assert.equal(readingModeFromEditions(["urdu"]), "urdu");
});

test("mobile starts with Urdu; desktop Basta pages show the original alongside Urdu", async () => {
  const { defaultEditionsForReader } = await import("../src/client/reading-editions.ts");
  assert.deepEqual(defaultEditionsForReader("lyrics", true), ["urdu"]);
  assert.deepEqual(defaultEditionsForReader("recitation", true), ["urdu"]);
  assert.deepEqual(defaultEditionsForReader("basta-index", true), ["urdu"]);
  assert.deepEqual(defaultEditionsForReader("basta-page", false), ["image", "urdu"]);
  assert.deepEqual(defaultEditionsForReader("basta-continuous", false), ["urdu", "roman"]);
});

test("missing-edition wording only offers an available scan", () => {
  assert.equal(romanUnavailable("page", true),
    "Roman Urdu is not available for this page. The original scan can be viewed instead.");
  assert.equal(romanUnavailable("kalam", false),
    "Roman Urdu is not available for this kalam.");
  assert.equal(romanUnavailable("stanza", true, 3),
    "Roman Urdu is not available for stanza 3. The original scan can be viewed instead.");
});
