// Deterministic output budgets supplement browser measurements; they do not
// pretend compressed build bytes are a real user's network transfer or LCP.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import ts from "typescript";

export const DEFAULT_BUDGETS = Object.freeze({
  deploymentFiles: 20_000,
  initialJsGzipBytes: 128 * 1024,
  collectionHtmlBytes: 180 * 1024,
  collectionOpeningTags: 2000,
  catalogJsonBytes: 2 * 1024 * 1024,
  pagefindBytes: 40 * 1024 * 1024,
  pagefindFiles: 6000,
  singleFileBytes: 25 * 1024 * 1024,
});
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const largest = (a, b) => b.bytes - a.bytes || compare(a.path, b.path);

export function validateBudgets(overrides = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides))
    throw new TypeError("Build budgets must be a JSON object");
  for (const [name, value] of Object.entries(overrides)) {
    if (!(name in DEFAULT_BUDGETS)) throw new TypeError(`Unknown build budget: ${name}`);
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`Invalid build budget: ${name}`);
  }
  return { ...DEFAULT_BUDGETS, ...overrides };
}

function attributes(raw) {
  const values = {};
  for (const match of raw.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g))
    values[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? "").replaceAll("&amp;", "&");
  return values;
}
function localPath(reference, from) {
  const url = new URL(reference, `https://build.invalid/${from}`);
  return url.origin === "https://build.invalid" ? decodeURIComponent(url.pathname.slice(1)) : null;
}

export function analyzeBuild(root, overrides = {}) {
  const budgets = validateBudgets(overrides);
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push({ path: relative(root, path).replaceAll("\\", "/"), bytes: statSync(path).size });
    }
  }
  walk(root);
  files.sort((a, b) => compare(a.path, b.path));
  const byPath = new Map(files.map(file => [file.path, file]));
  const modules = new Map();
  const missingModules = new Set();
  function readModule(path) {
    if (modules.has(path)) return modules.get(path);
    if (!byPath.has(path)) { missingModules.add(path); return null; }
    const text = readFileSync(join(root, path), "utf8");
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const dependencies = [];
    for (const statement of source.statements) {
      if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) ||
          !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      // Only static same-origin imports execute as part of this entry graph.
      // Optional import() chunks (including embedded export fonts) are separate.
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        const resolved = localPath(specifier, path);
        if (resolved) dependencies.push(resolved);
      }
    }
    const module = { bytes: Buffer.byteLength(text), gzipBytes: gzipSync(text, { level: 9 }).length, dependencies };
    modules.set(path, module);
    return module;
  }
  const graphCache = new Map();
  function moduleGraph(path) {
    if (graphCache.has(path)) return graphCache.get(path);
    const found = new Set();
    function visit(current) {
      if (found.has(current)) return;
      const module = readModule(current);
      if (!module) return;
      found.add(current);
      module.dependencies.forEach(visit);
    }
    visit(path);
    graphCache.set(path, found);
    return found;
  }
  const inlineCache = new Map();
  const html = [];
  for (const file of files.filter(file => file.path.endsWith(".html"))) {
    const source = readFileSync(join(root, file.path), "utf8");
    const initial = new Set();
    let inlineBytes = 0, inlineGzipBytes = 0;
    for (const script of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = attributes(script[1]);
      if (attrs.type && !["module", "text/javascript", "application/javascript"].includes(attrs.type)) continue;
      if (attrs.src) {
        const path = localPath(attrs.src, file.path);
        if (path) for (const dependency of moduleGraph(path)) initial.add(dependency);
      } else if (script[2].trim()) {
        let size = inlineCache.get(script[2]);
        if (!size) {
          size = { bytes: Buffer.byteLength(script[2]), gzipBytes: gzipSync(script[2], { level: 9 }).length };
          inlineCache.set(script[2], size);
        }
        inlineBytes += size.bytes;
        inlineGzipBytes += size.gzipBytes;
      }
    }
    for (const link of source.matchAll(/<link\b([^>]*)>/gi)) {
      const attrs = attributes(link[1]);
      if (attrs.rel !== "modulepreload" || !attrs.href) continue;
      const path = localPath(attrs.href, file.path);
      if (path) for (const dependency of moduleGraph(path)) initial.add(dependency);
    }
    const markup = source.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, "$1</script>")
      .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, "$1</style>");
    html.push({ path: file.path, bytes: file.bytes,
      openingTags: [...markup.matchAll(/<[a-z][\w:-]*(?=[\s/>])/gi)].length,
      initialJsBytes: inlineBytes + [...initial].reduce((sum, path) => sum + modules.get(path).bytes, 0),
      initialJsGzipBytes: inlineGzipBytes + [...initial].reduce((sum, path) => sum + modules.get(path).gzipBytes, 0),
      initialJsFiles: [...initial].sort(compare),
    });
  }
  const collections = html.filter(file => /^(?:categories|poets|languages|occasions)\//.test(file.path));
  const catalogs = files.filter(file => /^data\/(?:[^/]*catalog\.json|basta-kalams\.json|discovery\/[^/]+\.json)$/.test(file.path));
  const pagefind = files.filter(file => file.path.startsWith("pagefind/"));
  const sumBytes = list => list.reduce((sum, file) => sum + file.bytes, 0);
  const violations = [];
  function check(budget, actual, path = "dist/") {
    if (actual > budgets[budget]) violations.push({ budget, path, actual, limit: budgets[budget] });
  }
  check("deploymentFiles", files.length);
  check("pagefindFiles", pagefind.length, "pagefind/");
  check("pagefindBytes", sumBytes(pagefind), "pagefind/");
  for (const file of files) check("singleFileBytes", file.bytes, file.path);
  for (const file of html) check("initialJsGzipBytes", file.initialJsGzipBytes, file.path);
  for (const file of collections) {
    check("collectionHtmlBytes", file.bytes, file.path);
    check("collectionOpeningTags", file.openingTags, file.path);
  }
  for (const file of catalogs) check("catalogJsonBytes", file.bytes, file.path);
  for (const path of [...missingModules].sort(compare))
    violations.push({ budget: "missingInitialModule", path, actual: 1, limit: 0 });
  const byType = {};
  for (const file of files) {
    const extension = file.path.split("/").at(-1).split(".").slice(1).at(-1) || "(none)";
    const summary = byType[extension] ??= { files: 0, bytes: 0 };
    summary.files++; summary.bytes += file.bytes;
  }
  const samplePaths = new Set(["index.html", "categories/noha/index.html", "basta/read/index.html",
    "basta/138/index.html", "lyrics/aa-asghar-bin-tere/index.html", "recite/index.html",
    "recite/read/index.html", "search/index.html", "saved/index.html", "poets/index.html"]);
  return {
    version: 1, budgets, totals: { files: files.length, bytes: sumBytes(files), htmlPages: html.length },
    byType, largestFiles: [...files].sort(largest).slice(0, 12),
    pagefind: { files: pagefind.length, bytes: sumBytes(pagefind) }, catalogs,
    collectionPages: { files: collections.length, largest: [...collections].sort(largest).slice(0, 8) },
    initialJs: { largest: [...html].sort((a, b) => b.initialJsGzipBytes - a.initialJsGzipBytes || compare(a.path, b.path)).slice(0, 8),
      representative: html.filter(file => samplePaths.has(file.path)) },
    violations,
  };
}
