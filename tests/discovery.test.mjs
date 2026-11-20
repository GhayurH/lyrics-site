import test from "node:test";
import assert from "node:assert/strict";
import { discoveryHref, discoverySlug, groupDiscoveryEntries } from "../src/lib/discovery.ts";

test("browse hubs use literal metadata without merging different poet spellings", () => {
  const entries = [
    { id: "1", data: { language: "Urdu", poet: "Husain", occasion: "Chehlum" } },
    { id: "2", data: { language: "Panjabi", poet: "Hussain" } },
    { id: "3", data: { language: "Urdu", poet: "Husain" } },
    { id: "4", data: { language: "Urdu" } },
  ];
  const before = structuredClone(entries);
  const poets = groupDiscoveryEntries(entries, "poets");
  assert.equal(poets.length, 2);
  assert.deepEqual(poets.find(row => row.label === "Husain").entries.map(row => row.id), ["1", "3"]);
  assert.notEqual(poets[0].href, poets[1].href);
  assert.deepEqual(groupDiscoveryEntries(entries, "occasions").map(row => row.label), ["Chehlum"]);
  assert.deepEqual(groupDiscoveryEntries(entries, "languages").map(row => row.label), ["Panjabi", "Urdu"]);
  assert.deepEqual(entries, before);
});

test("public links remain stable as similar names are added", () => {
  const names = ["Ali", "ALi", "Áli", "Ali!", "علی", "عَلِي", "A / B", "A & B"];
  const slugs = names.map(discoverySlug);
  assert.equal(new Set(slugs).size, names.length);
  const href = discoveryHref("poets", "علی");
  assert.equal(new URL(href, "https://kalamarchive.com").pathname, href);
  assert.ok(href.startsWith("/poets/"));
  assert.ok(!href.includes("?"));
  assert.equal(groupDiscoveryEntries(names.map(poet => ({ data: { poet, language: "Urdu" } })), "poets")
    .find(group => group.label === "علی").href, href);
});
