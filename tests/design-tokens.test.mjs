// Structural guard only: precise CSS geometry belongs to implementation, not CI.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const styleDir = join(process.cwd(), "src/styles");
const css = Object.fromEntries(readdirSync(styleDir).filter((p) => p.endsWith(".css"))
  .map((path) => [path, readFileSync(join(styleDir, path), "utf8")]));
const tokens = css["tokens.css"];

test("every variable reference in shared design CSS resolves to a declared token", () => {
  const definitions = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  for (const [file, source] of Object.entries(css)) {
    if (file === "tokens.css") continue;
    for (const [, variable] of source.matchAll(/var\((--(?:content|preset|ui|reading)-[\w-]+)/g)) {
      assert(definitions.has(variable), file + " references undefined " + variable);
    }
  }
});
