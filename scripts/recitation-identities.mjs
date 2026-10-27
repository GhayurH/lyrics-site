// Explicit source-ID registry. --bootstrap creates an initial snapshot;
// --check blocks accidental renames/deletions/renumbering; --sync only adds new IDs.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";
import { buildBastaKalamCatalog, bastaKalamId } from "../src/lib/basta-kalam-units.ts";
import { stanzaAnchor } from "../src/lib/recitation-identity.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const location = join(root, "src/data/recitation/identity-lock.json");
const args = new Set(process.argv.slice(2));
const name = (entry) => entry.sectionRoman + ":" + entry.number;
const fail = (list) => {
  if (list.length) {
    console.error("Recitation source compatibility needs attention:");
    for (const issue of list.slice(0, 35)) console.error(" - " + issue);
    if (list.length > 35) console.error(" ... " + (list.length - 35) + " more");
    process.exitCode = 1;
  }
};
async function readBody(path) {
  const source = await readFile(path, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw Error("Missing frontmatter: " + path);
  return { head: match[1], body: source.slice(match[0].length) };
}
function yamlValue(head, key) {
  const match = head.match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
  if (!match) return undefined;
  const text = match[1].trim();
  if (text.startsWith('"') && text.endsWith('"')) return JSON.parse(text);
  if (text.startsWith("'") && text.endsWith("'"))
    return text.slice(1, -1).replace(/''/g, "'");
  return text;
}
async function collect(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) files.push(...await collect(join(directory, item.name)));
    else if (item.name.endsWith(".md")) files.push(join(directory, item.name));
  }
  return files.sort();
}
function entryId(entry) {
  return entry.recitationId || bastaKalamId(entry);
}
const lyrics = await Promise.all((await collect(join(root, "src/data/lyrics"))).map(async (path) => {
  const { head } = await readBody(path);
  if (yamlValue(head, "published") === "false") return null;
  const relativePath = relative(join(root, "src/data/lyrics"), path).split(sep).join("/");
  return { id: yamlValue(head, "recitationId") || relativePath.replace(/\.md$/, ""),
    path: relativePath };
}));
const activeLyrics = lyrics.filter(Boolean);
const sourceIndex = JSON.parse(await readFile(join(root, "src/data/basta/index.json"), "utf8"))
  .filter((entry) => entry.sectionRoman !== "Mazameen");
const urduPages = await Promise.all((await collect(join(root, "src/data/basta/pages"))).map(async (path) => {
  const { head, body } = await readBody(path);
  if (yamlValue(head, "published") === "false" ||
      yamlValue(head, "imageOnly") === "true") return null;
  return { page: Number(yamlValue(head, "page")), urdu: body };
}));
const roman = new Map(await Promise.all((await collect(join(root, "src/data/basta/roman"))).map(async (path) => {
  const { head, body } = await readBody(path);
  return [Number(yamlValue(head, "page")), body];
})));
const pages = urduPages.filter(Boolean).map((p) => ({ ...p, roman: roman.get(p.page) }));
const { kalams } = buildBastaKalamCatalog(sourceIndex, pages);
const activeBasta = kalams.map((kalam) => ({
  id: kalam.id,
  key: name(sourceIndex.find((entry) => entryId(entry) === kalam.id)),
  status: kalam.status,
  stanzas: kalam.status === "ready" ? kalam.stanzas.map((stanza) =>
    ({ id: stanza.id, anchor: stanzaAnchor(stanza.urdu) })) : [],
}));

