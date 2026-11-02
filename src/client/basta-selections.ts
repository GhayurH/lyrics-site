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
      // The two editions are views of the same printed fragments. Each gets
      // its own controls, but the saved page/kalam and page/stanza ordinal is
      // shared, so switching languages never creates duplicate bookmarks.
      const editions = [
        { name: "urdu", selector: ".basta-page-urdu .basta-kalam-text, .basta-reader-urdu .basta-kalam-text" },
        { name: "roman", selector: ".basta-page-roman .basta-kalam-text, .basta-reader-roman .basta-kalam-text" },
      ] as const;
      const hasUrdu = Boolean(pageNode.querySelector(editions[0].selector));
      const continuous = root.dataset.readerKind === "basta-continuous";
      for (const edition of editions) {
        const blocks = Array.from(pageNode.querySelectorAll<HTMLElement>(edition.selector));
        const anchorEdition = edition.name === "urdu" || !hasUrdu;
        let stanzaIndex = 0;
        blocks.forEach((block, index) => {
          if (block.dataset.selectionMounted === "true") {
            stanzaIndex += block.querySelectorAll(".basta-stanza-bookmark").length;
            return;
          }
          block.dataset.selectionMounted = "true";
          block.classList.add("basta-selectable-kalam");
          const kalam = index + 1;
          if (anchorEdition)
            block.id = (continuous ? "page-" + page + "-" : "") + "basta-kalam-" + kalam;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "basta-selection-action";
          button.dataset.bastaSaveSelection = page + ":kalam:" + kalam;
          button.dataset.bastaEdition = edition.name;
          button.textContent = "☆";
          button.setAttribute("aria-label", "Bookmark kalam " + kalam +
            " on Basta page " + page + " (" + edition.name + ")");
          block.prepend(button);

          block.querySelectorAll<HTMLElement>(".poetry-stanza-number").forEach((marker) => {
            const current = ++stanzaIndex;
            const stanza = document.createElement("button");
            stanza.type = "button";
            stanza.className = marker.className + " basta-stanza-bookmark";
            stanza.textContent = marker.textContent;
            stanza.dataset.bastaSaveSelection = page + ":stanza:" + current;
            stanza.dataset.bastaEdition = edition.name;
            if (anchorEdition)
              stanza.id = (continuous ? "page-" + page + "-" : "") + "basta-stanza-" + current;
            stanza.setAttribute("aria-label", "Bookmark stanza " + marker.textContent?.trim() +
              " on Basta page " + page + " (" + edition.name + ")");
            marker.replaceWith(stanza);
          });
        });
      }
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
    const match = hash.match(/^(?:page-(\d+)-)?basta-(kalam|stanza)-(\d+)$/);
    if (match) {
      const targetPage = Number(match[1] || root.dataset.bastaCurrentPage);
      const key = targetPage + ":" + match[2] + ":" + Number(match[3]);
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(
        "[data-basta-save-selection]")).filter(button =>
        button.dataset.bastaSaveSelection === key);
      // The legacy public hash stays the same. Navigate to whichever text
      // edition is currently visible, including when Roman is the only view.
      const romanOnly = root.dataset.readingColumns?.split(" ").includes("roman") &&
        !root.dataset.readingColumns?.split(" ").includes("urdu");
      const visible = buttons.find(button =>
        button.dataset.bastaEdition === (romanOnly ? "roman" : "urdu") &&
        button.getClientRects().length > 0) ??
        buttons.find(button => button.getClientRects().length > 0) ??
        root.querySelector<HTMLElement>("#" + CSS.escape(hash));
      const target = visible ?? null;
      const signature = hash + ":" + (target?.dataset.bastaEdition || "urdu");
      if (target && root.dataset.lastSelectionHash !== signature) {
        root.dataset.lastSelectionHash = signature;
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
  window.addEventListener("kalam:columns-changed", mount);
  window.addEventListener("hashchange", mount);
  mount();
}
