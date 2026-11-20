import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rename, unlink, symlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { fixture, poem, detailFor, decision } from './editorial/helpers.mjs';
import { createEditorialHandler } from '../scripts/editorial/server.mjs';
import { EditorialWorkspace } from '../scripts/editorial/workspace.mjs';
import { EditorialLedger } from '../scripts/editorial/ledger.mjs';
import { jobKey, parseEditorialRecord, reconcileCandidates } from '../scripts/editorial/model.mjs';

test('inventory separates source publication, human decisions, exact editions and metadata queues', async t => {
  const f = await fixture(t, { 'first.md': poem(), 'english.md': poem({ title: 'An English original',
    alternateTitle: undefined, recitationId: 'work-english', language: 'English', lang: 'en', direction: 'ltr',
    romanLyrics: undefined, poet: undefined, published: true }, 'An original English line\n') });
  const workspace = await f.workspace();
  const session = await workspace.session();
  assert.deepEqual({ total: session.counts.total, published: session.counts.published,
    unpublished: session.counts.unpublished, decisions: session.counts.decisions },
  { total: 2, published: 1, unpublished: 1, decisions: 0 });
  assert.equal((await workspace.inventory({ publication: 'unpublished' })).total, 1);
  assert.equal((await workspace.inventory({ q: 'PEHLA KALAM' })).total, 1);
  assert.equal((await workspace.inventory({ queue: 'metadata' })).total, 1);
  const detail = await detailFor(workspace);
  assert.equal(detail.original, 'پہلا مصرع\nدوسرا مصرع\n');
  assert.equal(detail.roman, 'Pehla misra\nDoosra misra');
  assert.equal(detail.raw, await readFile(join(f.lyrics, 'first.md'), 'utf8'));
  assert.equal(detail.passes.source.status, 'unreviewed');
  const english = await detailFor(workspace, 'work-english');
  assert.equal(english.passes.roman, undefined);
  assert.equal(english.passes.alignment, undefined);
  await assert.rejects(workspace.decide(decision(english, 'roman')), /does not apply/u);
});

test('a permanent-ID rename retains identity, accepted evidence and job key', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  let detail = await detailFor(workspace);
  const record = workspace.byId.get(detail.candidateId);
  const originalKey = jobKey(record, 'source', detail.rulesVersion);
  detail = (await workspace.decide(decision(detail))).source;
  await rename(join(f.lyrics, 'pehla-kalam.md'), join(f.lyrics, 'reviewed-title.md'));
  await workspace.refresh();
  const moved = await detailFor(workspace);
  assert.equal(moved.candidateId, detail.candidateId);
  assert.equal(moved.passes.source.status, 'accepted');
  assert.equal(jobKey(workspace.byId.get(moved.candidateId), 'source', moved.rulesVersion), originalKey);
  assert.deepEqual(moved.previousPaths, ['src/data/lyrics/pehla-kalam.md']);
  assert.equal(moved.history[0].pathAtReview, 'src/data/lyrics/pehla-kalam.md');
});

test('each pass invalidates only when its own content evidence changes', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  let detail = await detailFor(workspace);
  for (const task of ['source', 'roman', 'alignment', 'metadata', 'duplicates'])
    detail = (await workspace.decide(decision(detail, task))).source;
  await writeFile(join(f.lyrics, 'pehla-kalam.md'), poem({ occasion: 'Arbaeen' }));
  await workspace.refresh(); detail = await detailFor(workspace);
  for (const task of ['source', 'roman', 'alignment', 'duplicates']) assert.equal(detail.passes[task].status, 'accepted', task);
  assert.equal(detail.passes.metadata.status, 'stale');
  detail = (await workspace.decide(decision(detail, 'metadata'))).source;
  await writeFile(join(f.lyrics, 'pehla-kalam.md'), poem({ occasion: 'Arbaeen', published: true }));
  await workspace.refresh(); detail = await detailFor(workspace);
  for (const task of ['source', 'roman', 'alignment', 'metadata', 'duplicates']) assert.equal(detail.passes[task].status, 'accepted', task);
  await writeFile(join(f.lyrics, 'pehla-kalam.md'), poem({ occasion: 'Arbaeen', published: true, romanLyrics: 'Badla misra\nDoosra misra' }));
  await workspace.refresh(); detail = await detailFor(workspace);
  assert.equal(detail.passes.source.status, 'accepted');
  assert.equal(detail.passes.metadata.status, 'accepted');
  assert.equal(detail.passes.roman.status, 'stale');
  assert.equal(detail.passes.alignment.status, 'stale');
  assert.equal(detail.passes.duplicates.status, 'stale');
  assert.equal(detail.history.length, 6);
});

