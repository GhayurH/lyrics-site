// Rendering and source resolution for recitation works. Navigation, persistence,
// live state, and export actions remain in recitation-reader.ts.
import type { BastaKalam } from "../lib/basta-kalam-units";
import { fetchPoem, type Poem } from "./recitation-poem-source";
import { renderBastaTextBlock } from "./basta-dom";
import { layoutLyricStanzas, lyricStanzaClassNames, lyricLineClassName } from "../lib/lyric-stanzas";
import { parseStanzaNumber } from "../lib/stanza-numbers";
import { romanUnavailable } from "../lib/edition-availability";
import type { RecitationItem } from "../lib/recitation-set";

export function node<K extends keyof HTMLElementTagNameMap>(
  name: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(name);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function addBastaText(host: HTMLElement, text: string, prefaceOnly = false) {
  host.append(renderBastaTextBlock(text, true, "auto", prefaceOnly));
}
function addLyricText(host: HTMLElement, text: string, isRoman = false, sixVerseLayout?: "pairs") {
  const block = node("div", "lyric-reading-text " + (isRoman ? "roman-lyrics-text" : "lyrics-text"));
  for (const stanza of layoutLyricStanzas(text)) {
    const group = node("div", lyricStanzaClassNames(stanza, sixVerseLayout));
    for (const line of stanza) {
      group.append(node("span", lyricLineClassName(line), line.text));
    }
    block.append(group);
  }
  host.append(block);
}
function preface(roman: string): string {
  const lines = roman.split(/\r?\n/);
  const first = lines.findIndex((line) => parseStanzaNumber(line) !== null);
  return lines.slice(0, first < 0 ? lines.length : first).join("\n").trim();
}
/**
 * Rebuild the display from canonical numbered units. Joining source pages with
 * a single newline can merge the closing couplet of stanza 6 with the printed
 * numeral of stanza 7 when the poem crosses a page boundary.
 */
function originalBastaEdition(parent: HTMLElement, kalam: BastaKalam, language: "urdu" | "roman", hasScan: boolean) {
  const source = language === "urdu" ? kalam.urdu : kalam.roman || "";
  if (!source) {
    parent.append(node("p", "recite-empty-edition", romanUnavailable("kalam", hasScan)));
    return;
  }
  if (!kalam.numbered || !kalam.stanzas.length ||
      (language === "roman" && kalam.stanzas.some((stanza) => !stanza.roman))) {
    addBastaText(parent, source);
    return;
  }
  const opening = language === "urdu" ? kalam.preface : preface(source);
  if (opening) addBastaText(parent, opening, true);
  for (const stanza of kalam.stanzas) {
    addBastaText(parent, stanza.printedNumber + "\n" +
      (language === "urdu" ? stanza.urdu : stanza.roman!));
  }
}

/** Include all printed pages, plus any pages used for borrowed stanzas. */
function sourceScanPages(poem: Poem, item: RecitationItem, sources: Map<string, Poem>): number[] {
  if (!poem.basta) return [];
  const pages = new Set<number>(poem.basta.pages?.length
    ? poem.basta.pages : [poem.basta.startPage]);
  for (const ref of item.stanzaSequence || []) {
    const stanza = sources.get(ref.kalamId)?.basta?.stanzas
      .find((candidate) => candidate.id === ref.stanzaId);
    for (const page of stanza?.pages || []) pages.add(page);
  }
  return [...pages].filter((page) => Number.isSafeInteger(page) && page > 0);
}

function stanzaSection(parent: HTMLElement, poem: Poem, item: RecitationItem, language: "urdu" | "roman",
  sources: Map<string, Poem>, hasScan: boolean) {
  const original = poem.basta!;
  const references = item.stanzaSequence || [];
  if (language === "urdu") {
    if (original.preface) addBastaText(parent, original.preface, true);
  } else if (preface(original.roman || "")) {
    addBastaText(parent, preface(original.roman || ""), true);
  }
  for (const ref of references) {
    const source = sources.get(ref.kalamId)?.basta;
    const stanza = source?.stanzas.find((s) => s.id === ref.stanzaId);
    if (!source || !stanza) {
      const warning = node("p", "recite-missing-stanza",
        "Stanza unavailable: " + ref.kalamId + " / " + ref.stanzaId +
        ". It remains in the saved programme; no replacement has been made.");
      warning.setAttribute("role", "status");
      parent.append(warning);
      continue;
    }
    if (source.id !== item.id) {
      const attribution = node("p", "recite-stanza-source");
      attribution.append("Stanza " + stanza.number + " from ");
      const link = node("a");
      link.href = "/basta/" + source.startPage + "/";
      link.textContent = source.name;
      attribution.append(link);
      parent.append(attribution);
    }
    if (language === "roman" && !stanza.roman) {
      parent.append(node("p", "recite-empty-edition", romanUnavailable("stanza", hasScan, stanza.number)));
    } else {
      addBastaText(parent, stanza.printedNumber + "\n" +
        (language === "urdu" ? stanza.urdu : stanza.roman));
    }
  }
}
export async function resolvedPoems(item: RecitationItem): Promise<{ poem: Poem; sources: Map<string, Poem> }> {
  const poem = await fetchPoem(item.kind, item.id);
  const sources = new Map<string, Poem>([[item.id, poem]]);
  if (item.stanzaSequence) {
    if (!poem.basta || poem.basta.sectionRoman !== "Marsiye") throw Error("Invalid Marsiya arrangement");
    const borrowedIds = [...new Set(item.stanzaSequence.map((ref) => ref.kalamId))];
    for (const id of borrowedIds) {
      try {
        const source = id === item.id ? poem : await fetchPoem("basta", id);
        if (source.basta?.sectionRoman === "Marsiye") sources.set(id, source);
      } catch {
        // A retired borrowed source must not hide the remaining readable stanzas.
        // Its reference remains in the set, shown as a missing-stanza warning.
      }
    }
  }
  return { poem, sources };
}
export function renderWork(work: HTMLElement, item: RecitationItem, index: number,
  poem: Poem, sources: Map<string, Poem>) {
  const header = node("header", "recite-work-header");
  const headline = node("h2", "kalam-reading-title", (index + 1) + ". " + poem.title);
  headline.lang = poem.lang; headline.dir = poem.direction;
  const alt = node("p", "kalam-reading-title", poem.alternateTitle || "");
  alt.lang = "en"; alt.dir = "ltr";
  const sourceLink = node("a", "", "Original source");
  sourceLink.href = poem.sourceUrl;
  header.append(headline);
  if (poem.alternateTitle) header.append(alt);
  header.append(sourceLink);
  const pages = sourceScanPages(poem, item, sources);
  const scans = pages.length
    ? pages.map((page) => ({
        address: "/images/basta/original/" + String(page).padStart(3, "0") + ".png",
        label: "Basta page " + page,
      }))
    : poem.image ? [{ address: poem.image, label: "Original scan of " + poem.title }] : [];
  const hasScan = scans.length > 0;
  // Each programme item uses the same column grid contract as other readers.
  const editions = node("div", "lyric-reading-grid recite-editions");
  const readingRoot = work.closest<HTMLElement>("[data-reading-root]");
  editions.dataset.readingMode = readingRoot?.dataset.readingMode ?? "parallel";
  editions.dataset.readingColumns = readingRoot?.dataset.readingColumns ?? "urdu roman";
  editions.dataset.lineSpacing = readingRoot?.dataset.lineSpacing ?? "default";
  editions.dataset.syncedScrollRoot = "";
  const urdu = node("section", "lyric-reading-panel lyric-reading-urdu");
  urdu.lang = poem.lang; urdu.dir = poem.direction;
  urdu.dataset.syncedScrollPanel = "";
  urdu.setAttribute("aria-label", "Original poem text");
  const roman = node("section", "lyric-reading-panel lyric-reading-roman");
  roman.lang = "en"; roman.dir = "ltr";
  roman.dataset.syncedScrollPanel = "";
  roman.setAttribute("aria-label", "Roman Urdu text");
  if (item.stanzaSequence) {
    stanzaSection(urdu, poem, item, "urdu", sources, hasScan);
    stanzaSection(roman, poem, item, "roman", sources, hasScan);
  } else if (poem.kind === "basta") {
    originalBastaEdition(urdu, poem.basta!, "urdu", hasScan);
    originalBastaEdition(roman, poem.basta!, "roman", hasScan);
  } else {
    addLyricText(urdu, poem.urdu, false, poem.sixVerseLayout);
    if (poem.roman) addLyricText(roman, poem.roman, true, poem.sixVerseLayout);
    else roman.append(node("p", "recite-empty-edition", romanUnavailable("kalam", hasScan)));
  }
  // Preserve the selected Roman edition while signalling when a source scan
  // is the available alternative; never silently substitute another text.
  const missingRoman = item.stanzaSequence
    ? item.stanzaSequence.some((reference) => {
        const source = sources.get(reference.kalamId)?.basta;
        const stanza = source?.stanzas.find((candidate) => candidate.id === reference.stanzaId);
        return Boolean(stanza && !stanza.roman);
      })
    : !poem.roman?.trim();
  if (missingRoman) work.classList.add("recite-work-no-roman");
  const image = node("figure", "lyric-reading-image");
  if (scans.length) {
    for (const scan of scans) {
      const frame = node("div", "recite-scan-page");
      const link = node("a");
      link.href = scan.address;
      link.className = "scan-viewer-trigger";
      link.setAttribute("aria-label", "Enlarge " + scan.label);
      const img = node("img");
      img.src = scan.address; img.alt = scan.label;
      img.loading = "lazy"; img.decoding = "async";
      link.append(img);
      frame.append(link);
      if (poem.basta) frame.append(node("figcaption", "recite-scan-caption", scan.label));
      image.append(frame);
    }
  } else {
    work.classList.add("recite-work-no-image");
    image.append(node("p", "recite-empty-edition", "No original scan available for this kalam."));
  }
  editions.append(image, roman, urdu);
  work.replaceChildren(header);
  if (item.reciter) work.append(node("p", "recite-work-note", "Reciter: " + item.reciter));
  if (item.note) work.append(node("p", "recite-work-note", item.note));
  work.append(editions);
  window.dispatchEvent(new Event("basta:content-loaded"));
}
