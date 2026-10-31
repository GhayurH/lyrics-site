// File role: Keep all non-Basta Roman title metadata consistently capitalized.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const titleCase = (value) =>
  value.replace(/(^|[\s\-–—/([{])([a-z])/g, (_, boundary, letter) =>
    boundary + letter.toUpperCase());

test("all 129 non-Basta Roman titles and Roman aliases have capitalized word initials", () => {
  const dir = new URL("../src/data/lyrics/", import.meta.url);
  const files = readdirSync(dir).filter(name => name.endsWith(".md"));
  assert.equal(files.length, 129);
  for (const filename of files) {
    const source = readFileSync(new URL(filename, dir), "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
    assert.ok(frontmatter, filename + " must have frontmatter");
    const alternateTitle = frontmatter.match(/^alternateTitle: "([^"]+)"$/m)?.[1];
    assert.ok(alternateTitle, filename + " must have a Roman title");
    assert.equal(alternateTitle, titleCase(alternateTitle), filename + " Roman title");
    const aliases = frontmatter.match(/^aliases:\r?\n((?:  - "[^"]*"\r?\n)*)/m)?.[1] || "";
    for (const match of aliases.matchAll(/^  - "([^"]*)"$/gm)) {
      const alias = match[1];
      if (!/[a-z]/i.test(alias) || /[\u0600-\u06ff]/.test(alias)) continue;
      assert.equal(alias, titleCase(alias), filename + " Roman alias");
    }
  }
});