let locked;
try { locked = JSON.parse(await readFile(location, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (args.has("--bootstrap")) {
  const initial = { version: 1, lyrics: activeLyrics, basta: activeBasta.map(
    ({ status, ...record }) => record) };
  const snapshot = JSON.stringify(initial);
  const part = Number([...args].find((arg) => arg.startsWith("--part="))?.slice(7) ?? -1);
  for (let i = 0; i < snapshot.length; i += 4000) {
    if (part >= 0 && Math.floor(i / 40000) !== part) continue;
    console.log("RECITATION_IDENTITY_CHUNK_" + String(i / 4000).padStart(4, "0") + "=" +
      snapshot.slice(i, i + 4000));
  }
  process.exit(0);
}
if (!locked?.lyrics || !locked?.basta || locked.version !== 1)
  throw Error("Identity lock missing: bootstrap and commit src/data/recitation/identity-lock.json");
const errors = [];
const all = (...records) => {
  const keys = new Set();
  for (const record of records) {
    if (keys.has(record.id)) errors.push("Duplicate stable ID " + record.id);
    keys.add(record.id);
  }
};
all(...activeLyrics);
all(...activeBasta);
const lyricMap = new Map(activeLyrics.map((x) => [x.id, x]));
const bastaMap = new Map(activeBasta.map((x) => [x.id, x]));
const knownLyrics = new Map(locked.lyrics.map((x) => [x.id, x]));
const knownBasta = new Map(locked.basta.map((x) => [x.id, x]));
for (const old of locked.lyrics) {
  if (!lyricMap.has(old.id) && !old.retired) errors.push(
    "Removed/renamed lyric " + old.id + " — preserve recitationId on moved Markdown or mark retired");
  if (lyricMap.has(old.id) && old.retired) errors.push("Retired lyric ID was reused: " + old.id);
}
for (const old of locked.basta) {
  const current = bastaMap.get(old.id);
  if (!current && !old.retired) errors.push(
    "Removed/rekeyed Basta kalam " + old.id + " — preserve recitationId in index or mark retired");
  if (current && old.retired) errors.push("Retired Basta ID was reused: " + old.id);
  if (!current || current.status !== "ready" || old.retired) continue;
  const seen = new Set();
  for (const stanza of current.stanzas) {
    if (seen.has(stanza.anchor)) errors.push("Duplicate stanza anchor in " + old.id);
    seen.add(stanza.anchor);
  }
  for (const pinned of old.stanzas) {
    if (!seen.has(pinned.anchor) && !pinned.retired)
      errors.push(old.id + "/" + pinned.id + " source changed/vanished — explicitly update anchor or mark retired");
  }
  const retiredAnchors = new Set(old.stanzas.filter((x) => x.retired).map((x) => x.anchor));
  const knownAnchors = new Set(old.stanzas.map((x) => x.anchor));
  for (const stanza of current.stanzas) {
    if (retiredAnchors.has(stanza.anchor))
      errors.push("Retired stanza anchor reused in " + old.id + " — review before restoring");
    if (!knownAnchors.has(stanza.anchor))
      errors.push("New/unmapped stanza in " + old.id + " (printed " + stanza.id + ") — run ids:sync after reviewing");
  }
}
const newLyrics = activeLyrics.filter((item) => !knownLyrics.has(item.id));
const newBasta = activeBasta.filter((item) => !knownBasta.has(item.id));
if (args.has("--sync")) {
  // Never discard old IDs. Edits to existing anchors require a human-reviewed
  // update, so a later stanza cannot accidentally take an old identity.
  const unresolved = errors.filter((message) =>
    !message.startsWith("New/unmapped stanza in "));
  if (unresolved.length) { fail(unresolved); process.exit(1); }
  locked.lyrics.push(...newLyrics);
  for (const addition of newBasta) {
    const { status, ...record } = addition;
    locked.basta.push(record);
  }
  for (const old of locked.basta) {
    const current = bastaMap.get(old.id);
    if (!current || current.status !== "ready" || old.retired) continue;
    const used = new Set(old.stanzas.map((item) => item.id));
    const anchors = new Set(old.stanzas.map((item) => item.anchor));
    let next = 1;
    for (const stanza of current.stanzas) {
      if (anchors.has(stanza.anchor)) continue;
      while (used.has("stanza-" + String(next).padStart(3, "0"))) next++;
      const id = "stanza-" + String(next).padStart(3, "0");
      old.stanzas.push({ id, anchor: stanza.anchor });
      used.add(id); anchors.add(stanza.anchor);
    }
  }
  locked.lyrics.sort((a, b) => a.id.localeCompare(b.id));
  locked.basta.sort((a, b) => a.id.localeCompare(b.id));
  await mkdir(dirname(location), { recursive: true });
  await writeFile(location, JSON.stringify(locked, null, 2) + "\n");
  console.log("Added " + newLyrics.length + " lyrics, " + newBasta.length + " Basta entries and new stanzas.");
} else {
  errors.push(...newLyrics.map((item) => "New lyric needs permanent ID lock: " + item.id));
  errors.push(...newBasta.map((item) => "New Basta needs permanent ID lock: " + item.id));
  fail(errors);
  if (!errors.length) console.log("Recitation identities validated: " +
    activeLyrics.length + " lyrics, " + activeBasta.length + " indexed Basta kalams.");
}
