// Git-backed corpus access and review orchestration. Only the independent local
// ledger is writable; applying a review never edits or publishes a poem.
import { constants } from 'node:fs';
import { open, readdir, realpath, lstat } from 'node:fs/promises';
import { join, resolve, relative, sep, dirname, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { EditorialLedger, EditorialError } from './ledger.mjs';
import { TASKS, STATUSES, sha256, canonicalJSON, parseEditorialRecord, reconcileCandidates,
  decisionState, indexDecisions, jobKey, applicableTasks, sourceDetail, searchText } from './model.mjs';

const execute = promisify(execFile);
const candidatePattern = /^[a-f0-9-]{36}$/u;
const SOURCE_PREFIX = 'src/data/lyrics/';
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const inside = (directory, file) => file === directory || file.startsWith(directory + sep);

async function resolvedFuturePath(file) {
  // Resolve existing ancestors before creating anything: an innocently named
  // state path must not write through a parent symlink into source or public.
  try { return await realpath(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = dirname(file);
    if (parent === file) throw error;
    return join(await resolvedFuturePath(parent), basename(file));
  }
}

async function safeRead(file) {
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES)
      throw Error('Source is not a regular file within the 2 MiB review limit');
    return await handle.readFile();
  } finally { await handle.close(); }
}