test('changed source bytes, rules and ledger revisions reject stale submissions without losing notes', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const opened = await detailFor(workspace);
  const accepted = await workspace.decide(decision(opened));
  await assert.rejects(workspace.decide(decision(opened, 'metadata')), error => error.code === 'ledger_conflict' && error.status === 409);
  await writeFile(join(f.lyrics, 'pehla-kalam.md'), poem({}, 'بدلا مصرع\nدوسرا مصرع\n'));
  await assert.rejects(workspace.decide(decision(accepted.source, 'metadata')), error => error.code === 'source_conflict');
  await workspace.refresh();
  const changed = await detailFor(workspace);
  assert.equal(changed.passes.source.status, 'stale');
  assert.equal(changed.history[0].notes, opened.history[0]?.notes || 'I inspected the exact source and recorded this decision.');
  await writeFile(join(f.root, 'docs/EDITORIAL.md'), '# Updated editorial rules\nInspect the stanza boundaries.\n');
  await assert.rejects(workspace.decide(decision(changed)), error => error.code === 'rules_conflict');
  await workspace.refresh();
  const refreshed = await detailFor(workspace);
  assert.ok(refreshed.passes.source.reasons.includes('Editorial rules changed'));
  assert.equal((await workspace.store.read()).decisions.length, 1);
});

test('duplicate IDs stay separate, block acceptance and invalidate previously accepted identity claims', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const first = (await workspace.decide(decision(await detailFor(workspace)))).source;
  await writeFile(join(f.lyrics, 'duplicate.md'), poem());
  await workspace.refresh();
  const candidates = (await workspace.inventory({ queue: 'identity' })).items;
  assert.equal(candidates.length, 2);
  assert.equal(new Set(candidates.map(item => item.candidateId)).size, 2);
  const original = candidates.find(item => item.candidateId === first.candidateId);
  const duplicate = candidates.find(item => item.candidateId !== first.candidateId);
  assert.equal(original.passes.source.status, 'stale');
  assert.equal(duplicate.passes.source.status, 'unreviewed');
  const opened = await workspace.detail(duplicate.candidateId);
  await assert.rejects(workspace.decide(decision(opened)), error => error.code === 'acceptance_blocked');
  const recorded = await workspace.decide(decision(opened, 'duplicates', 'needs_work', { notes: 'This identity collision needs a human comparison; do not merge.' }));
  assert.equal(recorded.source.passes.duplicates.status, 'needs_work');
});

test('an identity-lock edit after opening a source requires refresh before a decision', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const opened = await detailFor(workspace);
  await writeFile(join(f.root, 'src/data/recitation/identity-lock.json'),
    JSON.stringify({ lyrics: [{ path: 'pehla-kalam.md', id: 'different-work' }] }));
  await assert.rejects(workspace.decide(decision(opened)), error => error.code === 'identity_context_conflict');
  await workspace.refresh();
  const current = await detailFor(workspace);
  assert.ok(current.findings.some(item => item.code === 'identity-conflict'));
  await assert.rejects(workspace.decide(decision(current)), error => error.code === 'acceptance_blocked');
  assert.equal((await workspace.store.read()).decisions.length, 0);
});

