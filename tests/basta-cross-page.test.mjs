// Regression: one numbered Marsiya crosses original Basta pages 284–285.
// Stanza 6's six lines end on 284; stanza 7 begins on 285.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildBastaKalamCatalog } from "../src/lib/basta-kalam-units.ts";

async function file(path) {
  return readFile(new URL("../src/data/basta/" + path, import.meta.url), "utf8");
}
function body(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

test("Basta Marsiya 117 retains stanza boundaries and both original pages", async () => {
  const index = JSON.parse(await file("index.json")).filter(
    (entry) => entry.sectionRoman === "Marsiye" && [117, 118].includes(entry.number),
  );
  const pages = await Promise.all([284, 285].map(async (page) => ({
    page,
    urdu: body(await file("pages/" + page + ".md")),
    roman: body(await file("roman/" + page + ".md")),
  })));
  const catalog = buildBastaKalamCatalog(index, pages);
  const kalam = catalog.kalams.find((item) => item.id === "basta-marsiye-117");
  assert.ok(kalam);
  assert.equal(kalam.status, "ready", kalam.issues.join("; "));
  assert.deepEqual(kalam.pages, [284, 285]);
  assert.equal(kalam.stanzas.length, 7);
  assert.deepEqual(kalam.stanzas[5].pages, [284]);
  assert.deepEqual(kalam.stanzas[6].pages, [285]);
  for (const stanza of kalam.stanzas.slice(5)) {
    assert.equal(stanza.urdu.split("\n").filter(Boolean).length, 6);
    assert.equal(stanza.roman?.split("\n").filter(Boolean).length, 6);
  }
});
