/* Opt-in offline poetry cache. Never cache API responses or organizer credentials. */
const PAGE_CACHE = "kalam-offline-pages-v1";
const SHELL_CACHE = "kalam-offline-shell-v1";
const ASSET_CACHE = "kalam-offline-assets-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) =>
    cache.addAll(["/", "/saved/", "/offline/"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys())
      if (name.startsWith("kalam-offline-") && ![PAGE_CACHE,SHELL_CACHE,ASSET_CACHE].includes(name))
        await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "SAVE_PAGES" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const urls = event.data.urls.filter((path) =>
      typeof path === "string" && /^\/(?:lyrics\/[a-z0-9-]+|basta\/\d{1,3})\/$/.test(path)).slice(0,80);
    const cache = await caches.open(PAGE_CACHE);
    let saved = 0, failed = 0;
    for (const path of ["/data/saved-catalog.json", ...urls]) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok || response.type === "opaque") throw Error("Unavailable");
        await cache.put(path,response);
        if (path !== "/data/saved-catalog.json") saved++;
      } catch { failed++; }
    }
    event.ports[0]?.postMessage({ saved, failed });
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/r/")) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && ["/","/saved/","/offline/"].includes(url.pathname))
          (await caches.open(SHELL_CACHE)).put(request,response.clone());
        return response;
      } catch {
        return await (await caches.open(PAGE_CACHE)).match(request)
          || await (await caches.open(SHELL_CACHE)).match(request)
          || await (await caches.open(SHELL_CACHE)).match("/offline/")
          || Response.error();
      }
    })());
  } else if (url.pathname === "/data/saved-catalog.json") {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(PAGE_CACHE)).match(request) || Response.error()));
  } else if (["style","script","font"].includes(request.destination) &&
      !url.pathname.includes("/pagefind/")) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request,response.clone());
      return response;
    })());
  }
});
