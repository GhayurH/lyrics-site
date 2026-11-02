// Maintain permanently published source IDs: check for accidental changes,
// or append new IDs after reviewing newly published poems and stanzas.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { markdownFiles, readSourceMarkdown, frontmatterScalar } from "./lib/source-files.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";
import { buildBastaKalamCatalog, bastaKalamId } from "../src/lib/basta-kalam-units.ts";
import { stanzaAnchor, safeStanzaAnchorRefresh, stanzaPageLabel } from "../src/lib/recitation-identity.ts";

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
function entryId(entry) {
  return entry.recitationId || bastaKalamId(entry);
}
const lyrics = await Promise.all((await markdownFiles(join(root, "src/data/lyrics"), true)).map(async (path) => {
  const { header: head } = await readSourceMarkdown(path);
  if (frontmatterScalar(head, "published") === "false") return null;
  const relativePath = relative(join(root, "src/data/lyrics"), path).split(sep).join("/");
  return { id: frontmatterScalar(head, "recitationId") || relativePath.replace(/\.md$/, ""),
    path: relativePath };
}));
const activeLyrics = lyrics.filter(Boolean);
const sourceIndex = JSON.parse(await readFile(join(root, "src/data/basta/index.json"), "utf8"))
  .filter((entry) => entry.sectionRoman !== "Mazameen");
const urduPages = await Promise.all((await markdownFiles(join(root, "src/data/basta/pages"), true)).map(async (path) => {
  const { header: head, body } = await readSourceMarkdown(path);
  if (frontmatterScalar(head, "published") === "false" ||
      frontmatterScalar(head, "imageOnly") === "true" ||
      frontmatterScalar(head, "contentKind") !== undefined) return null;
  return { page: Number(frontmatterScalar(head, "page")), urdu: body };
}));
const roman = new Map(await Promise.all((await markdownFiles(join(root, "src/data/basta/roman"), true)).map(async (path) => {
  const { header: head, body } = await readSourceMarkdown(path);
  return [Number(frontmatterScalar(head, "page")), body];
})));
const pages = urduPages.filter(Boolean).map((p) => ({ ...p, roman: roman.get(p.page) }));
const roles = JSON.parse(await readFile(join(root, "src/data/basta/fragment-roles.json"), "utf8"));
const { kalams } = buildBastaKalamCatalog(sourceIndex, pages, roles.fragments);
const activeBasta = kalams.map((kalam) => ({
  id: kalam.id,
  key: name(sourceIndex.find((entry) => entryId(entry) === kalam.id)),
  status: kalam.status,
  startPage: kalam.startPage,
  pages: kalam.pages,
  stanzas: kalam.status === "ready" ? kalam.stanzas.map((stanza) =>
    ({ id: stanza.id, anchor: stanzaAnchor(stanza.urdu), pages: stanza.pages })) : [],
}));

let locked;
try { locked = JSON.parse(await readFile(location, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!locked?.lyrics || !locked?.basta || locked.version !== 1)
  throw Error("Missing required tracked registry src/data/recitation/identity-lock.json");
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
const refreshed = [];
// An explicit sync can re-pin a single edited stanza when all other stanza
// anchors still match in order. Never mutate the tracked registry on --check.
if (args.has("--sync")) {
  for (const old of locked.basta) {
    const current = bastaMap.get(old.id);
    if (!current || current.status !== "ready") continue;
    const update = safeStanzaAnchorRefresh(old, current.stanzas);
    if (!update) continue;
    const pinned = old.stanzas.find((stanza) => stanza.id === update.id);
    pinned.anchor = update.anchor;
    refreshed.push(old.id + "/" + update.id + " (" +
      stanzaPageLabel(update.pages, current.startPage) + ")");
  }
}
for (const old of locked.lyrics) {
  if (!lyricMap.has(old.id) && !old.retired) errors.push(
    "Removed/renamed lyric " + old.id + " — preserve recitationId on moved Markdown or mark retired");
  if (lyricMap.has(old.id) && old.retired) errors.push("Retired lyric ID was reused: " + old.id);
}
for (const old of locked.basta) {
  const current = bastaMap.get(old.id);
  if (!current && !old.retired) {
    const indexed = sourceIndex.find((entry) => name(entry) === old.key);
    errors.push("Removed/rekeyed Basta kalam " + old.id + " (" +
      stanzaPageLabel([], indexed?.page) + ") — preserve recitationId in index or mark retired");
  }
  if (current && old.retired) errors.push("Retired Basta ID was reused: " + old.id);
  if (!current || current.status !== "ready" || old.retired) continue;
  const seen = new Set();
  for (const stanza of current.stanzas) {
    if (seen.has(stanza.anchor)) errors.push("Duplicate stanza anchor in " + old.id +
      " (" + stanzaPageLabel(stanza.pages, current.startPage) + ")");
    seen.add(stanza.anchor);
  }
  for (const [index, pinned] of old.stanzas.entries()) {
    if (!seen.has(pinned.anchor) && !pinned.retired) {
      const candidate = current.stanzas[index];
      errors.push(old.id + "/" + pinned.id + " source changed/vanished (" +
        stanzaPageLabel(candidate?.pages ?? [], current.startPage) +
        ") — run npm run source:sync for a single in-place edit; otherwise review the anchor or mark retired");
    }
  }
  const retiredAnchors = new Set(old.stanzas.filter((x) => x.retired).map((x) => x.anchor));
  const knownAnchors = new Set(old.stanzas.map((x) => x.anchor));
  for (const stanza of current.stanzas) {
    if (retiredAnchors.has(stanza.anchor))
      errors.push("Retired stanza anchor reused in " + old.id + " (" +
        stanzaPageLabel(stanza.pages, current.startPage) + ") — review before restoring");
    if (!knownAnchors.has(stanza.anchor))
      errors.push("New/unmapped stanza in " + old.id + " (printed " + stanza.id + ", " +
        stanzaPageLabel(stanza.pages, current.startPage) + ") — run npm run source:sync after reviewing");
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
    // Page metadata is diagnostic only, not part of the permanent lock.
    locked.basta.push({ id: addition.id, key: addition.key,
      stanzas: addition.stanzas.map(({ id, anchor }) => ({ id, anchor })) });
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
  console.log("Added " + newLyrics.length + " lyrics, " + newBasta.length +
    " Basta entries and new stanzas; refreshed " + refreshed.length + " existing anchors.");
  for (const change of refreshed) console.log(" - Updated anchor: " + change);
} else {
  errors.push(...newLyrics.map((item) => "New lyric needs permanent ID lock: " + item.id));
  errors.push(...newBasta.map((item) => "New Basta needs permanent ID lock: " + item.id));
  fail(errors);
  if (!errors.length) console.log("Recitation identities validated: " +
    activeLyrics.length + " lyrics, " + activeBasta.length + " indexed Basta kalams.");
}
