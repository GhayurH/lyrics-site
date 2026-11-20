import test from "node:test";
import assert from "node:assert/strict";
import { searchWithFacets } from "../src/lib/search-engine.ts";

const documents = [
  { id: "a", text: "ali", language: "Urdu", kalamType: "Noha", tag: "Zainab" },
  { id: "b", text: "ali", language: "Urdu", kalamType: "Salam", tag: "Fatima" },
  { id: "c", text: "ali", language: "Panjabi", kalamType: "Noha", tag: "Zainab" },
  { id: "d", text: "abbas", language: "Urdu", kalamType: "Salam", tag: "Zainab" },
  { id: "e", text: "ali", language: "Urdu", kalamType: "Salam", tag: "Zainab" },
];
function fakeApi() {
  const calls = [];
  return { calls, async search(query, { filters = {} } = {}) {
    calls.push({ query, filters });
    const rows = documents.filter(row => (!query || row.text.includes(query)) &&
      Object.entries(filters).every(([key, selected]) => (Array.isArray(selected) ? selected : selected.any).includes(row[key])));
    const counts = {};
    for (const key of ["language", "kalamType", "tag"])
      counts[key] = Object.fromEntries([...new Set(documents.map(row => row[key]))]
        .map(value => [value, rows.filter(row => row[key] === value).length]));
    return { results: rows.map(row => ({ id: row.id, data() { throw Error("Facet queries must not load documents"); } })), filters: counts };
  } };
}

test("facet alternatives count only matches for the query and the other facets", async () => {
  const api = fakeApi();
  const filters = { language: ["Urdu"], kalamType: ["Noha"] };
  const response = await searchWithFacets(api, "Ali", filters);
  assert.deepEqual(response.results.map(row => row.id), ["a"]);
  assert.deepEqual(response.counts.language, { Urdu: 1, Panjabi: 1 });
  assert.deepEqual(response.counts.kalamType, { Noha: 1, Salam: 2 });
  assert.deepEqual(response.counts.tag, { Zainab: 1, Fatima: 0 });
  assert.equal(api.calls.length, 3, "only selected facets require an exclusion query");
  assert.deepEqual(filters, { language: ["Urdu"], kalamType: ["Noha"] });
});

test("OR selections work with intersecting facets and filter-only browsing", async () => {
  const api = fakeApi();
  const response = await searchWithFacets(api, " ", { language: ["Urdu"], kalamType: ["Noha", "Salam"] });
  assert.deepEqual(response.results.map(row => row.id), ["a", "b", "d", "e"]);
  assert.equal(api.calls[0].query, null);
  assert.deepEqual(api.calls[0].filters.kalamType, { any: ["Noha", "Salam"] });
});

test("a query without selections requires one public search request", async () => {
  const api = fakeApi();
  await searchWithFacets(api, "عَلِي كربلا", {});
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].query, "علی کربلا");
});