test('ambiguous identical-file moves never inherit a local candidate approval', () => {
  const bytes = Buffer.from(poem({ recitationId: undefined }));
  const prior = [parseEditorialRecord('src/data/lyrics/a.md', bytes), parseEditorialRecord('src/data/lyrics/b.md', bytes)];
  const oldRegistry = reconcileCandidates(prior);
  const moved = [parseEditorialRecord('src/data/lyrics/c.md', bytes)];
  const next = reconcileCandidates(moved, oldRegistry);
  assert.ok(!prior.some(record => record.candidateId === moved[0].candidateId));
  assert.ok(moved[0].findings.some(item => item.code === 'ambiguous-move'));
  assert.equal(Object.values(next).filter(item => item.missing).length, 2);
  const unique = [parseEditorialRecord('src/data/lyrics/d.md', bytes)];
  const singlePrior = reconcileCandidates([parseEditorialRecord('src/data/lyrics/only.md', bytes)]);
  reconcileCandidates(unique, singlePrior);
  assert.equal(unique[0].candidateId, Object.values(singlePrior)[0].id);
});

test('permanent identities survive a filename swap without assigning reviews to the other work', () => {
  const a = Buffer.from(poem()), b = Buffer.from(poem({ recitationId: 'work-two', title: 'دوسرا کلام' }));
  const before = [parseEditorialRecord('src/data/lyrics/a.md', a), parseEditorialRecord('src/data/lyrics/b.md', b)];
  const registry = reconcileCandidates(before);
  const after = [parseEditorialRecord('src/data/lyrics/a.md', b), parseEditorialRecord('src/data/lyrics/b.md', a)];
  const next = reconcileCandidates(after, registry);
  assert.equal(after[0].candidateId, before[1].candidateId);
  assert.equal(after[1].candidateId, before[0].candidateId);
  assert.equal(Object.values(next).filter(item => item.missing).length, 0);
});

test('a changed comparison invalidates the relevant decision; unrelated metadata does not', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const detail = await detailFor(workspace), comparison = await detailFor(workspace, 'work-two');
  await workspace.decide(decision(detail, 'duplicates', 'accepted', { comparisons: [
    { candidateId: comparison.candidateId, fingerprint: comparison.fingerprint },
  ] }));
  await writeFile(join(f.lyrics, 'doosra-kalam.md'), poem({ title: 'دوسرا کلام', alternateTitle: 'Doosra Kalam',
    recitationId: 'work-two', occasion: 'Another occasion' }, 'تیسرا مصرع\nچوتھا مصرع\n'));
  await workspace.refresh();
  assert.equal((await detailFor(workspace)).passes.duplicates.status, 'accepted');
  await unlink(join(f.lyrics, 'doosra-kalam.md'));
  await workspace.refresh();
  assert.equal((await detailFor(workspace)).passes.duplicates.status, 'stale');
});

test('publication acceptance needs every current pass and never changes source, trackers or published flags', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const original = await readFile(join(f.lyrics, 'pehla-kalam.md'));
  const tracker = await readFile(join(f.root, 'audit/round2-wip.json'));
  let detail = await detailFor(workspace);
  await assert.rejects(workspace.decide(decision(detail, 'publication')), error => error.code === 'acceptance_blocked');
  for (const task of ['source', 'roman', 'alignment', 'metadata', 'duplicates', 'publication'])
    detail = (await workspace.decide(decision(detail, task))).source;
  assert.equal(detail.passes.publication.status, 'accepted');
  assert.equal(detail.published, false);
  detail = (await workspace.decide(decision(detail, 'source', 'unreviewed', { notes: 'Reopen the source reading for another editorial check.' }))).source;
  assert.equal(detail.passes.publication.status, 'stale');
  detail = (await workspace.decide(decision(detail, 'source'))).source;
  assert.equal(detail.passes.publication.status, 'stale', 'renewed prerequisite does not silently renew publication acceptance');
  assert.deepEqual(await readFile(join(f.lyrics, 'pehla-kalam.md')), original);
  assert.deepEqual(await readFile(join(f.root, 'audit/round2-wip.json')), tracker);
  const queue = await workspace.exportQueue();
  assert.equal(queue.kind, 'human-editorial-queue');
  assert.equal(queue.candidates.find(item => item.workId === 'lyric:work-one').tasks.find(item => item.task === 'publication').status, 'stale');
  assert.match(queue.candidates[0].tasks[0].jobKey, /^[a-f0-9]{64}$/u);
});

