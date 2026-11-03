// Shared filesystem and frontmatter contract for source maintenance scripts.
// Does not normalize source text or make editorial decisions.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export async function markdownFiles(directory, recursive = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (recursive && entry.isDirectory()) files.push(...await markdownFiles(path, true));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files.sort();
}

export async function readSourceMarkdown(path) {
  const text = await readFile(path, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  if (!match) throw Error("Missing or unterminated Markdown frontmatter: " + path);
  return { text, header: match[1], body: text.slice(match[0].length) };
}

// Scalars used by publication and permanent-ID checks; not a general YAML parser.
export function frontmatterScalar(header, key) {
  const match = header.match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
  if (!match) return undefined;
  const raw = match[1].trim();
  if (raw.startsWith('"') && raw.endsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'") && raw.endsWith("'"))
    return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

export async function bastaPageSources(directory) {
  const entries = await Promise.all((await markdownFiles(directory)).filter(
    path => /(?:^|[/\\])\d+\.md$/u.test(path)
  ).map(async path => {
    const source = await readSourceMarkdown(path);
    return [Number(path.match(/(\d+)\.md$/u)[1]), { ...source, path }];
  }));
  return new Map(entries);
}

/** Read a two-space-indented Markdown YAML literal without interpreting poetry as YAML keys.
 * Missing romanLyrics means deliberately untranslated, not an empty translation.
 */
export function romanLyricsFromHeader(header) {
  const lines = header.replace(/\r\n?/gu, "\n").split("\n");
  const start = lines.findIndex(line => /^romanLyrics:\s*\|-\s*$/u.test(line));
  if (start < 0) return undefined;
  const verses = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !/^\s/u.test(line)) break;
    if (line.trim() && !line.startsWith("  ")) throw Error("Invalid Roman literal indentation");
    verses.push(line.startsWith("  ") ? line.slice(2) : line);
  }
  return verses.join("\n").trimEnd();
}
