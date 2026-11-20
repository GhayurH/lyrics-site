#!/usr/bin/env node
// Start the private local review app. No build, source mutation, Git commit or
// publication occurs. The independent ledger is kept in the user's state area.
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { sha256 } from './editorial/model.mjs';
import { startEditorialServer } from './editorial/server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let port = 4319, stateDir;
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--help') {
    console.log('Usage: node --experimental-strip-types scripts/editorial-workspace.mjs [--port 4319] [--state-dir PATH]');
    console.log('Loopback review UI; poems and existing trackers stay read-only. Review decisions persist outside the repository.');
    process.exit(0);
  }
  if (argument === '--port' && /^\d+$/u.test(args[index + 1] || '')) port = Number(args[++index]);
  else if (argument === '--state-dir' && args[index + 1]) stateDir = resolve(args[++index]);
  else throw Error('Unknown or incomplete option: ' + argument);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Choose a port from 1024 to 65535');
stateDir ||= join(process.env.XDG_STATE_HOME || join(homedir(), '.local/state'), 'kalam-editorial', sha256(resolve(root)).slice(0, 16));
console.log('Loading the local corpus and editorial rules…');
const app = await startEditorialServer({ root, stateDir, port });
console.log('Editorial workspace: ' + app.origin);
console.log('Human review ledger: ' + app.workspace.store.file);
console.log('Source files and existing review trackers are read-only. Ctrl+C closes this local server.');
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
});
