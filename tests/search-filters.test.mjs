import test from "node:test";
import assert from "node:assert/strict";
import { toPagefindOrFilters } from "../src/lib/search-filters.ts";

test("same-facet selections match any chosen value, across facets still require both", () => {
  assert.deepEqual(toPagefindOrFilters({
    haal: ["Shahadat", "Wiladat"],
    tag: ["Zainab", "Fatima"],
    language: ["Urdu"],
  }), {
    haal: { any: ["Shahadat", "Wiladat"] },
    tag: { any: ["Zainab", "Fatima"] },
    language: ["Urdu"],
  });
});

test("empty, duplicate, and cleared filter values do not constrain search", () => {
  assert.deepEqual(toPagefindOrFilters({
    tag: ["Zainab", "Zainab", ""], poet: [], occasion: ["", " "],
  }), { tag: ["Zainab"] , occasion: [" "] });
  assert.deepEqual(toPagefindOrFilters({ tag: [] }), {});
});
