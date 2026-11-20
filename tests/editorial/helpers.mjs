import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { stringify } from 'yaml';
import { EditorialWorkspace } from '../../scripts/editorial/workspace.mjs';

const execute = promisify(execFile);

export function poem(overrides = {}, body = 'پہلا مصرع\nدوسرا مصرع\n') {
  const metadata = {
    title: 'پہلا کلام', alternateTitle: 'Pehla Kalam', recitationId: 'work-one',
    language: 'Urdu', lang: 'ur', direction: 'rtl', kalamType: 'Noha',
    poet: 'Test Poet', occasion: 'Muharram', published: false,
    romanLyrics: 'Pehla misra\nDoosra misra', ...overrides,
  };
  for (const key of Object.keys(metadata)) if (metadata[key] === undefined) delete metadata[key];
  return '---\n' + stringify(metadata, { defaultStringType: 'QUOTE_DOUBLE', blockQuote: 'literal', lineWidth: 0 }) + '---\n' + body;
}

export async function fixture(test, entries = {
  'pehla-kalam.md': poem(),
  'doosra-kalam.md': poem({ title: 'دوسرا کلام', alternateTitle: 'Doosra Kalam', recitationId: 'work-two' }, 'تیسرا مصرع\nچوتھا مصرع\n'),
}) {
  const directory = await mkdtemp(join(tmpdir(), 'kalam-editorial-test-'));
  const root = join(directory, 'repository'), stateDir = join(directory, 'state');
  const lyrics = join(root, 'src/data/lyrics');
  await Promise.all(['docs', 'src/data/lyrics', 'src/data/recitation', 'audit', 'public'].map(path => mkdir(join(root, path), { recursive: true })));
  await Promise.all([
    writeFile(join(root, 'docs/EDITORIAL.md'), '# Editorial rules\nRead the source and Roman editions manually.\n'),
    writeFile(join(root, 'src/data/recitation/identity-lock.json'), JSON.stringify({ version: 1, lyrics: [] })),
    writeFile(join(root, 'audit/round2-wip.json'), '{"machineTasks":"untouched"}\n'),
    ...Object.entries(entries).map(([name, content]) => writeFile(join(lyrics, name), content)),
  ]);
  await execute('git', ['init', '-q', root]);
  const cleanup = () => rm(directory, { recursive: true, force: true });
  if (test) test.after(cleanup);
  return { directory, root, stateDir, lyrics, cleanup,
    workspace: () => new EditorialWorkspace({ root, stateDir }).initialize(),
  };
}

export async function detailFor(workspace, permanentId = 'work-one') {
  const item = (await workspace.inventory()).items.find(record => record.permanentId === permanentId);
  return workspace.detail(item.candidateId);
}

export function decision(detail, task = 'source', status = 'accepted', extra = {}) {
  return { candidateId: detail.candidateId, expectedRevision: detail.revision,
    expectedContentHash: detail.rawHash, rulesVersion: detail.rulesVersion,
    task, status, notes: 'I inspected the exact source and recorded this decision.', ...extra };
}
