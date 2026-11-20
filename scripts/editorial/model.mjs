// Private editorial inventory. Parsing and stanza interpretation remain owned
// by the source-domain helpers; this adapter never rewrites poetry.
import { createHash, randomUUID } from 'node:crypto';
import { parseDocument } from 'yaml';
import { reviewMarkdown, reviewPublicationConventions } from '../../src/lib/source-review.ts';
import { splitLyricStanzas } from '../../src/lib/lyric-stanzas.ts';
import { normalizeSearchQuery } from '../../src/lib/search-normalization.ts';

export const TASKS = Object.freeze([
  { id: 'duplicates', label: 'Duplicate comparison' },
  { id: 'source', label: 'Original-language reading' },
  { id: 'roman', label: 'Roman transcription' },
  { id: 'alignment', label: 'Stanza alignment' },
  { id: 'metadata', label: 'Titles and metadata' },
  { id: 'publication', label: 'Publication acceptance' },
]);
export const STATUSES = new Set(['accepted', 'needs_work', 'deferred', 'unreviewed']);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' ? value : '';
const originalLanguages = {
  Urdu: ['ur'], Arabic: ['ar'], Persian: ['fa'], English: ['en'],
  Panjabi: ['pa-Arab', 'pa'], Saraiki: ['skr-Arab', 'skr'], Balti: ['bft-Arab', 'bft'],
};

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
  return value;
}
export const canonicalJSON = value => JSON.stringify(sorted(value));
const editionText = value => text(value).replace(/\r\n?/gu, '\n').trimEnd();
export const searchText = value => normalizeSearchQuery(text(value)).toLowerCase().replace(/\s+/gu, ' ').trim();

