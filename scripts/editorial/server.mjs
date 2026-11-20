// Loopback-only private review server. Its static assets are deliberately not
// part of Astro/public. Same-origin checks protect local files and review notes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { EditorialWorkspace } from './workspace.mjs';
import { EditorialError } from './ledger.mjs';

const assets = new Map([
  ['/', ['ui/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['ui/app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['ui/style.css', 'text/css; charset=utf-8']],
]);
const allowedQueues = new Set(['all', 'identity', 'metadata', 'validation', 'missing-roman', 'unreviewed', 'needs_work', 'stale', 'accepted', 'deferred']);
function numberParam(value, fallback, maximum) {
  if (value === null) return fallback;
  if (!/^\d+$/u.test(value) || Number(value) > maximum) throw new EditorialError('Invalid inventory pagination');
  return Number(value);
}
async function jsonBody(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json')
    throw new EditorialError('Use application/json', 415);
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new EditorialError('Request is too large', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EditorialError('Invalid JSON'); }
}
function tokenEquals(value, expected) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value) || !/^[a-f0-9]{64}$/u.test(expected)) return false;
  return timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(expected, 'hex'));
}

// An ordinary request handler is also testable without opening a socket. It
// still performs all Host, Origin, loopback and CSRF checks in that path.
export function createEditorialHandler({ workspace, getOrigin, csrfToken }) {
  return async (request, response) => {
    const headers = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    };
    const send = (status, data, type = 'application/json; charset=utf-8', extra = {}) => {
      response.writeHead(status, { ...headers, 'Content-Type': type, ...extra });
      response.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
    };
    try {
      const origin = getOrigin();
      const host = new URL(origin).host;
      if (request.headers.host !== host || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress))
        throw new EditorialError('This workspace is available only through its printed loopback URL', 403, 'local_only');
      const url = new URL(request.url, origin);
      if (url.origin !== origin) throw new EditorialError('Invalid request origin', 403);
      const requestOrigin = request.headers.origin;
      if (requestOrigin && requestOrigin !== origin) throw new EditorialError('Cross-origin access is not allowed', 403, 'origin_rejected');
      if (url.pathname.startsWith('/api/') && request.headers['sec-fetch-site'] === 'cross-site')
        throw new EditorialError('Cross-site access is not allowed', 403, 'origin_rejected');
      if (request.method === 'POST') {
        if (requestOrigin !== origin || !tokenEquals(request.headers['x-editorial-csrf'], csrfToken))
          throw new EditorialError('Open this workspace locally and refresh before saving', 403, 'csrf_rejected');
      } else if (request.method !== 'GET') throw new EditorialError('Method not allowed', 405);
      if (request.method === 'GET' && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        send(200, await readFile(new URL(file, import.meta.url)), type); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/session') {
        send(200, { ...await workspace.session(), csrfToken }); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/inventory') {
        const queue = url.searchParams.get('queue') || 'all';
        const publication = url.searchParams.get('publication') || 'all';
        if (!allowedQueues.has(queue) || !['all', 'published', 'unpublished'].includes(publication))
          throw new EditorialError('Invalid review queue');
        send(200, await workspace.inventory({
          q: (url.searchParams.get('q') || '').slice(0, 300), queue, publication,
          language: (url.searchParams.get('language') || '').slice(0, 40),
          offset: numberParam(url.searchParams.get('offset'), 0, 1_000_000),
          limit: Math.max(1, numberParam(url.searchParams.get('limit'), 60, 100)),
        })); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/source') {
        send(200, await workspace.detail(url.searchParams.get('id'))); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/rules') {
        send(200, { version: workspace.rules.version, content: workspace.rules.content }); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/export') {
        send(200, await workspace.store.read(), 'application/json; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="kalam-editorial-decisions.json"' }); return;
      }
      if (request.method === 'GET' && url.pathname === '/api/queue-export') {
        send(200, await workspace.exportQueue(), 'application/json; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="kalam-editorial-queue.json"' }); return;
      }
      if (request.method === 'POST' && url.pathname === '/api/refresh') {
        await jsonBody(request); send(200, await workspace.refresh()); return;
      }
      if (request.method === 'POST' && url.pathname === '/api/decisions') {
        send(200, await workspace.decide(await jsonBody(request))); return;
      }
      throw new EditorialError('Not found', 404, 'not_found');
    } catch (error) {
      const status = error instanceof EditorialError ? error.status : 500;
      send(status, { error: error instanceof EditorialError ? error.message : 'The local operation failed. Check the workspace terminal and preserve the ledger.',
        code: error.code || 'local_error' });
      if (!(error instanceof EditorialError)) console.error('Editorial workspace:', error);
    }
  };
}

export async function startEditorialServer({ root, stateDir, port = 4319 }) {
  const workspace = await new EditorialWorkspace({ root, stateDir }).initialize();
  const csrfToken = randomBytes(32).toString('hex');
  let origin;
  const server = createServer(createEditorialHandler({ workspace, getOrigin: () => origin, csrfToken }));
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  return { server, workspace, origin,
    close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }),
  };
}
