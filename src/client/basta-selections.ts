// File role: Bookmark a particular Basta kalam or numbered stanza without
// adding layout height or altering the original poetry/source order.
import { STORAGE_KEYS, readRecord, readStringList, writeRecord, writeStringList } from "./storage";

const selectionDetailsKey = STORAGE_KEYS.bastaSelections + ":details";
export interface SelectionDetails { number?: string; title?: string }
export function readBastaSelectionDetails(): Record<string, SelectionDetails> {
  const raw = readRecord(selectionDetailsKey);
  const result: Record<string, SelectionDetails> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const value = entry as Record<string, unknown>;
    result[key] = {
      number: typeof value.number === "string" ? value.number : undefined,
      title: typeof value.title === "string" ? value.title : undefined,
    };
  }
  return result;
}

export type BastaSelection = { page: number; kind: "kalam" | "stanza"; index: number };
export function readBastaSelections(): BastaSelection[] {
  const results: BastaSelection[] = [];
  for (const value of readStringList(STORAGE_KEYS.bastaSelections)) {
    const match = /^(\d{1,3}):(kalam|stanza):(\d{1,3})$/.exec(value);
    if (!match) continue;
    const page = Number(match[1]), index = Number(match[3]);
    if (page > 0 && page <= 1000 && index > 0 && index <= 999)
      results.push({ page, kind: match[2] as BastaSelection["kind"], index });
  }
  return results;
}
export function selectionKey(value: BastaSelection): string {
  return value.page + ":" + value.kind + ":" + value.index;
}
export function removeBastaSelection(value: BastaSelection): void {
  writeStringList(STORAGE_KEYS.bastaSelections,
    readStringList(STORAGE_KEYS.bastaSelections).filter((key) => key !== selectionKey(value)));
  const details = readBastaSelectionDetails();
  delete details[selectionKey(value)];
  writeRecord(selectionDetailsKey, details);
  window.dispatchEvent(new Event("kalam:basta-selections-changed"));
}

export function initBastaSelections(root: HTMLElement): void {
  if (!["basta-page", "basta-continuous"].includes(root.dataset.readerKind || "")) return;
  if (root.dataset.selectionsReady === "true") return;
  root.dataset.selectionsReady = "true";

  const update = () => {
    const saved = new Set(readStringList(STORAGE_KEYS.bastaSelections));
    root.querySelectorAll<HTMLButtonElement>("[data-basta-save-selection]").forEach((button) => {
      const key = button.dataset.bastaSaveSelection!;
      const active = saved.has(key);
      button.setAttribute("aria-pressed", String(active));
      button.title = (active ? "Remove bookmark" : "Bookmark") + " for " +
        (key.includes(":stanza:") ? "stanza" : "kalam");
    });
  };
  const mount = () => {
    const pages = root.dataset.readerKind === "basta-page"
      ? [root] : Array.from(root.querySelectorAll<HTMLElement>("[data-basta-page]"));
    for (const pageNode of pages) {
      const page = Number(pageNode.dataset.bastaCurrentPage || pageNode.dataset.bastaPage);
      if (!Number.isSafeInteger(page) || page < 1) continue;
      const kalams = Array.from(pageNode.querySelectorAll<HTMLElement>(
        ".basta-page-urdu .basta-kalam-text, .basta-reader-urdu .basta-kalam-text"));
      let stanzaIndex = 0;
      kalams.forEach((block, index) => {
        if (block.dataset.selectionMounted === "true") return;
        block.dataset.selectionMounted = "true";
        block.classList.add("basta-selectable-kalam");
        const kalam = index + 1;
        const continuous = root.dataset.readerKind === "basta-continuous";
        block.id = (continuous ? "page-" + page + "-" : "") + "basta-kalam-" + kalam;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "basta-selection-action";
        button.dataset.bastaSaveSelection = page + ":kalam:" + kalam;
        button.textContent = "☆";
        button.setAttribute("aria-label", "Bookmark kalam " + kalam + " on Basta page " + page);
        block.prepend(button);

        block.querySelectorAll<HTMLElement>(".poetry-stanza-number").forEach((marker) => {
          const current = ++stanzaIndex;
          const stanza = document.createElement("button");
          stanza.type = "button";
          stanza.className = marker.className + " basta-stanza-bookmark";
          stanza.textContent = marker.textContent;
          stanza.dataset.bastaSaveSelection = page + ":stanza:" + current;
          stanza.id = (continuous ? "page-" + page + "-" : "") + "basta-stanza-" + current;
          stanza.setAttribute("aria-label", "Bookmark stanza " + marker.textContent?.trim() +
            " on Basta page " + page);
          marker.replaceWith(stanza);
        });
      });
    }
    // Printed labels are distinct from anchor positions. Recover metadata
    // for pre-existing bookmarks when their source page is revisited.
    const details = readBastaSelectionDetails();
    const saved = new Set(readStringList(STORAGE_KEYS.bastaSelections));
    let changed = false;
    root.querySelectorAll<HTMLButtonElement>("[data-basta-save-selection]").forEach((button) => {
      const key = button.dataset.bastaSaveSelection;
      if (!key || !saved.has(key) || details[key]) return;
      const block = button.closest<HTMLElement>(".basta-kalam-text");
      details[key] = {
        number: key.includes(":stanza:") ? button.textContent?.trim() : undefined,
        title: block?.querySelector<HTMLElement>(".basta-kalam-title")?.textContent?.trim() || undefined,
      };
      changed = true;
    });
    if (changed) writeRecord(selectionDetailsKey, details);
    update();
    const hash = location.hash.slice(1);
    if (/^(?:page-\d+-)?basta-(kalam|stanza)-\d+$/.test(hash)) {
      const target = root.querySelector<HTMLElement>("#" + CSS.escape(hash));
      if (target && root.dataset.lastSelectionHash !== hash) {
        root.dataset.lastSelectionHash = hash;
        requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
      }
    }
  };
  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("[data-basta-save-selection]");
    if (!button) return;
    const key = button.dataset.bastaSaveSelection!;
    const bookmarks = readStringList(STORAGE_KEYS.bastaSelections);
    const removing = bookmarks.includes(key);
    writeStringList(STORAGE_KEYS.bastaSelections, removing
      ? bookmarks.filter((item) => item !== key)
      : [key, ...bookmarks].slice(0, 200));
    const details = readBastaSelectionDetails();
    if (removing) delete details[key];
    else {
      const block = button.closest<HTMLElement>(".basta-kalam-text");
      details[key] = {
        number: key.includes(":stanza:") ? button.textContent?.trim() : undefined,
        title: block?.querySelector<HTMLElement>(".basta-kalam-title")?.textContent?.trim() || undefined,
      };
    }
    writeRecord(selectionDetailsKey, details);
    window.dispatchEvent(new Event("kalam:basta-selections-changed"));
    update();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.bastaSelections) update();
  });
  window.addEventListener("basta:content-loaded", mount);
  mount();
}
