#!/usr/bin/env node
// Verify that Astro's sitemap covers published kalams, or compare a deployed sitemap with this build (--live).
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const site = "https://kalamarchive.com";
const root = new URL("../", import.meta.url);
const dist = new URL("./dist/", root);
const live = process.argv.includes("--live");
const pathFromRoot = (name) => new URL(name, root);

async function readSitemap(name) {
  if (!live) return readFile(new URL(name, dist), "utf8");
  const response = await fetch(new URL(name, site + "/"), {
    headers: { "user-agent": process.env.SITEMAP_AUDIT_USER_AGENT || "KalamArchiveSitemapAudit/1.0" },
  });
  assert(response.ok, name + ": HTTP " + response.status +
    " (server: " + (response.headers.get("server") || "unknown") +
    ", cf-ray: " + (response.headers.get("cf-ray") || "none") + ")");
  return response.text();
}

function locations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)]
    .map((match) => match[1].replaceAll("&amp;", "&").trim());
}

async function htmlRoutes(dir, prefix) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return found;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(...await htmlRoutes(new URL(entry.name + "/", dir), prefix + entry.name + "/"));
    } else if (entry.isFile() && entry.name === "index.html") {
      found.push(prefix);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      found.push(prefix + entry.name.slice(0, -5) + "/");
    }
  }
  return found;
}

async function publishedMarkdownCount(directory) {
  const names = (await readdir(pathFromRoot(directory))).filter((name) => name.endsWith(".md"));
  let total = 0;
  for (const name of names) {
    const body = await readFile(pathFromRoot(directory + "/" + name), "utf8");
    // Published defaults to true in Astro's content schema.
    const frontmatter = body.startsWith("---") ? body.split(/\r?\n---\s*(?:\r?\n|$)/u, 1)[0] : "";
    if (!/^published:\s*false\s*(?:#.*)?$/miu.test(frontmatter)) total++;
  }
  return total;
}

const index = await readSitemap("sitemap-index.xml");
assert.match(index, /<sitemapindex\b/u, "Missing sitemap index");
const childUrls = locations(index);
assert(childUrls.length > 0, "Sitemap index contains no children");
assert.equal(new Set(childUrls).size, childUrls.length, "Duplicate child sitemap");

const indexedUrls = new Set();
for (const childUrl of childUrls) {
  const parsed = new URL(childUrl);
  assert.equal(parsed.origin, site, "Wrong sitemap origin: " + childUrl);
  assert.match(parsed.pathname, /^\/sitemap-\d+\.xml$/u, "Unexpected child sitemap: " + childUrl);
  const xml = await readSitemap(parsed.pathname.slice(1));
  assert.match(xml, /<urlset\b/u, "Not a URL sitemap: " + childUrl);
  const urls = locations(xml);
  assert(urls.length > 0, "Empty child sitemap: " + childUrl);
  for (const url of urls) {
    const item = new URL(url);
    assert.equal(item.origin, site, "Off-site URL: " + url);
    assert.equal(item.search, "", "Query string in sitemap: " + url);
    assert.equal(item.hash, "", "Fragment in sitemap: " + url);
    assert(!indexedUrls.has(item.href), "Duplicate sitemap URL: " + item.href);
    indexedUrls.add(item.href);
  }
}

// Audit every generated HTML route, not just archive pages, to detect both
// missing pages and stale sitemap entries from an older build.
const builtRoutes = new Set((await htmlRoutes(dist, "/"))
  .map((path) => new URL(path, site).href));
assert(builtRoutes.size > 0, "No generated HTML routes were found in dist/");

const missing = [...builtRoutes].filter((url) => !indexedUrls.has(url));
assert.equal(missing.length, 0,
  "Sitemap missing " + missing.length + " built pages:\n" + missing.slice(0, 25).join("\n"));
const unexpected = [...indexedUrls].filter((url) => !builtRoutes.has(url));
assert.equal(unexpected.length, 0,
  "Sitemap lists " + unexpected.length + " URLs without built HTML:\n" +
  unexpected.slice(0, 25).join("\n"));

const publishedLyrics = await publishedMarkdownCount("src/data/lyrics");
const builtLyrics = [...builtRoutes].filter((url) => new URL(url).pathname.startsWith("/lyrics/")).length;
assert.equal(builtLyrics, publishedLyrics,
  "Published lyrics (" + publishedLyrics + ") do not match built lyric routes (" + builtLyrics + ")");

const publishedBasta = await publishedMarkdownCount("src/data/basta/pages");
const printedBasta = [...builtRoutes].filter((url) => /^\/basta\/\d+\/$/u.test(new URL(url).pathname)).length;
assert.equal(printedBasta, publishedBasta,
  "Published Basta files (" + publishedBasta + ") do not match built printed pages (" + printedBasta + ")");

console.log("Sitemap verified (" + (live ? "live" : "dist") + "): " + indexedUrls.size +
  " URLs, " + builtLyrics + " standalone lyrics, " + printedBasta +
  " Basta printed pages, " + builtRoutes.size + " generated HTML routes covered.");
