// Shared design contract: a missed reader breakpoint or reintroduced hardcoded
// width should fail before it can silently diverge across routes.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const styleDir = join(process.cwd(), "src/styles");
const css = Object.fromEntries(readdirSync(styleDir).filter((p) => p.endsWith(".css"))
  .map((path) => [path, readFileSync(join(styleDir, path), "utf8")]));
const tokens = css["tokens.css"];
const readerStyles = ["lyrics.css", "basta.css", "basta-reader.css", "reading-columns.css", "recitation.css"];
const mobileQuery = readFileSync("src/client/viewport.ts", "utf8");
const readerState = readFileSync("src/client/reader-state.ts", "utf8");
const recitationReader = readFileSync("src/client/recitation-reader.ts", "utf8");

test("shared colours and dimensions are defined only by the token file", () => {
  assert.match(css["core.css"], /@import "\.\/tokens\.css";/);
  for (const name of ["content-wide", "content-reading", "reading-single-width",
    "reading-scan-width", "reading-urdu-size", "reading-roman-size", "ui-target",
    "ui-radius", "surface-background", "primary-text", "border-colour"]) {
    assert.match(tokens, new RegExp("--" + name + ":"));
    for (const [file, source] of Object.entries(css)) {
      if (file !== "tokens.css") {
        assert.doesNotMatch(source, new RegExp("--" + name + ":"),
          name + " must not be redefined in " + file);
      }
    }
  }
  for (const file of readerStyles) {
    assert.doesNotMatch(css[file], /\b48rem\b/, file + " has a stale inline reader width");
    if (file !== "recitation.css") {
      assert.match(css[file], /var\(--reading-single-width\)|var\(--reading-urdu-size\)|var\(--reading-roman-size\)/,
        file + " should consume shared reading tokens");
    }
  }
});

test("reader-shell breakpoints and responsive edition rules have one owner", () => {
  for (const [file, source] of Object.entries(css)) {
    if (file !== "reading-columns.css")
      assert.doesNotMatch(source, /@container\s+reader-shell\s*\(/,
        file + " must not define an independent edition breakpoint");
  }
  const layout = css["reading-columns.css"];
  assert.match(layout, /@container reader-shell \(max-width: 46rem\)/);
  assert.match(layout, /@container reader-shell \(min-width: 46\.01rem\)/);
  assert.match(layout, /\.recite-editions \.lyric-reading-roman\s*\{\s*border-inline-end: 0/);
  assert.doesNotMatch(layout, /@container reader-shell \(max-width: 40rem\)/);
  // Scans and the index intentionally have separate, documented cutoffs.
  const bounds = [...layout.matchAll(/@container reader-shell \((?:min|max)-width: ([\d.]+)rem/g)]
    .map((match) => Number(match[1]));
  assert(bounds.every((value) => [30, 46, 46.01, 76].includes(value)),
    "new reader-shell breakpoints need an explicit contract review");
});

test("browser reader defaults use a single mobile query", () => {
  assert.match(mobileQuery, /MOBILE_VIEWPORT_QUERY = "\(max-width: 700px\)"/);
  for (const [name, source] of [["reader-state.ts", readerState], ["recitation-reader.ts", recitationReader]]) {
    assert.match(source, /isMobileViewport\(\)/, name);
    assert.doesNotMatch(source, /matchMedia\("\(max-width:/, name);
  }
  assert.match(css["reading-columns.css"], /@media \(max-width: 700px\)/);
});

test("shared minimum tap targets do not regress to local measurements", () => {
  for (const [file, source] of Object.entries(css)) {
    if (file === "tokens.css") continue;
    assert.doesNotMatch(source, /min-height:\s*2\.75rem\b/,
      file + " needs var(--ui-target) rather than a duplicate");
  }
});

test("all referenced shared reading tokens resolve, including spacing presets", () => {
  const declared = new Set([...tokens.matchAll(/(--reading-[\w-]+):/g)].map((match) => match[1]));
  for (const [file, source] of Object.entries(css)) {
    for (const [, variable] of source.matchAll(/var\((--reading-[\w-]+)/g)) {
      assert(declared.has(variable), file + " references undefined " + variable);
    }
  }
  for (const [file, prefix] of [["basta.css", "basta-page"], ["basta-reader.css", "basta"]]) {
    for (const mode of ["compact", "relaxed"]) {
      for (const language of ["urdu", "roman"]) {
        assert.match(css[file], new RegExp("--" + prefix + "-" + language
          + "-leading: var\\(--reading-" + language + "-leading-" + mode + "\\)"),
          file + " must preserve the " + mode + " " + language + " line spacing");
      }
    }
  }
});

test("feature-page widths and shared component radii come from semantic tokens", () => {
  const shared = [
    "content-feature", "content-intro", "content-compact", "reading-scan-width",
    "ui-radius-tight", "ui-radius-card", "ui-panel-radius",
    "preset-light-main", "preset-dark-main", "preset-sepia-main", "preset-amoled-main",
  ];
  for (const name of shared) assert.match(tokens, new RegExp("--" + name + ":"));
  for (const [file, source] of Object.entries(css)) {
    if (file === "tokens.css") continue;
    // Content dimensions shared by multiple routes must not drift again.
    assert.doesNotMatch(source, /max-width:\s*(?:72|52|42)rem\b/,
      file + " should use the semantic content-width token");
    assert.doesNotMatch(source, /border-radius:\s*0?\.(?:55|75)rem\b/,
      file + " should use a shared component radius");
  }
  for (const file of ["about.css", "basta.css", "saved.css", "search.css"])
    assert.match(css[file], /var\(--content-feature\)/);
  assert.match(css["basta.css"], /var\(--reading-scan-width\)/);
  assert.match(css["core.css"], /var\(--preset-amoled-main\)/);
  assert.match(tokens, /--button-background:\s*var\(--accent-color\)/);
});

test("every variable reference in shared design CSS resolves to a declared token", () => {
  const definitions = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  for (const [file, source] of Object.entries(css)) {
    if (file === "tokens.css") continue;
    for (const [, variable] of source.matchAll(/var\((--(?:content|preset|ui|reading)-[\w-]+)/g)) {
      assert(definitions.has(variable), file + " references undefined " + variable);
    }
  }
});

test("theme-aware borders use one semantic token, including the custom editor", () => {
  assert.match(tokens, /--ui-border:\s*1px solid var\(--border-colour\)/);
  assert.match(tokens, /html\[data-theme="custom"\] \.theme-dialog\s*\{[^}]*--ui-border:\s*1px solid var\(--border-colour\)/s);
  for (const [file, source] of Object.entries(css)) {
    if (file === "tokens.css") continue;
    assert.doesNotMatch(source, /1px solid var\(--border-colour\)/,
      file + " repeats the canonical UI border");
  }
  assert.match(css["reading-columns.css"], /var\(--ui-border\)/);
  assert.match(css["core.css"], /var\(--ui-border\)/);
});
