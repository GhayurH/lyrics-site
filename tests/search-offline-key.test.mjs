import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('versioned public Pagefind metadata can use its downloaded manifest key offline', async () => {
  const handlers = {};
  const metadata = '{"languages":{"en":{"hash":"test"}}}';
  const context = vm.createContext({
    URL, Request, Response,
    self: { location: { origin: 'https://kalamarchive.com' }, navigator: { onLine: false },
      addEventListener: (name, handler) => { handlers[name] = handler; } },
    fetch: async () => { throw Error('offline'); },
    caches: { open: async () => ({ match: async key => key === '/pagefind/pagefind-entry.json'
      ? new Response(metadata) : undefined }) },
  });
  vm.runInContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  const request = url => {
    /** @type {Promise<Response> | undefined} */
    let response;
    handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://kalamarchive.com' + url },
      respondWith: promise => { response = promise; } });
    return response;
  };
  const downloaded = await request('/pagefind/pagefind-entry.json?ts=build-123');
  assert.ok(downloaded);
  assert.equal(await downloaded.text(), metadata);
  assert.equal((await request('/pagefind/pagefind-entry.json?private=1'))?.type, 'error');
  assert.equal(request('/api/recitation-sets/example?edit=secret'), undefined);
});