test('ledger persists across restart, conflicts safely, and preserves the last valid file on failed changes', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  await workspace.decide(decision(await detailFor(workspace), 'source', 'needs_work', { notes: 'Check this reading directly before accepting it.' }));
  const restarted = await f.workspace();
  assert.equal((await detailFor(restarted)).passes.source.status, 'needs_work');
  const ledger = new EditorialLedger(f.stateDir, f.root), prior = await ledger.read();
  const exact = await readFile(ledger.file, 'utf8');
  await assert.rejects(ledger.update(prior.revision, () => { throw Error('simulated validation failure'); }), /simulated/u);
  assert.equal(await readFile(ledger.file, 'utf8'), exact);
  let release, entered;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  const writer = ledger.update(prior.revision, async value => { entered(); await wait; return value; });
  await enteredPromise;
  await assert.rejects(ledger.update(prior.revision, value => value), error => error.code === 'ledger_busy');
  release(); await writer;
  await assert.rejects(ledger.update(prior.revision, value => value), error => error.code === 'ledger_conflict');
  assert.equal((await stat(ledger.file)).mode & 0o777, 0o600);
  await writeFile(ledger.file, '{broken');
  await assert.rejects(ledger.read(), error => error.code === 'invalid_ledger');
  await assert.rejects(ledger.update(prior.revision + 1, value => value), error => error.code === 'invalid_ledger');
  assert.equal(await readFile(ledger.file, 'utf8'), '{broken');
});

test('source symlinks, arbitrary paths and state paths through the checkout are rejected', async t => {
  const f = await fixture(t);
  const secret = join(f.directory, 'private.txt');
  await writeFile(secret, 'DO NOT EXPOSE');
  await symlink(secret, join(f.lyrics, 'linked.md'));
  const workspace = await f.workspace();
  assert.equal((await workspace.session()).readErrors.length, 1);
  assert.equal((await workspace.inventory()).total, 2);
  await assert.rejects(workspace.detail('../../private.txt'), /Invalid candidate/u);
  await assert.rejects(new EditorialWorkspace({ root: f.root, stateDir: join(f.root, 'public/review') }).initialize(), error => error.code === 'unsafe_state');
  await symlink(join(f.root, 'src'), join(f.directory, 'source-link'));
  await assert.rejects(new EditorialWorkspace({ root: f.root, stateDir: join(f.directory, 'source-link/review') }).initialize(), error => error.code === 'unsafe_state');
  await assert.rejects(stat(join(f.root, 'src/review')), { code: 'ENOENT' });
});

test('malformed YAML, wrong publication types and conflicting lock IDs are surfaced without trusting acceptance', async t => {
  const f = await fixture(t, {
    'malformed.md': '---\ntitle: "one"\ntitle: "two"\n---\nAn inspectable body\n',
    'wrong-type.md': poem({ published: 'false' }),
    'invalid-encoding.md': Buffer.concat([Buffer.from(poem({ recitationId: 'invalid-encoding' })), Buffer.from([0xff])]),
  });
  await writeFile(join(f.root, 'src/data/recitation/identity-lock.json'), JSON.stringify({ lyrics: [{ path: 'wrong-type.md', id: 'another-identity' }] }));
  const workspace = await f.workspace();
  const inventory = await workspace.inventory({ queue: 'validation' });
  assert.equal(inventory.total, 3);
  const malformed = inventory.items.find(item => item.path.endsWith('malformed.md'));
  assert.ok(malformed.findings.some(item => item.code === 'invalid-frontmatter'));
  const wrong = await detailFor(workspace);
  assert.ok(wrong.findings.some(item => item.code === 'identity-conflict'));
  assert.ok(wrong.findings.some(item => item.code === 'invalid-published'));
  await assert.rejects(workspace.decide(decision(wrong)), error => error.code === 'acceptance_blocked');
  const encoding = await detailFor(workspace, 'invalid-encoding');
  assert.ok(encoding.findings.some(item => item.code === 'invalid-encoding'));
  await assert.rejects(workspace.decide(decision(encoding)), error => error.code === 'acceptance_blocked');
});

