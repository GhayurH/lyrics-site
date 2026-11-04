import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRomanMarkdown } from "../scripts/lib/roman-normalize.mjs";
import { romanTextParts } from "../src/lib/roman-text-parts.ts";

const md = (u, r) => "---\ntitle: نام\nromanLyrics: |-\n" +
  r.split("\n").map(x => x ? "  " + x : "").join("\n") +
  "\n---\n" + u + "\n";
test("normalizes only Urdu-verified Roman vowels and nasalization", () => {
  const source = md("حسین کے خون میں کیوں نہیں ہیں", "Hussain ke khoon mein kyun nahin hain");
  const { text, paired } = normalizeRomanMarkdown(source, "src/data/lyrics/example.md");
  assert.equal(paired, 1);
  assert(text.includes("Husain ke khun meiṅ kiuṅ nahiṅ haiṅ"));
  assert.equal(text.slice(text.indexOf("---\n", 5) + 4), "حسین کے خون میں کیوں نہیں ہیں\n");
});
test("keeps poem-specific Zehra/Zahra, marks repetition and canonical compounds", () => {
  const source = md("شب و روز بے وفا بار بار زہرا", "Shab-o-Roz be-wafa bar-bar Zehra");
  const r = normalizeRomanMarkdown(source);
  assert(r.text.includes("Shab o Roz bewafa baar baar Zehra"));
  assert(!r.text.includes("Zahra"));
  const r2 = normalizeRomanMarkdown(md("زہرا", "Zahra"));
  assert(r2.text.includes("Zahra"));
  const r3 = normalizeRomanMarkdown(md("وہ مارتی تھیں", "Wo maarti thin (x2)"));
  assert(r3.text.includes("<u>Wo maarti thin</u>"));
  assert.deepEqual(romanTextParts("A <u>repeat here</u> end"), [
    { text: "A ", underline: false }, { text: "repeat here", underline: true },
    { text: " end", underline: false },
  ]);
});
test("preserves intentionally untranscribed Basta and flags missing standalone Roman", () => {
  const source = "---\npage: 140\n---\nاردو\n";
  const a = normalizeRomanMarkdown(source, "src/data/basta/pages/140.md");
  assert.equal(a.changed, false);
  assert.deepEqual(a.findings, []);
  const b = normalizeRomanMarkdown(source, "src/data/lyrics/sample.md");
  assert(b.findings.some(x => x.includes("no Roman")));
});
