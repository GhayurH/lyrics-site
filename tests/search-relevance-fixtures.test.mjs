import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { parse } from "yaml";
import { normalizeSearchQuery } from "../src/lib/search-normalization.ts";

test("relevance judgments refer to published permanent IDs and real source text", async () => {
  const [fixtures, lock, basta] = await Promise.all([
    "tests/fixtures/search-relevance.json", "src/data/recitation/identity-lock.json", "src/data/basta/index.json",
  ].map(async path => JSON.parse(await readFile(new URL("../" + path, import.meta.url), "utf8"))));
  const wanted = new Set(fixtures.filter(item => item.kind === "lyric").map(item => item.id));
  const byId = new Map();
  const sourceDirectory = new URL("../src/data/lyrics/", import.meta.url);
  // A recitationId stays fixed even after an editorial filename change. Some
  // newer entries have an explicit ID before they join the legacy identity lock.
  for (const path of await readdir(sourceDirectory)) {
    if (!path.endsWith(".md")) continue;
    const text = await readFile(new URL(path, sourceDirectory), "utf8");
    const end = text.indexOf("\n---", 4);
    const header = text.slice(4, end);
    const explicit = header.match(/^recitationId:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
    const id = explicit || path.slice(0, -3);
    if (!wanted.has(id)) continue;
    const data = parse(header);
    if (!data.published) continue;
    assert.ok(!byId.has(id), "Unique published ID: " + id);
    byId.set(id, { data, body: text.slice(end + 4) });
  }
  assert.equal(new Set(fixtures.map(item => item.name)).size, fixtures.length);
  for (const fixture of fixtures) {
    if (fixture.expectEmpty) continue;
    assert.ok(fixture.maxRank > 0 && fixture.maxRank <= 5);
    let source;
    if (fixture.kind === "lyric") {
      const entry = byId.get(fixture.id);
      assert.ok(entry, "Published lyric ID: " + fixture.id);
      const { data, body } = entry;
      assert.equal(data.published, true, fixture.id);
      source = [data.title, data.alternateTitle, data.romanLyrics, body].filter(Boolean).join("\n");
    } else {
      const record = lock.basta.find(item => item.id === fixture.id && !item.retired);
      assert.ok(record, "Locked Basta ID: " + fixture.id);
      const item = basta.find(item => item.sectionRoman + ":" + item.number === record.key);
      assert.ok(item);
      source = item.name + "\n" + item.romanName;
    }
    assert.ok(normalizeSearchQuery(source).includes(normalizeSearchQuery(fixture.sourceText)), fixture.name + " source excerpt");
  }
});
