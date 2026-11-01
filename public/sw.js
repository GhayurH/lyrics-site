/* All downloads are user-initiated. Never cache /api, organizer URLs or credentials. */
const PREFIX = "kalam-offline-";
const NAMES = {
  pages: PREFIX + "pages-v2", scans: PREFIX + "scans-v1",
  search: PREFIX + "search-v1", shell: PREFIX + "shell-v2", assets: PREFIX + "assets-v2",
};
const SHELL = ["/", "/saved/", "/offline/", "/search/"];
const PAGE = /^\/(?:lyrics\/[a-z0-9-]+|basta\/\d{1,3}|basta\/kalam\/basta-[a-z0-9-]+)\/$/;
const SCAN = /^\/images\/basta\/original\/\d{3}\.png$/;
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(NAMES.shell).then((cache) => cache.addAll(SHELL))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  for (const name of await caches.keys())
    if (name.startsWith(PREFIX) && !Object.values(NAMES).includes(name))
      await caches.delete(name);
  await self.clients.claim();
})()));
async function putDownloaded(cache, path, opaqueAllowed = false) {
  const request = opaqueAllowed ? new Request(path, { mode: "no-cors" }) : new Request(path);
  const response = await fetch(request, { cache: "no-store" });
  if (!response.ok && !(opaqueAllowed && response.type === "opaque"))
    throw Error("Unavailable " + path);
  await cache.put(path,response);
}
async function savePages({urls,scanPages,includeScans}) {
  const pageCache = await caches.open(NAMES.pages);
  let saved = 0, failed = 0, scans = 0, scanFailed = 0;
  for (const path of ["/data/saved-catalog.json", ...urls]) {
    if (path !== "/data/saved-catalog.json" && !PAGE.test(path)) continue;
    try { await putDownloaded(pageCache,path); if (PAGE.test(path)) saved++; }
    catch { failed++; }
  }
  if (includeScans) {
    const scanCache = await caches.open(NAMES.scans);
    for (const page of [...new Set(scanPages)].slice(0,80)) {
      if (!Number.isSafeInteger(page) || page < 1 || page > 999) continue;
      const path = "/images/basta/original/" + String(page).padStart(3,"0") + ".png";
      if (!SCAN.test(path)) continue;
      try { await putDownloaded(scanCache,path,true); scans++; }
      catch { scanFailed++; }
    }
  }
  return { saved, failed, scans, scanFailed };
}
async function saveSearch() {
  const manifest = await (await fetch("/data/offline-search-assets.json", { cache:"no-store" })).json();
  if (manifest.version !== 1 || !Array.isArray(manifest.files) ||
      manifest.files.length > 3000 || manifest.totalBytes > 55000000)
    throw Error("Search index exceeds the safe offline download limit");
  const searchCache = await caches.open(NAMES.search);
  const seen = new Set();
  let saved = 0, failed = 0;
  for (const name of manifest.files) {
    if (typeof name !== "string" ||
        !/^\/pagefind\/[a-zA-Z0-9_.\/\-]+$/.test(name) || seen.has(name)) continue;
    seen.add(name);
    try { await putDownloaded(searchCache,name); saved++; }
    catch { failed++; }
  }
  if (failed) throw Error("Search download incomplete: " + failed + " of " + seen.size + " assets failed");
  return { saved, failed, totalBytes: manifest.totalBytes };
}
async function cacheStatus() {
  const status = {};
  for (const [type,name] of Object.entries(NAMES)) {
    const cache = await caches.open(name);
    status[type] = (await cache.keys()).length;
  }
  return status;
}
self.addEventListener("message",(event) => {
  const data = event.data;
  if (!data || !["SAVE_PAGES","SAVE_SEARCH","CACHE_STATUS","CLEAR_OFFLINE"].includes(data.type)) return;
  event.waitUntil((async () => {
    const port = event.ports?.[0];
    try {
      let result;
      if (data.type === "SAVE_PAGES") {
        if (!Array.isArray(data.urls) || data.urls.length > 80 ||
            !Array.isArray(data.scanPages)) throw Error("Invalid offline page list");
        result = await savePages({
          urls: data.urls.filter((u) => typeof u === "string"),
          scanPages: data.scanPages,
          includeScans: data.includeScans === true,
        });
      } else if (data.type === "SAVE_SEARCH") result = await saveSearch();
      else if (data.type === "CLEAR_OFFLINE") {
        await Promise.all([NAMES.pages,NAMES.scans,NAMES.search].map((n) => caches.delete(n)));
        result = { cleared:true };
      } else result = await cacheStatus();
      port?.postMessage({ ok:true, ...result });
    } catch (error) { port?.postMessage({ ok:false, error:String(error?.message || error) }); }
  })());
});
self.addEventListener("fetch",(event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/r/") || url.searchParams.has("edit")) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && SHELL.includes(url.pathname))
          (await caches.open(NAMES.shell)).put(request,response.clone());
        return response;
      } catch {
        return await (await caches.open(NAMES.pages)).match(request)
          || await (await caches.open(NAMES.shell)).match(request)
          || await (await caches.open(NAMES.shell)).match("/offline/")
          || Response.error();
      }
    })());
  } else if (url.pathname.startsWith("/pagefind/")) {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(NAMES.search)).match(request) || Response.error()));
  } else if (SCAN.test(url.pathname)) {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(NAMES.scans)).match(url.pathname) || Response.error()));
  } else if (url.pathname === "/data/saved-catalog.json") {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(NAMES.pages)).match(request) || Response.error()));
  } else if (["style","script","font"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(NAMES.assets);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request,response.clone());
      return response;
    })());
  }
});
