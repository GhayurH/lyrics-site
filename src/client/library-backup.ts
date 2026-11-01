// Versioned, explicit JSON export of browser-local settings, bookmarks and drafts.
import { readFavoriteIds, readStringList, STORAGE_KEYS } from "./storage";
import { readBastaBookmarks } from "./basta-bookmarks";
import { readBastaKalamFavorites } from "./basta-kalam-favorites";

export const BACKUP_KEYS = [
  ...Object.values(STORAGE_KEYS), STORAGE_KEYS.bastaSelections + ":details",
  "kalam:recitation-drafts-v1", "kalam:recitation-templates-v1", "kalam:reading-fonts", "theme",
  "kalam:custom-theme", "kalam:custom-theme-base", "kalam:recitation-view",
] as const;
export interface LibraryBackup {
  format: "kalam-archive-local-data";
  version: 1;
  exportedAt: string;
  entries: Record<string,string>;
}
export function createLibraryBackup(storage: Pick<Storage,"getItem"> = localStorage): LibraryBackup {
  const entries: Record<string,string> = Object.create(null);
  for (const key of BACKUP_KEYS) {
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return { format: "kalam-archive-local-data", version: 1, exportedAt: new Date().toISOString(), entries };
}
export function validateLibraryBackup(value: unknown): LibraryBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid backup file");
  const raw = value as Partial<LibraryBackup>;
  if (raw.format !== "kalam-archive-local-data" || raw.version !== 1 ||
      !raw.entries || typeof raw.entries !== "object" || Array.isArray(raw.entries))
    throw Error("Unsupported backup format or version");
  const entries: Record<string,string> = Object.create(null);
  for (const [key, item] of Object.entries(raw.entries)) {
    if (!(BACKUP_KEYS as readonly string[]).includes(key) || typeof item !== "string" || item.length > 500000)
      throw Error("Invalid backup entry: " + key);
    if (!["theme","kalam:custom-theme-base","kalam:recitation-view"].includes(key))
      JSON.parse(item); // Reject malformed structured settings before writing anything.
    entries[key] = item;
  }
  return { format: raw.format, version: raw.version, exportedAt: String(raw.exportedAt || ""), entries };
}
export function initLibraryBackup(): void {
  const status = document.getElementById("saved-data-message");
  const say = (message: string) => { if (status) status.textContent = message; };
  document.getElementById("saved-export")?.addEventListener("click", () => {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(createLibraryBackup(),null,2)],{type:"application/json"}));
      const link = document.createElement("a");
      link.href = url; link.download = "kalam-archive-backup.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say("Backup exported. Keep organizer edit links private.");
    } catch { say("Unable to export browser data."); }
  });
  document.querySelector<HTMLInputElement>("#saved-import")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error("File exceeds 1 MB");
      const backup = validateLibraryBackup(JSON.parse(await file.text()));
      const entries = Object.entries(backup.entries);
      const conflicts = entries.filter(([key,value]) => localStorage.getItem(key) !== null &&
        localStorage.getItem(key) !== value).map(([key]) => key);
      if (!confirm("Import " + entries.length + " data groups?" +
          (conflicts.length ? "\nOverwrite: " + conflicts.join(", ") : "\nNo existing values will be replaced.") +
          "\n\nImport only trusted backups. They may contain private organizer edit links.")) {
        say("Import cancelled."); return;
      }
      for (const [key,value] of entries) localStorage.setItem(key,value);
      location.reload();
    } catch (e) { say("Import failed: " + (e as Error).message); }
    finally { input.value = ""; }
  });

  async function sendWorker(type: string, payload: Record<string,unknown> = {}): Promise<Record<string,unknown>> {
    if (!("serviceWorker" in navigator)) throw Error("Offline service unavailable");
    const ready = await Promise.race([navigator.serviceWorker.ready,
      new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("Offline worker unavailable")),7000))]);
    if (!ready.active) throw Error("Offline worker unavailable");
    const channel = new MessageChannel();
    return await new Promise<Record<string,unknown>>((resolve,reject) => {
      const timer = setTimeout(() => { channel.port1.close(); reject(Error("Offline task timed out")); },180000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer); channel.port1.close();
        if (event.data?.ok) resolve(event.data);
        else reject(Error(event.data?.error || "Offline task failed"));
      };
      ready.active!.postMessage({type,...payload},[channel.port2]);
    });
  }
  async function refreshOfflineStatus(): Promise<void> {
    try {
      const result = await sendWorker("CACHE_STATUS");
      const status = document.getElementById("saved-cache-status");
      if (status) status.textContent = [
        result.pages + " pages",result.scans + " scans",result.search + " search files",
      ].join(" · ") + " stored offline";
    } catch { /* Unavailable in blocked or non-secure contexts. */ }
  }
  async function saveOffline(urls: string[]): Promise<void> {
    if (!urls.length) throw Error("Select pages first");
    const includeScans = document.querySelector<HTMLInputElement>("#offline-include-scans")?.checked === true;
    const scanPages = urls.flatMap((url) => {
      const match = url.match(/^\/basta\/(\d{1,3})\/$/);
      return match ? [Number(match[1])] : [];
    });
    if (includeScans) {
      const response = await fetch("/data/basta-kalams.json");
      if (response.ok) {
        const catalog = await response.json();
        for (const url of urls) {
          const match = url.match(/^\/basta\/kalam\/(basta-[a-z0-9-]+)\/$/);
          const found = match && catalog.kalams?.find((item: {id:string}) => item.id === match[1]);
          if (found) scanPages.push(...(found.pages as number[]));
        }
      }
    }
    if (includeScans && scanPages.length > 20 &&
        !confirm("This may download " + scanPages.length + " large original scan images. Continue?"))
      return;
    say("Downloading " + urls.length + " reading pages" + (includeScans ? " and source scans" : "") + "…");
    const result = await sendWorker("SAVE_PAGES",{urls,scanPages,includeScans});
    say(result.saved + " pages saved" + (result.scans ? " and " + result.scans + " source scans" : "") +
      (result.failed || result.scanFailed ? "; some downloads failed" : "") + ".");
    await refreshOfflineStatus();
  }
  document.getElementById("saved-cache-search")?.addEventListener("click", async () => {
    if (!confirm("Save the full Pagefind search index for offline use? It can require tens of MB of storage.")) return;
    say("Downloading the complete search index for offline use…");
    try {
      const result = await sendWorker("SAVE_SEARCH");
      say("Search index saved (" + result.saved + " files). Saved searches work without a connection.");
      await refreshOfflineStatus();
    } catch (e) { say((e as Error).message); }
  });
  document.getElementById("saved-cache-range")?.addEventListener("click", async () => {
    if (!("serviceWorker" in navigator)) { say("Offline storage is unavailable."); return; }
    const start = Number(document.querySelector<HTMLInputElement>("#offline-range-start")?.value);
    const end = Number(document.querySelector<HTMLInputElement>("#offline-range-end")?.value);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 1 || end < start || end > 999 || end - start >= 30) {
      say("Choose between 1 and 30 consecutive printed pages."); return;
    }
    try { await saveOffline(Array.from({length:end-start+1},(_,i)=>"/basta/"+(start+i)+"/")); }
    catch(e) { say((e as Error).message); }
  });
  document.getElementById("saved-cache")?.addEventListener("click", async () => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      say("Offline storage is not available in this browser."); return;
    }
    const pages = readBastaBookmarks();
    const selections = readStringList(STORAGE_KEYS.bastaSelections)
      .map((v) => Number(v.split(":")[0])).filter((n) => Number.isSafeInteger(n) && n >= 1 && n <= 999);
    const urls = [...new Set([
      ...readFavoriteIds().filter((id) => /^[a-z0-9-]+$/i.test(id)).map((id) => "/lyrics/" + id + "/"),
      ...readBastaKalamFavorites().map(({id}) => "/basta/kalam/" + id + "/"),
      ...[...pages,...selections].map((n) => "/basta/" + n + "/"),
    ])].slice(0,80);
    if (!urls.length) { say("Bookmark some kalams or Basta pages first."); return; }
    try { await saveOffline(urls); }
    catch(e) { say("Offline saving failed: " + (e as Error).message); }
  });
  document.getElementById("saved-cache-clear")?.addEventListener("click", async () => {
    if (!confirm("Remove all downloaded poetry pages, scans and offline search data?")) return;
    try { await sendWorker("CLEAR_OFFLINE"); say("Offline copies removed."); await refreshOfflineStatus(); }
    catch(e) { say((e as Error).message); }
  });
  void refreshOfflineStatus();
}
