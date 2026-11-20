#!/usr/bin/env node
// One-time, reviewable cleanup of standalone lyric metadata, filenames and source comments.
// Deliberately does not transliterate titles or change poem text.
import { readFile, readdir, rename, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'src/data/lyrics');
const prefix = 'src/data/lyrics/';
const source = join(root, 'src/data/recitation/identity-lock.json');
const redirectsPath = join(root, 'public/_redirects');
const csvPaths = ['audit/round2-dedup-wip.csv', 'audit/manual-md-review-tracker.csv'];
const flags = new Set(process.argv.slice(2));
if ([...flags].some(f => !['--check', '--write', '--no-rename', '--help'].includes(f)) ||
    (flags.has('--check') && flags.has('--write'))) {
  console.error('Usage: node scripts/normalize-lyric-metadata.mjs [--check|--write] [--no-rename]');
  process.exit(2);
}
if (flags.has('--help')) {
  console.log('Read-only by default. --write cleans source headers/comments and safely renames standalone kalam files.');
  console.log('Ambiguous missing/mismatched source/Roman titles require editorial review; never machine-translate.');
  process.exit(0);
}
const write = flags.has('--write');
const renameEnabled = !flags.has('--no-rename');

export const slug = text => String(text).normalize('NFKD').replace(/\p{M}/gu, '')
  .replace(/[‘’ʻʼ`´'ʿʾ]/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
  .split('-').filter(Boolean).slice(0, 22).join('-').slice(0, 120).replace(/-+$/u, '');

const scalarFields = new Set(['title', 'alternateTitle', 'recitationId', 'language', 'lang',
  'direction', 'poet', 'reciter', 'occasion', 'haal', 'romanHaal', 'kalamType', 'bastaNote']);
const arrayFields = new Set(['tags', 'aliases', 'reciter', 'kalamType']);
const typedFields = new Set(['published', 'bastaPage', 'year', 'stanzaPattern', 'stanzaLineExceptions']);
const yamlKey = /^([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]*(.*))?$/u;
const editorialComment = /^\s*#\s*(?:editorial|alternate reading|alternative reading|variant reading|alt(?:ernate)?\s+reading|uncertain|verify|check(?:\s+against)?|todo|needs?\s+review)\s*[:\-–]\s*\S.{5,}/iu;

export function isProvenanceKey(key) {
  let k = key.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toLowerCase().replaceAll('-', '_');
  while (k.startsWith('additional_')) k = k.slice(11);
  return /^(?:source|sources|original|raw|api|scraper|scrape|snapshot|import|archive|archived|crawl|fetch|wordpress|wp|provenance)(?:_|$)/u.test(k) ||
    /(?:^|_)(?:source_id|source_url|metadata_path|original_html|raw_sha256|content_sha256|checksum|sha256|snapshot_path|scrape_url)$/u.test(k);
}
export function isProvenanceComment(line) {
  if (!/^\s*#/.test(line)) return false;
  const body = line.replace(/^\s*#\s*/u, '');
  const key = /^([A-Za-z][\w-]*):/.exec(body)?.[1];
  if (key && isProvenanceKey(key)) return true;
  return /^(?:imported|fetched|scraped|archived|retrieved|downloaded|source|origin(?:al)?\s+(?:url|html|file|website|post|path)|api\s+(?:response|hash))\b/iu.test(body);
}
function quotedArray(raw) {
  const value = raw.trim();
  if (!/^\[[^\[\]\n]*\]$/u.test(value)) return raw;
  const items = value.slice(1, -1).trim();
  if (!items) return '[]';
  const parts = items.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/u);
  if (!parts) return raw;
  if (parts.length !== items.split(',').length) return raw;
  return '[' + parts.map(part => quotation(part.trim())).join(', ') + ']';
}
function quotation(raw) {
  const value = raw.trim();
  if (!value) return raw;
  if (value.startsWith('"') && value.endsWith('"')) return value;
  if (value.startsWith("'") && value.endsWith("'")) return JSON.stringify(value.slice(1, -1).replace(/''/gu, "'"));
  // Do not touch unquoted YAML block or collection syntax.
  if (/^[|>\[{]/u.test(value)) return value;
  return JSON.stringify(value);
}
function readScalar(header, key) {
  const raw = header.match(new RegExp('^' + key + ':\\s*(.*)$', 'mu'))?.[1]?.trim();
  if (raw === undefined) return undefined;
  if (raw.startsWith('"')) { try { return JSON.parse(raw); } catch { return raw.slice(1, -1); } }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replace(/''/gu, "'");
  return raw;
}
function hasArabic(text) { return /\p{Script=Arabic}/u.test(text || ''); }

export function normalize(text, name = 'unknown.md') {
  const lines = text.split('\n');
  if (lines[0] !== '---') return { text, issues: ['missing frontmatter'] };
  const closing = lines.findIndex((line, i) => i > 0 && line === '---');
  if (closing < 1) return { text, issues: ['unterminated frontmatter'] };
  const header = lines.slice(1, closing);
  const output = [];
  let blockIndent = -1;
  let sequenceParent = '';
  let removed = 0;
  for (let i = 0; i < header.length; i++) {
    const line = header[i];
    const indent = line.match(/^ */u)[0].length;
    if (blockIndent >= 0) {
      if (line.trim() && indent <= blockIndent) blockIndent = -1;
      else { output.push(line); continue; }
    }
    if (line.trimStart().startsWith('#')) {
      if (editorialComment.test(line) && !isProvenanceComment(line)) output.push(line);
      else removed++;
      continue;
    }
    const field = indent === 0 ? yamlKey.exec(line) : null;
    if (field) sequenceParent = field[1];
    if (field && isProvenanceKey(field[1])) {
      removed++;
      const next = header[i + 1];
      if ((field[2] === '' || /^[|>]/u.test(field[2])) && next && next.match(/^ +/u)) {
        let j = i + 1;
        while (j < header.length && (header[j].trim() === '' || /^\s/u.test(header[j]))) j++;
        removed += j - i - 1;
        i = j - 1;
      }
      continue;
    }
    if (field?.[1] === 'romanLyrics') {
      output.push(line);
      if (/^[|>]/u.test(field[2] || '')) blockIndent = 0;
      continue;
    }
    if (field?.[1] === 'alternateTitle' && /^(?:""|''|null|~)?$/u.test((field[2] || '').trim())) {
      // Drop empty placeholders: these must be human-reviewed, never synthesized.
      removed++;
      continue;
    }
    if (field && arrayFields.has(field[1]) && (field[2] || '').trim().startsWith('[')) {
      output.push(field[1] + ': ' + quotedArray(field[2]));
      continue;
    }
    if (field && scalarFields.has(field[1]) && field[2] !== undefined) {
      output.push(field[1] + ': ' + quotation(field[2]));
      continue;
    }
    if (field?.[1] === 'stanzaPattern' && /^(?:4\+2|2\+2\+2)$/u.test(field[2])) {
      output.push('stanzaPattern: ' + JSON.stringify(field[2]));
      continue;
    }
    if (field && typedFields.has(field[1])) { output.push(line); continue; }
    if (/^\s+-\s+/u.test(line) && blockIndent < 0 && arrayFields.has(sequenceParent)) {
      // List scalar items (e.g. reciters) must be strings, not implicit YAML booleans/numbers.
      const match = /^(\s+-\s+)(.*)$/u.exec(line);
      if (match && match[2] && !/^["'[{]/u.test(match[2])) {
        output.push(match[1] + quotation(match[2]));
        continue;
      }
    }
    if (field && field[2] && !/^[-\d+\[{|>]|^true$|^false$|^null$/u.test(field[2])) {
      output.push(field[1] + ': ' + quotation(field[2]));
      continue;
    }
    output.push(line);
  }
  const body = lines.slice(closing + 1).filter(line => {
    if (isProvenanceComment(line)) { removed++; return false; }
    return true;
  });
  const cleanedHeader = output.join('\n');
  const lang = readScalar(cleanedHeader, 'language');
  const langCode = readScalar(cleanedHeader, 'lang');
  const english = lang === 'English' || langCode === 'en';
  const latinOriginal = ['pa', 'skr', 'bft'].includes(langCode);
  const title = readScalar(cleanedHeader, 'title');
  const alternate = readScalar(cleanedHeader, 'alternateTitle');
  const issues = [];
  if (!title || title === 'null') issues.push('missing source-language title');
  else if (!english && !latinOriginal && !hasArabic(title)) issues.push('non-English title needs source script review');
  else if (english && hasArabic(title)) issues.push('English title contains source-script text');
  if (english && alternate !== undefined) {
    // English kalams have only title. Remove alternateTitle without touching lyrics.
    for (let i = output.length - 1; i >= 0; i--) if (/^alternateTitle:/u.test(output[i])) output.splice(i, 1);
    removed++;
  } else if (!english && !alternate) issues.push('missing Roman alternateTitle');
  else if (!english && hasArabic(alternate)) issues.push('alternateTitle must be Roman of the source title');
  else if (!english && !/[a-z]/iu.test(alternate)) issues.push('Roman alternateTitle has no Latin letters');
  if (!lang && !langCode) issues.push('missing language metadata');
  // An existing alternateTitle can be a different verse: script cannot verify transliteration.
  const normalized = ['---', ...output, '---', ...body].join('\n');
  return { text: normalized, issues, title, alternate: english ? undefined : alternate,
    english, published: readScalar(cleanedHeader, 'published') !== 'false',
    recitationId: readScalar(cleanedHeader, 'recitationId'), removed };
}

function insertId(text, id) {
  if (!id) return text;
  const lines = text.split('\n');
  const at = lines.findIndex(line => /^alternateTitle:|^title:/u.test(line));
  if (at < 0) return text;
  lines.splice(at + 1, 0, 'recitationId: ' + JSON.stringify(id));
  return lines.join('\n');
}

function sortCsvRows(content) {
  // Raw-record parser preserves existing CSV dialect, quoted multiline cells and comments.
  const rows = []; let quoted = false, begin = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '"') {
      if (quoted && content[i + 1] === '"') { i++; continue; }
      quoted = !quoted;
    } else if (content[i] === '\n' && !quoted) { rows.push(content.slice(begin, i + 1)); begin = i + 1; }
  }
  if (begin < content.length) rows.push(content.slice(begin));
  if (!rows.length || !/^\uFEFF?path\s*,/iu.test(rows[0])) return content;
  const key = row => row.startsWith('"') ? row.match(/^"((?:[^"]|"")*)"/u)?.[1]?.replace(/""/gu,'"') ?? row : row.slice(0, row.indexOf(',') >= 0 ? row.indexOf(',') : undefined);
  const nonempty = rows.slice(1).filter(row => row.trim());
  nonempty.sort((a, b) => key(a).localeCompare(key(b), 'en', { numeric: true }));
  return rows[0] + nonempty.join('');
}
function updateCsv(content, replacements) {
  let next = content;
  // Two-phase replacement prevents chain renames when a destination is another old basename.
  const items = [...replacements].sort((a,b) => b[0].length - a[0].length);
  const stubs = items.map((_, i) => `__KALAM_RENAME_TOKEN_${i}__`);
  for (let i = 0; i < items.length; i++) {
    const old = items[i][0];
    const escaped = old.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    next = next.replace(new RegExp(`(?<![\\w.-])${escaped}(?![\\w.-])`, 'gu'), stubs[i]);
  }
  for (let i = 0; i < items.length; i++) next = next.replaceAll(stubs[i], items[i][1]);
  return sortCsvRows(next);
}

async function main() {
  const names = (await readdir(dir)).filter(n => n.endsWith('.md')).sort();
  const records = await Promise.all(names.map(async name => {
    const before = await readFile(join(dir, name), 'utf8');
    const result = normalize(before, name);
    return { name, before, ...result };
  }));
  const reservedOriginal = new Set(names.map(n => n.slice(0, -3)));
  const assigned = new Set();
  let collisions = 0;
  for (const record of records) {
    record.to = record.name;
    if (!renameEnabled || record.issues.length) continue;
    const titleForFilename = record.english ? record.title : record.alternate;
    const base = titleForFilename && slug(titleForFilename);
    if (!base) { record.issues.push('filename cannot be derived from an approved Roman title'); continue; }
    let candidate = base, suffix = 2;
    const own = record.name.slice(0, -3);
    // Preserve all historical routes; don't reuse another kalam's old URL.
    while (assigned.has(candidate) || (candidate !== own && reservedOriginal.has(candidate))) {
      candidate = `${base}-${suffix++}`; collisions++;
    }
    assigned.add(candidate);
    record.to = candidate + '.md';
  }
  const replacements = records.filter(r => r.to !== r.name).map(r => [r.name, r.to]);
  let lock;
  try { lock = JSON.parse(await readFile(source, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const lockedByPath = new Map((lock?.lyrics || []).map(r => [r.path, r]));
  const issues = [];
  const redirectAdds = [];
  for (const r of records) {
    for (const message of r.issues) issues.push(`${r.name}: ${message}`);
    if (r.to === r.name) continue;
    const locked = lockedByPath.get(r.name);
    if (locked && r.recitationId && locked.id !== r.recitationId) {
      issues.push(`${r.name}: recitationId conflicts with identity-lock.json; renaming cancelled`);
      r.to = r.name; continue;
    }
    const id = r.recitationId || locked?.id || (r.published ? r.name.slice(0, -3) : undefined);
    if (r.published && (!id || id.length > 160 || /[^\p{L}\p{N}_/-]/u.test(id))) {
      issues.push(`${r.name}: published recitation identity cannot be preserved automatically; renaming cancelled`);
      r.to = r.name; continue;
    }
    if (!r.recitationId && id) r.text = insertId(r.text, id);
    if (locked) locked.path = r.to;
    if (r.published) redirectAdds.push(`/lyrics/${r.name.slice(0,-3)}/ /lyrics/${r.to.slice(0,-3)}/ 301`);
  }
  const finalReplacements = records.filter(r => r.to !== r.name).map(r => [r.name, r.to]);
  let redirects = await readFile(redirectsPath, 'utf8');
  const existingLines = new Set(redirects.split(/\r?\n/u).map(x => x.trim()));
  const newRedirects = redirectAdds.filter(line => !existingLines.has(line));
  if (redirects.split('\n').filter(x => x.trim() && !x.startsWith('#')).length + newRedirects.length > 2000) {
    issues.push('Cloudflare Pages _redirects would exceed 2000 rules; published renames must use a different redirect mechanism');
    // Safety: do not apply an incomplete set of redirect mappings.
    throw Error(issues.at(-1));
  }
  if (newRedirects.length) redirects = redirects.replace(/\n*$/u, '\n') + newRedirects.join('\n') + '\n';
  const csvChanges = [];
  for (const path of csvPaths) {
    const full = join(root, path);
    let content;
    try { content = await readFile(full, 'utf8'); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const next = updateCsv(content, finalReplacements);
    if (next !== content) csvChanges.push({ path: full, next });
  }
  const modified = records.filter(r => r.text !== r.before || r.to !== r.name);
  const report = { scanned: records.length, modified: modified.length, renamed: finalReplacements.length,
    redirectAdds: newRedirects.length, collisions, csvChanged: csvChanges.length, issues: issues.length };
  console.log(JSON.stringify(report, null, 2));
  for (const issue of issues.slice(0, 100)) console.log('REVIEW:', issue);
  if (issues.length > 100) console.log(`... ${issues.length - 100} more review findings`);
  if (!write) { if (modified.length || issues.length) process.exitCode = 1; return; }
  // All reads and target-name decisions precede mutations. Never destroy existing files.
  const moved = modified.filter(r => r.to !== r.name);
  for (let i = 0; i < moved.length; i++) {
    const tmp = `.__lyric_metadata_rename_${String(i).padStart(6, '0')}.tmp`;
    try { await access(join(dir, tmp)); throw Error(`Temporary filename already in use: ${tmp}`); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    moved[i].temp = tmp;
  }
  for (const r of moved) await rename(join(dir, r.name), join(dir, r.temp));
  for (const r of modified) {
    const at = join(dir, r.temp || r.name);
    if (r.text !== r.before) await writeFile(at, r.text, 'utf8');
  }
  for (const r of moved) await rename(join(dir, r.temp), join(dir, r.to));
  if (lock) await writeFile(source, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  if (newRedirects.length) await writeFile(redirectsPath, redirects, 'utf8');
  for (const { path, next } of csvChanges) await writeFile(path, next, 'utf8');
  if (issues.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}