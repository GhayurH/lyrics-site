// Validate CSS token references across all owner files, not just tokens.css.
// Pagefind's --pf-* variables are intentionally consumed by its component UI.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const directory = join(process.cwd(), "src/styles");
const sheets = Object.fromEntries(readdirSync(directory)
  .filter(name => name.endsWith(".css"))
  .map(name => [name, readFileSync(join(directory, name), "utf8")]));
const allCss = Object.values(sheets).join("\n");
const definitions = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
const references = new Set([...allCss.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]));

// Values assigned by the browser at runtime, or supplied by Pagefind itself.
const themeSource = readFileSync("src/client/theme.ts", "utf8");
const siteSource = readFileSync("src/client/site.ts", "utf8");
const runtimeAssignments = new Set([...themeSource, ...siteSource].length
  ? [...(themeSource + "\n" + siteSource).matchAll(/style\.setProperty\(["'](--[\w-]+)/g)]
      .map(match => match[1])
  : []);
const external = new Set(["--pf-dropdown-max-height"]);

test("every CSS variable has a defined, runtime, or vendor-provided owner", () => {
  for (const name of references) {
    assert(definitions.has(name) || runtimeAssignments.has(name) || external.has(name),
      "Unowned CSS custom property: " + name);
  }
});

test("declared design tokens are used; Pagefind component inputs are external consumers", () => {
  for (const name of definitions) {
    if (name.startsWith("--pf-")) continue;
    assert(references.has(name), "Unused CSS custom property: " + name);
  }
});

test("semantic colors and dropdown sizing have safe fallbacks", () => {
  assert.match(sheets["corrections.css"], /background:\s*var\(--site-background\)/);
  assert.doesNotMatch(allCss, /var\(--page-background\)/);
  assert.match(sheets["search.css"], /var\(--pf-dropdown-max-height,\s*50dvh\)/);
  assert.match(sheets["tokens.css"], /--preset-sepia-ink:\s*#[0-9a-f]{6}/i);
  assert.match(sheets["theme-palettes.css"], /--primary-text:\s*var\(--preset-sepia-ink\)/);
  assert.match(sheets["appearance.css"], /--swatch-ink:\s*var\(--theme-foreground,\s*var\(--preset-sepia-ink\)\)/);
});
