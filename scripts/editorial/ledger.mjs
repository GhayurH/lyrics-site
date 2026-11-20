// Private human-decision ledger. A failed or stale write never overwrites the
// previous valid file; the corpus and historical review trackers are untouched.
import { constants } from 'node:fs';
import { open, mkdir, lstat, rename, unlink, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Enough room for multiple complete reviews of the current corpus. Writes are
// bounded before replacement; reaching the limit cannot create an unreadable
// next ledger or silently discard historical decisions.
const MAX_LEDGER_BYTES = 256 * 1024 * 1024;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const sourcePath = value => typeof value === 'string' && /^src\/data\/lyrics\/[^/]+\.md$/u.test(value);
const tasks = new Set(['duplicates', 'source', 'roman', 'alignment', 'metadata', 'publication']);
const statuses = new Set(['accepted', 'needs_work', 'deferred', 'unreviewed']);
function validState(value, repository) {
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      value.repository !== repository || !value.candidates || typeof value.candidates !== 'object' ||
      Array.isArray(value.candidates) || !Array.isArray(value.decisions)) return false;
  if (!Object.entries(value.candidates).every(([id, candidate]) => candidate && uuid(id) && candidate.id === id &&
      typeof candidate.workId === 'string' && (candidate.permanentId === null || typeof candidate.permanentId === 'string') &&
      sourcePath(candidate.lastPath) && hash(candidate.fingerprint) && typeof candidate.missing === 'boolean' &&
      Array.isArray(candidate.paths) && candidate.paths.every(sourcePath))) return false;
  return value.decisions.every(event => event && uuid(event.id) && uuid(event.candidateId) &&
    typeof event.workId === 'string' && sourcePath(event.pathAtReview) &&
    hash(event.fingerprint) && hash(event.taskFingerprint) && hash(event.rawHash) &&
    hash(event.rulesVersion) && hash(event.jobKey) && tasks.has(event.task) && statuses.has(event.status) &&
    typeof event.notes === 'string' && event.notes.length >= 6 && event.notes.length <= 8000 &&
    typeof event.at === 'string' && Number.isFinite(Date.parse(event.at)) && event.actor === 'local-human' &&
    Number.isSafeInteger(event.revision) && event.revision > 0 && event.revision <= value.revision &&
    Array.isArray(event.comparisons) && event.comparisons.length <= 8 && event.comparisons.every(reference =>
      reference && uuid(reference.candidateId) && hash(reference.fingerprint) && hash(reference.taskFingerprint)) &&
    Array.isArray(event.prerequisites) && event.prerequisites.every(reference =>
      reference && tasks.has(reference.task) && uuid(reference.decisionId)));
}

export class EditorialError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message); this.status = status; this.code = code;
  }
}

export class EditorialLedger {
  constructor(directory, repository) {
    this.directory = directory;
    this.repository = repository;
    this.file = join(directory, 'ledger.json');
  }
  async prepare() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new EditorialError('The editorial state directory must be a real directory', 500, 'unsafe_state');
    await chmod(this.directory, 0o700);
  }
  empty() {
    return { version: 1, revision: 0, repository: this.repository, candidates: {}, decisions: [] };
  }
  async read() {
    let handle;
    try {
      handle = await open(this.file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_LEDGER_BYTES) throw Error('Invalid ledger size or type');
      const value = JSON.parse(await handle.readFile('utf8'));
      if (!validState(value, this.repository))
        throw Error('Unsupported or mismatched ledger');
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return this.empty();
      throw new EditorialError('The editorial ledger could not be read; preserve it and restore a valid export before continuing: ' + error.message,
        500, 'invalid_ledger');
    } finally { await handle?.close(); }
  }
  async update(expectedRevision, change) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
      throw new EditorialError('A current ledger revision is required');
    await this.prepare();
    const lockPath = join(this.directory, 'ledger.lock');
    let lock, temporary;
    try {
      try { lock = await open(lockPath, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST') throw new EditorialError(
          'Another editorial write is in progress. Refresh and retry; if a previous process crashed, inspect ledger.lock before removing it.',
          409, 'ledger_busy');
        throw error;
      }
      await lock.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      const current = await this.read();
      if (current.revision !== expectedRevision)
        throw new EditorialError('The review ledger changed in another tab or process. Refresh before saving this decision.', 409, 'ledger_conflict');
      const next = await change(structuredClone(current));
      next.version = 1; next.repository = this.repository;
      next.revision = current.revision + 1;
      next.updatedAt = new Date().toISOString();
      if (!validState(next, this.repository)) throw new EditorialError('The new review state is invalid; the previous ledger was preserved', 500, 'invalid_ledger');
      const serialized = JSON.stringify(next, null, 2) + '\n';
      if (Buffer.byteLength(serialized) > MAX_LEDGER_BYTES)
        throw new EditorialError('The review ledger reached its 256 MiB limit. Export and preserve the history before extending its storage capacity.', 507, 'ledger_capacity');
      temporary = join(this.directory, '.ledger-' + randomUUID() + '.tmp');
      const handle = await open(temporary, 'wx', 0o600);
      try { await handle.writeFile(serialized); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporary, this.file);
      temporary = null;
      const directory = await open(this.directory, 'r');
      try { await directory.sync(); } finally { await directory.close(); }
      return next;
    } finally {
      if (temporary) await unlink(temporary).catch(() => {});
      if (lock) { await lock.close(); await unlink(lockPath); }
    }
  }
}
