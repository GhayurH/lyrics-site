// File role: Regression coverage for Basta's printed two-line and six-line stanza indentation.
import test from "node:test";
import assert from "node:assert/strict";
import { layoutBastaKalam, splitBastaKalams } from "../src/lib/basta-text.ts";

const indents = (text, enabled = true) => layoutBastaKalam(text, enabled)
  .filter((line) => line.text.trim() && !/^\d+$/.test(line.text.trim()))
  .map((line) => line.indent);

test("two-line stanza indents only its second verse", () => {
  assert.deepEqual(indents("first\nsecond"), [false, true]);
});

test("six consecutive verses indent only the closing two", () => {
  assert.deepEqual(indents("a\nb\nc\nd\ne\nf"), [false, false, false, false, true, true]);
});

test("numbered 4+2 stanza offsets both closing verses but not the credit", () => {
  const lines = layoutBastaKalam("۱\na\nb\nc\nd\n\ne\nf\n(بشکریہ شاعر)");
  assert.deepEqual(lines.map((line) => line.indent), [
    false, false, false, false, false, false, true, true, false,
  ]);
});

test("Roman 4+2 convention and subsequent two-line stanza remain independent", () => {
  const content = "1\na\nb\nc\nd\n\ne\nf\n\n2\ng\nh";
  assert.deepEqual(indents(content), [
    false, false, false, false, true, true, false, true,
  ]);
});

test("blank lines survive and prose pages can opt out", () => {
  const content = "a\nb\n\nc\nd";
  assert.equal(layoutBastaKalam(content)[2].text, "");
  assert.deepEqual(indents(content, false), [false, false, false, false]);
});

test("kalam separators keep boundaries independent", () => {
  const kalams = splitBastaKalams("a\nb\n---***---\nc\nd");
  assert.equal(kalams.length, 2);
  assert.deepEqual(kalams.map((kalam) => indents(kalam)), [
    [false, true],
    [false, true],
  ]);
});