const origin = 'http://127.0.0.1:4319', csrfToken = 'a'.repeat(64);
async function request(handler, { method = 'GET', url = '/api/session', headers = {}, body, remoteAddress = '127.0.0.1' } = {}) {
  const bytes = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))];
  const incoming = Readable.from(bytes);
  Object.assign(incoming, { method, url, headers: { host: '127.0.0.1:4319', ...headers }, socket: { remoteAddress } });
  let result;
  const outgoing = { writeHead(status, values) { result = { status, headers: values }; }, end(value) { result.body = value?.toString(); } };
  await handler(incoming, outgoing);
  if (result.headers['Content-Type']?.startsWith('application/json')) result.data = JSON.parse(result.body);
  return result;
}

test('HTTP handler enforces loopback Host/Origin/CSRF and validates input without network permissions', async t => {
  const f = await fixture(t), workspace = await f.workspace();
  const handler = createEditorialHandler({ workspace, getOrigin: () => origin, csrfToken });
  const session = await request(handler);
  assert.equal(session.status, 200);
  assert.equal(session.data.csrfToken, csrfToken);
  assert.equal(session.headers['Cache-Control'], 'no-store');
  assert.match(session.headers['Content-Security-Policy'], /frame-ancestors 'none'/u);
  assert.equal((await request(handler, { headers: { host: 'attacker.example:4319' } })).status, 403);
  assert.equal((await request(handler, { remoteAddress: '192.0.2.1' })).status, 403);
  assert.equal((await request(handler, { headers: { origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await request(handler, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  const write = { method: 'POST', url: '/api/decisions', body: decision(await detailFor(workspace)),
    headers: { origin, 'content-type': 'application/json' } };
  assert.equal((await request(handler, write)).status, 403);
  assert.equal((await request(handler, { ...write, headers: { ...write.headers, 'x-editorial-csrf': 'é'.repeat(64) } })).status, 403);
  const validHeaders = { ...write.headers, 'x-editorial-csrf': csrfToken };
  assert.equal((await request(handler, { ...write, headers: validHeaders, body: '{invalid' })).status, 400);
  assert.equal((await request(handler, { ...write, headers: validHeaders, body: 'x'.repeat(70_000) })).status, 413);
  const saved = await request(handler, { ...write, headers: validHeaders });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.source.passes.source.status, 'accepted');
  assert.equal((await request(handler, { ...write, headers: validHeaders })).status, 409);
  assert.equal((await request(handler, { url: '/api/source?id=..%2F..%2Fprivate.txt' })).status, 400);
  assert.equal((await request(handler, { url: '/api/inventory?limit=9999' })).status, 400);
  assert.equal((await request(handler, { url: '/api/inventory?queue=unknown' })).status, 400);
  assert.equal((await request(handler, { url: '/private.txt' })).status, 404);
  assert.equal((await request(handler, { method: 'DELETE' })).status, 405);
  const exported = await request(handler, { url: '/api/export' });
  assert.equal(exported.data.decisions.length, 1);
  assert.match(exported.headers['Content-Disposition'], /attachment/u);
  const queue = await request(handler, { url: '/api/queue-export' });
  assert.equal(queue.data.kind, 'human-editorial-queue');
  assert.equal(queue.data.candidates.length, 2);
});