export function parseEditorialRecord(path, bytes, lockedId) {
  const raw = bytes.toString('utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw);
  let metadata = {}, original = match ? raw.slice(match[0].length) : raw;
  const findings = [];
  const issue = (code, detail, severity = 'warning') => findings.push({ code, detail, severity });
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { issue('invalid-encoding', 'Source bytes are not valid UTF-8; repair the encoding before reviewing the displayed text', 'error'); }
  try {
    if (!match) throw Error('Missing or unterminated YAML frontmatter');
    const document = parseDocument(match[1], { uniqueKeys: true, prettyErrors: false });
    if (document.errors.length) throw Error(document.errors.map(error => error.message).join('; '));
    // JSON round-tripping rejects cyclic YAML aliases and gives the UI plain data.
    metadata = JSON.parse(JSON.stringify(document.toJS({ maxAliasCount: 20 })));
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object')
      throw Error('Frontmatter must be a mapping');
  } catch (error) {
    metadata = {};
    issue('invalid-frontmatter', String(error.message), 'error');
  }
  const roman = text(metadata.romanLyrics);
  const explicitId = text(metadata.recitationId).trim();
  const permanentId = explicitId || lockedId || null;
  if (metadata.recitationId !== undefined && typeof metadata.recitationId !== 'string')
    issue('invalid-identity', 'The permanent ID must be a quoted string', 'error');
  if (explicitId && !/^[\p{L}\p{N}_/-]{1,160}$/u.test(explicitId))
    issue('invalid-identity', 'The permanent ID does not match the source identity contract', 'error');
  if (explicitId && lockedId && explicitId !== lockedId)
    issue('identity-conflict', 'recitationId disagrees with the published identity lock', 'error');
  for (const key of ['title', 'language', 'lang', 'direction', 'kalamType']) {
    const value = metadata[key];
    if (!(typeof value === 'string' && value.trim()) &&
        !(key === 'kalamType' && Array.isArray(value) && value.length && value.every(item => typeof item === 'string' && item.trim())))
      issue('missing-' + key, 'Missing or invalid ' + key, 'error');
  }
  for (const key of ['alternateTitle', 'poet', 'occasion', 'haal', 'romanHaal', 'romanLyrics'])
    if (metadata[key] !== undefined && typeof metadata[key] !== 'string')
      issue('invalid-' + key, key + ' must be a string', 'error');
  for (const key of ['tags', 'aliases'])
    if (metadata[key] !== undefined && (!Array.isArray(metadata[key]) || metadata[key].some(item => typeof item !== 'string')))
      issue('invalid-' + key, key + ' must be an array of strings', 'error');
  if (metadata.published !== undefined && typeof metadata.published !== 'boolean')
    issue('invalid-published', 'published must be a boolean, not a quoted word', 'error');
  if (metadata.year !== undefined && !Number.isSafeInteger(metadata.year))
    issue('invalid-year', 'year must be an integer', 'error');
  if (metadata.reciter !== undefined && !(typeof metadata.reciter === 'string' && metadata.reciter.trim()) &&
      !(Array.isArray(metadata.reciter) && metadata.reciter.length && metadata.reciter.every(item => typeof item === 'string' && item.trim())))
    issue('invalid-reciter', 'reciter must be one name or an array of independent names', 'error');
  if (metadata.stanzaPattern !== undefined &&
      !(Number.isInteger(metadata.stanzaPattern) && metadata.stanzaPattern >= 1 && metadata.stanzaPattern <= 12) &&
      !['4+2', '2+2+2'].includes(metadata.stanzaPattern))
    issue('invalid-stanza-pattern', 'stanzaPattern must be an integer from 1 to 12, 4+2, or 2+2+2', 'error');
  if (metadata.stanzaLineExceptions !== undefined && (!Array.isArray(metadata.stanzaLineExceptions) ||
      metadata.stanzaLineExceptions.some(item => !Number.isInteger(item) || item < 1)))
    issue('invalid-stanza-exceptions', 'stanzaLineExceptions must be an array of positive integers', 'error');
  const english = metadata.language === 'English';
  if (!english && !text(metadata.alternateTitle).trim())
    issue('missing-alternate-title', 'A non-English work needs a Roman title of the same source verse', 'error');
  if (english && metadata.alternateTitle !== undefined)
    issue('english-alternate-title', 'An English original should have title only', 'error');
  if (metadata.language && !originalLanguages[metadata.language]?.includes(metadata.lang))
    issue('language-code', 'Original language and language code do not agree', 'error');
  if (metadata.lang) {
    const expected = ['en', 'pa', 'skr', 'bft'].includes(metadata.lang) ? 'ltr' : 'rtl';
    if (metadata.direction !== expected)
      issue('language-direction', 'Original language code and direction do not agree', 'error');
  }
  if (!original.trim()) issue('missing-original', 'No original-language body is present', 'error');
  if (!english && !roman.trim()) issue('missing-roman', 'No Roman transcription is present', 'error');
  if (!text(metadata.poet).trim()) issue('missing-poet', 'Poet attribution needs editorial review');
  if (!text(metadata.occasion).trim()) issue('missing-occasion', 'No reviewed occasion is recorded');
  if (!permanentId) issue('unassigned-identity', 'A local candidate ID is used until a permanent source ID is assigned');
  if (!findings.some(item => item.code === 'invalid-frontmatter')) {
    const reviewed = reviewMarkdown({ path, kind: 'lyrics', text: raw });
    for (const finding of [...reviewed.issues, ...reviewPublicationConventions(reviewed)])
      if (!findings.some(item => item.code === finding.code && item.detail === finding.detail))
        findings.push({ ...finding, severity: 'warning' });
  }
  const { romanLyrics: _roman, ...fields } = metadata;
  const fingerprints = {
    original: sha256(editionText(original)),
    roman: sha256(editionText(roman)),
    metadata: sha256(canonicalJSON(fields)),
  };
  // Preserve actionable comments as review inputs while ignoring YAML key order,
  // filename changes, line-ending encoding and extra final newlines.
  const comments = (match?.[1] || '').split(/\r?\n/u).filter(line => /^\s*#/u.test(line));
  const fingerprint = sha256(canonicalJSON({ ...fingerprints, comments }));
  const { published: _published, ...reviewMetadata } = fields;
  const language = { language: metadata.language, lang: metadata.lang, direction: metadata.direction };
  const reading = { original: fingerprints.original, language, comments,
    stanzaPattern: metadata.stanzaPattern, stanzaLineExceptions: metadata.stanzaLineExceptions };
  // Passes depend on the evidence they actually review. Adding an occasion or
  // changing a publication flag must not discard an accepted source reading.
  const taskFingerprints = {
    source: sha256(canonicalJSON(reading)),
    roman: sha256(canonicalJSON({ ...reading, roman: fingerprints.roman })),
    alignment: sha256(canonicalJSON({ ...reading, roman: fingerprints.roman })),
    duplicates: sha256(canonicalJSON({ ...reading, roman: fingerprints.roman,
      title: metadata.title, alternateTitle: metadata.alternateTitle })),
    metadata: sha256(canonicalJSON({ metadata: reviewMetadata, comments })),
    publication: fingerprint,
  };
  return {
    path, raw, rawHash: sha256(bytes), metadata, original, roman, permanentId,
    fingerprint, fingerprints, taskFingerprints, findings, published: metadata.published !== false,
    title: text(metadata.title) || path.split('/').at(-1),
    alternateTitle: text(metadata.alternateTitle), language: text(metadata.language),
    query: searchText([metadata.title, metadata.alternateTitle, metadata.poet,
      metadata.reciter, metadata.kalamType, path, permanentId, original, roman].flat().filter(Boolean).join(' ')),
  };
}

/** A duplicate work ID never collapses two candidate records or their decisions.
 * A move is inherited only if permanent identity or an exact content fingerprint
 * gives one unambiguous missing predecessor. Uncertain moves stay separate. */
export function reconcileCandidates(records, previous = {}) {
  const candidates = structuredClone(previous);
  const used = new Set();
  const currentByPath = new Map(records.map(record => [record.path, record]));
  const idCounts = new Map();
  const priorByPath = new Map(), missingByIdentity = new Map(), missingByContent = new Map();
  const append = (map, key, candidate) => map.set(key, [...(map.get(key) || []), candidate]);
  for (const candidate of Object.values(previous)) {
    append(priorByPath, candidate.lastPath, candidate);
    // A former path may now belong to a different permanent work. That is a
    // missing predecessor too, so a two-file name swap retains both identities.
    const occupant = currentByPath.get(candidate.lastPath);
    if (!occupant || occupant.permanentId !== candidate.permanentId) {
      append(missingByIdentity, candidate.permanentId, candidate);
      append(missingByContent, (candidate.permanentId || '') + '\0' + candidate.fingerprint, candidate);
    }
  }
  for (const record of records) if (record.permanentId)
    idCounts.set(record.permanentId, (idCounts.get(record.permanentId) || 0) + 1);
  for (const record of records) {
    const sameIdentity = candidate => candidate.permanentId === record.permanentId;
    let matches = (priorByPath.get(record.path) || []).filter(candidate => !used.has(candidate.id) && sameIdentity(candidate));
    const activeMatches = matches.filter(candidate => !candidate.missing);
    if (activeMatches.length) matches = activeMatches;
    let ambiguousMove = false;
    if (matches.length !== 1) {
      const missing = (missingByIdentity.get(record.permanentId) || []).filter(candidate => !used.has(candidate.id));
      if (record.permanentId && idCounts.get(record.permanentId) === 1 && missing.length === 1)
        matches = missing;
      else {
        matches = (missingByContent.get((record.permanentId || '') + '\0' + record.fingerprint) || [])
          .filter(candidate => !used.has(candidate.id));
        ambiguousMove = matches.length > 1;
      }
    }
    const prior = matches.length === 1 ? matches[0] : null;
    const id = prior?.id || randomUUID();
    used.add(id);
    const workId = record.permanentId ? 'lyric:' + record.permanentId : prior?.workId || 'candidate:' + id;
    const aliases = [...new Set([...(prior?.paths || []), record.path])];
    candidates[id] = {
      id, workId, permanentId: record.permanentId, lastPath: record.path,
      paths: aliases, fingerprint: record.fingerprint, missing: false,
    };
    Object.assign(record, { candidateId: id, workId, previousPaths: aliases.filter(path => path !== record.path) });
    if (record.permanentId && idCounts.get(record.permanentId) > 1)
      record.findings.push({ code: 'duplicate-identity', detail: 'Multiple current files claim this permanent ID; their reviews stay separate', severity: 'error' });
    if (ambiguousMove)
      record.findings.push({ code: 'ambiguous-move', detail: 'Several missing candidates have identical content; no previous decision was inherited', severity: 'warning' });
  }
  for (const candidate of Object.values(candidates)) if (!used.has(candidate.id)) candidate.missing = true;
  return candidates;
}

export function jobKey(record, task, rulesVersion) {
  return sha256(canonicalJSON({ candidateId: record.candidateId, workId: record.workId,
    fingerprint: record.taskFingerprints[task], task, rulesVersion }));
}
export function applicableTasks(record) {
  return TASKS.filter(task => record.language !== 'English' || !['roman', 'alignment'].includes(task.id));
}

export function indexDecisions(decisions) {
  const index = new Map();
  for (const decision of decisions) index.set(decision.candidateId + ':' + decision.task, decision);
  return index;
}

export function decisionState(record, decisions, rulesVersion, byId) {
  const index = decisions instanceof Map ? decisions : indexDecisions(decisions);
  const states = Object.fromEntries(applicableTasks(record).map(task => {
    const decision = index.get(record.candidateId + ':' + task.id);
    if (!decision) return [task.id, { status: 'unreviewed' }];
    const reasons = [];
    if (decision.workId !== record.workId) reasons.push('Work identity changed');
    if (decision.taskFingerprint !== record.taskFingerprints[task.id]) reasons.push('Evidence for this pass changed');
    if (decision.rulesVersion !== rulesVersion) reasons.push('Editorial rules changed');
    if (decision.status === 'accepted' && record.findings.some(item =>
      ['invalid-encoding', 'invalid-frontmatter', 'identity-conflict', 'duplicate-identity', 'invalid-identity'].includes(item.code)))
      reasons.push('Source or identity conflict requires resolution');
    for (const comparison of decision.comparisons || []) {
      if (byId.get(comparison.candidateId)?.taskFingerprints[task.id] !== comparison.taskFingerprint)
        reasons.push('A comparison candidate changed or was removed');
    }
    return [task.id, { status: reasons.length ? 'stale' : decision.status, reasons, decision }];
  }));
  const publication = states.publication;
  if (publication?.decision?.status === 'accepted') {
    const requirements = publication.decision.prerequisites || [];
    if (Object.entries(states).some(([task, pass]) => task !== 'publication' &&
      (pass.status !== 'accepted' || !requirements.some(item => item.task === task && item.decisionId === pass.decision?.id)))) {
      publication.status = 'stale';
      publication.reasons.push('An editorial acceptance changed or needs rechecking');
    }
  }
  return states;
}

export function sourceDetail(record) {
  const originalBlocks = splitLyricStanzas(record.original);
  const romanBlocks = splitLyricStanzas(record.roman);
  return { original: record.original, roman: record.roman, raw: record.raw,
    metadata: record.metadata, fingerprints: record.fingerprints, taskFingerprints: record.taskFingerprints,
    blocks: Array.from({ length: Math.max(originalBlocks.length, romanBlocks.length) }, (_, index) => ({
      original: originalBlocks[index] || [], roman: romanBlocks[index] || [],
    })) };
}
