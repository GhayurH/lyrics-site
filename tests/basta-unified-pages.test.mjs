import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { romanLyricsFromHeader } from "../scripts/lib/source-files.mjs";

const source = new URL("../src/data/basta/pages/", import.meta.url);
const lyrics = new URL("../src/data/lyrics/", import.meta.url);
test("Basta publishes one file per page, never a separate Roman collection", () => {
  assert.equal(existsSync(new URL("../src/data/basta/roman/", import.meta.url)), false);
  const names = readdirSync(source).filter(name => name.endsWith(".md"));
  assert.ok(names.length > 400);
  let withRoman = 0, absent = 0;
  for (const name of names) {
    const markdown = readFileSync(new URL(name, source), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n/u.exec(markdown);
    assert.ok(match, name);
    assert.equal(Number(match[1].match(/^page:\s*(\d+)/mu)?.[1]), Number(name.slice(0,-3)));
    const roman = romanLyricsFromHeader(match[1]);
    if (roman === undefined) absent++;
    else { withRoman++; assert.ok(roman.trim(), name + " has an empty Roman block"); }
  }
  assert.ok(withRoman > 300);
  assert.ok(absent > 0, "Pages lacking Roman deliberately have no block");
});
test("poetry sources end in exactly one newline, without deleting stanza spacing", () => {
  for (const directory of [source, lyrics]) {
    for (const name of readdirSync(directory).filter(name => name.endsWith(".md"))) {
      const content = readFileSync(new URL(name, directory), "utf8");
      assert.ok(content.endsWith("\n") && !content.endsWith("\n\n"), name + " EOF must contain exactly one newline");
    }
  }
});
