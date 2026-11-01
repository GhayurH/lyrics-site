import test from "node:test";
import assert from "node:assert/strict";
import { auditBastaEditorial } from "../src/lib/basta-editorial-audit.ts";

test("editorial diagnostics report duplicate IDs, Roman gaps and separator mismatch without modifying sources", () => {
  const index = [
    { sectionRoman: "Salam", number: 1, name: "سلام", romanName: "Salam", page: 42 },
    { sectionRoman: "Salam", number: 1, name: "دوسرا", page: 43 },
  ];
  const pages = [
    { page:42, urdu:"اوّل\n---***---\nدوم", roman:"First" },
    { page:43, urdu:"واحد" },
  ];
  const original = JSON.stringify({index,pages});
  const result = auditBastaEditorial(index,pages);
  assert.deepEqual(result.duplicateIndexEntries,["Salam:1"]);
  assert.deepEqual(result.absentRomanTranscriptions,[43]);
  assert.deepEqual(result.mismatchedPageBoundaries,[42]);
  assert.deepEqual(result.missingRomanTitles,["Salam:1"]);
  assert.deepEqual(result.nonMonotonicSectionNumbers,["Salam:1"]);
  assert.equal(JSON.stringify({index,pages}),original);
});