export class EditorialWorkspace {
  constructor({ root, stateDir }) {
    this.root = resolve(root); this.stateDir = resolve(stateDir);
    this.records = []; this.byId = new Map(); this.parsed = new Map();
    this.decisionIndexes = new WeakMap();
  }
  async initialize() {
    this.root = await realpath(this.root);
    const gitRoot = (await execute('git', ['-C', this.root, 'rev-parse', '--show-toplevel'])).stdout.trim();
    if (await realpath(gitRoot) !== this.root)
      throw new EditorialError('Select the Git repository root, not a source subdirectory', 400, 'invalid_repository');
    if (inside(this.root, this.stateDir) || inside(this.root, await resolvedFuturePath(this.stateDir)))
      throw new EditorialError('Editorial state must be outside the Git checkout, including through directory links', 400, 'unsafe_state');
    this.sourceDirectory = join(this.root, 'src/data/lyrics');
    const directory = await lstat(this.sourceDirectory);
    if (!directory.isDirectory() || directory.isSymbolicLink() ||
        !(await realpath(this.sourceDirectory)).startsWith(this.root + sep))
      throw new EditorialError('The lyric source directory must be inside this checkout', 400, 'unsafe_source');
    this.store = new EditorialLedger(this.stateDir, this.root);
    await this.store.prepare();
    await this.refresh();
    return this;
  }
  async readRules() {
    const content = (await this.readRepositoryFile('docs/EDITORIAL.md')).toString('utf8');
    return { content, version: sha256('editorial-workspace/2\0' + content) };
  }
  async readRepositoryFile(path) {
    const file = join(this.root, path);
    if (!inside(this.root, await realpath(dirname(file))))
      throw new EditorialError('Source directories must stay inside this checkout', 400, 'unsafe_source');
    return safeRead(file);
  }
  async readIdentityLock() {
    let bytes;
    try { bytes = await this.readRepositoryFile('src/data/recitation/identity-lock.json'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      bytes = Buffer.from('{"lyrics":[]}');
    }
    let value;
    try { value = JSON.parse(bytes.toString('utf8')); }
    catch (error) { throw new EditorialError('Cannot read the permanent identity lock: ' + error.message, 500, 'invalid_identity_lock'); }
    return { hash: sha256(bytes), value };
  }
  async assertIdentityContext() {
    if ((await this.readIdentityLock()).hash !== this.identityLockHash)
      throw new EditorialError('The permanent identity lock changed. Refresh the corpus before continuing.', 409, 'identity_context_conflict');
  }
  async refresh() {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.scan();
    try { return await this.refreshing; } finally { this.refreshing = null; }
  }
  async scan() {
    const previous = await this.store.read();
    const rules = await this.readRules();
    const identity = await this.readIdentityLock(), identityLock = identity.value;
    if (!identityLock || !Array.isArray(identityLock.lyrics))
      throw new EditorialError('The permanent identity lock must contain a lyrics list', 500, 'invalid_identity_lock');
    const locked = new Map();
    for (const item of identityLock.lyrics || []) {
      if (!item || typeof item.path !== 'string' || !/^[^/\\]+\.md$/u.test(item.path) ||
          typeof item.id !== 'string' || !/^[\p{L}\p{N}_/-]{1,160}$/u.test(item.id) || locked.has(item.path))
        throw new EditorialError('The permanent identity lock contains invalid or duplicate paths', 500, 'invalid_identity_lock');
      locked.set(item.path, item.id);
    }
    if (!inside(this.root, await realpath(this.sourceDirectory)))
      throw new EditorialError('The lyric source directory moved outside this checkout', 400, 'unsafe_source');
    const files = (await readdir(this.sourceDirectory, { withFileTypes: true }))
      .filter(entry => entry.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const records = [], errors = [];
    // Bound open handles; repeated refreshes reuse parsed records when bytes and
    // their locked identity are unchanged, but always inspect current file bytes.
    for (let offset = 0; offset < files.length; offset += 32) {
      const batch = await Promise.all(files.slice(offset, offset + 32).map(async entry => {
        const path = SOURCE_PREFIX + entry.name;
        try {
          if (!entry.isFile() || entry.isSymbolicLink()) throw Error('Symbolic links and non-regular sources are not reviewed');
          const bytes = await safeRead(join(this.sourceDirectory, entry.name));
          const key = sha256(bytes) + '\0' + (locked.get(entry.name) || '');
          const cached = this.parsed.get(path);
          const record = cached?.key === key ? structuredClone(cached.record) : parseEditorialRecord(path, bytes, locked.get(entry.name));
          this.parsed.set(path, { key, record: structuredClone(record) });
          return record;
        } catch (error) { errors.push({ path, message: error.message }); return null; }
      }));
      records.push(...batch.filter(Boolean));
    }
    const candidates = reconcileCandidates(records, previous.candidates);
    if (canonicalJSON(candidates) !== canonicalJSON(previous.candidates))
      await this.store.update(previous.revision, ledger => ({ ...ledger, candidates }));
    this.records = records; this.byId = new Map(records.map(record => [record.candidateId, record]));
    this.rules = rules; this.identityLockHash = identity.hash;
    this.readErrors = errors; this.refreshedAt = new Date().toISOString();
    try {
      const info = await execute('git', ['-C', this.root, 'log', '-1', '--format=%h %s'], { maxBuffer: 8192 });
      this.gitHead = info.stdout.trim();
    } catch (error) {
      if (error.code !== 128) throw error;
      this.gitHead = 'Checkout has no commit';
    }
    return this.session();
  }
  async assertRules(expected) {
    const current = await this.readRules();
    if (current.version !== this.rules.version || (expected && expected !== current.version))
      throw new EditorialError('Editorial rules changed. Refresh the corpus and review this pass under the current rules.', 409, 'rules_conflict');
  }
  async currentRecord(id, expectedHash) {
    if (typeof id !== 'string' || !candidatePattern.test(id)) throw new EditorialError('Invalid candidate ID');
    const record = this.byId.get(id);
    if (!record) throw new EditorialError('This candidate is not in the current corpus. Refresh the inventory.', 404, 'missing_candidate');
    const file = resolve(this.root, record.path);
    if (relative(this.sourceDirectory, file).includes(sep) || !file.startsWith(this.sourceDirectory + sep))
      throw new EditorialError('Invalid source path', 400, 'unsafe_source');
    let hash;
    try { hash = sha256(await this.readRepositoryFile(record.path)); }
    catch { throw new EditorialError('This source moved or cannot be read. Refresh the inventory.', 409, 'source_conflict'); }
    if (hash !== record.rawHash || (expectedHash && expectedHash !== hash))
      throw new EditorialError('The source changed after it was opened. Refresh and inspect the new text before deciding.', 409, 'source_conflict');
    return record;
  }
  states(record, ledger) {
    let cached = this.decisionIndexes.get(ledger);
    if (!cached || cached.length !== ledger.decisions.length) {
      cached = { length: ledger.decisions.length, index: indexDecisions(ledger.decisions) };
      this.decisionIndexes.set(ledger, cached);
    }
    return decisionState(record, cached.index, this.rules.version, this.byId);
  }
  summary(record, ledger) {
    const passes = this.states(record, ledger);
    const states = Object.values(passes).map(pass => pass.status);
    const overall = states.includes('needs_work') ? 'needs_work' : states.includes('stale') ? 'stale' :
      states.every(status => status === 'accepted') ? 'accepted' : states.includes('deferred') ? 'deferred' : 'unreviewed';
    return {
      candidateId: record.candidateId, workId: record.workId, permanentId: record.permanentId,
      path: record.path, previousPaths: record.previousPaths, title: record.title,
      alternateTitle: record.alternateTitle, language: record.language, published: record.published,
      rawHash: record.rawHash, fingerprint: record.fingerprint, overall,
      findings: record.findings, passes,
    };
  }
  async session() {
    const ledger = await this.store.read();
    const languages = [...new Set(this.records.map(record => record.language).filter(Boolean))].sort();
    const count = predicate => this.records.filter(predicate).length;
    return {
      repository: this.root, gitHead: this.gitHead, revision: ledger.revision,
      rulesVersion: this.rules.version, refreshedAt: this.refreshedAt,
      stateFile: this.store.file, tasks: TASKS, languages, readErrors: this.readErrors,
      counts: {
        total: this.records.length, published: count(record => record.published),
        unpublished: count(record => !record.published),
        identity: count(record => record.findings.some(item => /identity|ambiguous-move/u.test(item.code))),
        validation: count(record => record.findings.some(item => item.severity === 'error')),
        metadata: count(record => record.findings.some(item => /title|poet|occasion|language|direction/u.test(item.code))),
        missingRoman: count(record => record.findings.some(item => item.code === 'missing-roman')),
        decisions: ledger.decisions.length,
      },
      coverage: Object.fromEntries(['poet', 'reciter', 'occasion', 'alternateTitle'].map(key => [key,
        count(record => Array.isArray(record.metadata[key]) ? record.metadata[key].length > 0 :
          typeof record.metadata[key] === 'string' && Boolean(record.metadata[key].trim()))])),
    };
  }
  async inventory({ q = '', queue = 'all', language = '', publication = 'all', offset = 0, limit = 60 } = {}) {
    const ledger = await this.store.read();
    const query = searchText(q);
    const matches = this.records.filter(record => {
      if (query && !record.query.includes(query)) return false;
      if (language && record.language !== language) return false;
      if (publication === 'published' && !record.published || publication === 'unpublished' && record.published) return false;
      if (queue === 'identity') return record.findings.some(item => /identity|ambiguous-move/u.test(item.code));
      if (queue === 'metadata') return record.findings.some(item => /title|poet|occasion|language|direction/u.test(item.code));
      if (queue === 'validation') return record.findings.some(item => item.severity === 'error');
      if (queue === 'missing-roman') return record.findings.some(item => item.code === 'missing-roman');
      if (queue !== 'all') return Object.values(this.states(record, ledger)).some(pass => pass.status === queue);
      return true;
    });
    return { revision: ledger.revision, total: matches.length, offset, limit,
      items: matches.slice(offset, offset + limit).map(record => this.summary(record, ledger)) };
  }
  async detail(id) {
    const record = await this.currentRecord(id);
    await this.assertRules();
    await this.assertIdentityContext();
    const ledger = await this.store.read();
    return { revision: ledger.revision, rulesVersion: this.rules.version,
      ...this.summary(record, ledger), ...sourceDetail(record),
      history: ledger.decisions.filter(item => item.candidateId === record.candidateId).slice(-40).reverse(),
    };
  }
  async exportQueue() {
    const ledger = await this.store.read();
    return {
      version: 1, kind: 'human-editorial-queue', repository: this.root,
      gitHead: this.gitHead, revision: ledger.revision, rulesVersion: this.rules.version,
      refreshedAt: this.refreshedAt, exportedAt: new Date().toISOString(),
      readErrors: this.readErrors,
      candidates: this.records.map(record => ({ candidateId: record.candidateId,
        workId: record.workId, path: record.path, title: record.title, language: record.language,
        published: record.published, fingerprint: record.fingerprint, findings: record.findings,
        tasks: Object.entries(this.states(record, ledger)).map(([task, pass]) => ({
          task, status: pass.status, reasons: pass.reasons || [],
          taskFingerprint: record.taskFingerprints[task],
          jobKey: jobKey(record, task, this.rules.version),
          lastDecisionId: pass.decision?.id || null,
        })),
      })),
    };
  }
  async decide(input) {
    if (!input || typeof input !== 'object' || !TASKS.some(task => task.id === input.task) || !STATUSES.has(input.status))
      throw new EditorialError('Choose a valid review pass and decision');
    if (typeof input.notes !== 'string' || input.notes.trim().length < 6 || input.notes.length > 8000)
      throw new EditorialError('Record a concrete review note (6–8,000 characters)');
    if (!/^[a-f0-9]{64}$/u.test(input.expectedContentHash || '') || !/^[a-f0-9]{64}$/u.test(input.rulesVersion || ''))
      throw new EditorialError('The opened source hash and editorial rules version are required');
    await this.assertRules(input.rulesVersion);
    await this.assertIdentityContext();
    let record = await this.currentRecord(input.candidateId, input.expectedContentHash);
    if (!applicableTasks(record).some(task => task.id === input.task))
      throw new EditorialError('This pass does not apply to an English original');
    const comparisons = input.comparisons || [];
    if (!Array.isArray(comparisons) || comparisons.length > 8) throw new EditorialError('At most eight comparison candidates may be recorded');
    const seen = new Set();
    for (const reference of comparisons) {
      if (!reference || reference.candidateId === record.candidateId || seen.has(reference.candidateId))
        throw new EditorialError('Comparison candidates must be distinct from this work and each other');
      const comparison = await this.currentRecord(reference.candidateId);
      if (comparison.fingerprint !== reference.fingerprint)
        throw new EditorialError('A comparison source changed. Reopen it before saving.', 409, 'comparison_conflict');
      seen.add(reference.candidateId);
    }
    const updated = await this.store.update(input.expectedRevision, async ledger => {
      // Recheck once the write lock is held. A successful save identifies this
      // exact inspected snapshot, even if an external editor changes it later.
      await this.assertRules(input.rulesVersion);
      await this.assertIdentityContext();
      record = await this.currentRecord(record.candidateId, input.expectedContentHash);
      for (const reference of comparisons) await this.currentRecord(reference.candidateId);
      if (input.status === 'accepted' && record.findings.some(item =>
        ['invalid-encoding', 'invalid-frontmatter', 'identity-conflict', 'duplicate-identity', 'invalid-identity'].includes(item.code)))
        throw new EditorialError('Resolve the malformed source or permanent identity conflict before accepting a pass. You can record Needs work.', 422, 'acceptance_blocked');
      let prerequisites = [];
      if (input.task === 'publication' && input.status === 'accepted') {
        const passes = this.states(record, ledger);
        if (!record.permanentId || record.findings.some(item => item.severity === 'error') ||
            Object.entries(passes).some(([task, value]) => task !== 'publication' && value.status !== 'accepted'))
          throw new EditorialError('Publication acceptance requires a permanent identity, resolved structural errors and current acceptance of every applicable editorial pass.', 422, 'acceptance_blocked');
        prerequisites = Object.entries(passes).filter(([task]) => task !== 'publication')
          .map(([task, pass]) => ({ task, decisionId: pass.decision.id }));
      }
      ledger.decisions.push({
        id: randomUUID(), candidateId: record.candidateId, workId: record.workId,
        pathAtReview: record.path, fingerprint: record.fingerprint, rawHash: record.rawHash,
        fingerprints: record.fingerprints, taskFingerprint: record.taskFingerprints[input.task],
        task: input.task, rulesVersion: this.rules.version, prerequisites,
        jobKey: jobKey(record, input.task, this.rules.version), status: input.status,
        notes: input.notes.trim(), comparisons: comparisons.map(item => ({ candidateId: item.candidateId,
          fingerprint: item.fingerprint, taskFingerprint: this.byId.get(item.candidateId).taskFingerprints[input.task] })),
        at: new Date().toISOString(), revision: ledger.revision + 1,
        actor: 'local-human',
      });
      return ledger;
    });
    // Do not report an unsuccessful save if an editor changes the source after
    // atomic persistence. Return the saved snapshot; the next refresh invalidates
    // dependent passes without losing this decision or its notes.
    return { revision: updated.revision, source: { revision: updated.revision,
      rulesVersion: this.rules.version, ...this.summary(record, updated), ...sourceDetail(record),
      history: updated.decisions.filter(item => item.candidateId === record.candidateId).slice(-40).reverse(),
    } };
  }
}
