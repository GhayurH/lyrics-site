import test from "node:test";
import assert from "node:assert/strict";
import { readSearchState, searchStateHref, searchResultHref } from "../src/lib/search-state.ts";

test("search links preserve typed text, multiple filters and result page", () => {
  const state = { query: "عَلِي Kiuṅ & Zainab", filters: { kalamType: ["Noha", "Salam"], poet: ["Name & Name"] }, page: 4 };
  assert.deepEqual(readSearchState(new URL(searchStateHref(state), "https://kalamarchive.com").search), state);
  assert.equal(searchStateHref({ query: "", filters: {}, page: 1 }), "/search/");
});

test("legacy categories migrate without overriding explicit facets", () => {
  assert.deepEqual(readSearchState("?category=Noha&category=Salam").filters, { kalamType: ["Noha", "Salam"] });
  assert.deepEqual(readSearchState("?category=Noha&kalamType=Soz").filters, { kalamType: ["Soz"] });
  assert.deepEqual(readSearchState("?poet=Name&poet=Name&poet=%20&unknown=value").filters, { poet: ["Name"] });
});

test("URL state bounds malformed or excessive inputs", () => {
  for (const page of ["0", "-1", "1.5", "NaN", "Infinity"]) assert.equal(readSearchState("?page=" + page).page, 1);
  assert.equal(readSearchState("?page=99999").page, 10000);
  assert.equal(readSearchState("?q=" + "a".repeat(600)).query.length, 500);
  assert.deepEqual(readSearchState("?poet=" + "a".repeat(301)).filters, {});
});

test("result navigation carries raw highlighting and a same-page passage", () => {
  const query = "Kiuṅ, عَلِي & Zahrā";
  const href = searchResultHref("/lyrics/example/", query, "/lyrics/example/#passage-123");
  const url = new URL(href, "https://kalamarchive.com");
  assert.equal(url.pathname, "/lyrics/example/");
  assert.equal(url.hash, "#passage-123");
  assert.equal(url.searchParams.get("highlight"), query);
  assert.equal(searchResultHref("/basta/kalam/basta-marsiye-001/#stanza-001", ""), "/basta/kalam/basta-marsiye-001/#stanza-001");
});

test("result metadata cannot send readers to an external or utility route", () => {
  for (const url of ["https://other.example/lyrics/a/", "//other.example/lyrics/a/", "javascript:alert(1)", "/search/", "/lyrics/../recite/"])
    assert.equal(searchResultHref(url, "Ali"), null, url);
  assert.equal(searchResultHref("/lyrics/a/", "", "/lyrics/b/#passage-001"), "/lyrics/a/");
  assert.equal(searchResultHref("/lyrics/a/", "", "https://other.example/lyrics/a/#passage-001"), "/lyrics/a/");
});
