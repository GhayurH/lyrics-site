// Recitation reader: loads canonical verses on demand; programme order is separate data.
import type { BastaKalam } from "../lib/basta-kalam-units";
import { bastaVerseClassNames, layoutBastaKalam } from "../lib/basta-text";
import { splitLyricStanzas } from "../lib/lyric-stanzas";
import { validateRecitationSet, type RecitationSet, type RecitationItem } from "../lib/recitation-set";
import { readDrafts } from "./recitation-storage";
import { initReadingControls } from "./reader-state";
import { initVerseFitting } from "./verse-fitting";
import { initSyncedColumns } from "./synced-columns";
import { initScanViewer } from "./scan-viewer";

type Poem = {
  title: string; alternateTitle?: string; urdu: string; roman?: string;
  sourceUrl: string; image?: string; lang: string; direction: string;
  kind: "lyric" | "basta"; basta?: BastaKalam;
};
const poemCache = new Map<string, Promise<Poem>>();
const viewKey = "kalam:recitation-view";
const dom = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
function node<K extends keyof HTMLElementTagNameMap>(
  name: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(name);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
async function fetchPoem(kind: "lyric" | "basta", id: string): Promise<Poem> {
  const key = kind + ":" + id;
  if (!poemCache.has(key)) {
    const request = (async (): Promise<Poem> => {
      const address = kind === "lyric" ? "/data/recitation-lyrics/" + encodeURIComponent(id) + ".json" :
        "/data/basta-kalams/" + encodeURIComponent(id) + ".json";
      const response = await fetch(address);
      if (!response.ok) throw Error("Source unavailable or awaiting verification");
      const payload = await response.json();
      if (kind === "lyric") {
        const lyric = payload.lyric;
        if (!lyric || lyric.id !== id || typeof lyric.urdu !== "string") throw Error("Invalid source data");
        return { kind, title: lyric.title, alternateTitle: lyric.alternateTitle,
          urdu: lyric.urdu, roman: lyric.roman || "",
          sourceUrl: lyric.sourceUrl || "/lyrics/" + encodeURIComponent(id) + "/",
          image: lyric.cover || undefined, lang: lyric.lang || "ur",
          direction: lyric.direction || "rtl" };
      }
      const kalam = payload.kalam as BastaKalam;
      if (!kalam || kalam.id !== id || kalam.status !== "ready") throw Error("Unverified source");
      return { kind, title: kalam.name, alternateTitle: kalam.romanName,
        urdu: kalam.urdu, roman: kalam.roman || "",
        sourceUrl: "/basta/" + kalam.startPage + "/",
        image: "/images/basta/original/" + String(kalam.startPage).padStart(3, "0") + ".png",
        lang: "ur", direction: "rtl", basta: kalam };
    })();
    poemCache.set(key, request);
  }
  try { return await poemCache.get(key)!; }
  catch (e) { poemCache.delete(key); throw e; }
}
function addBastaText(host: HTMLElement, text: string) {
  const block = node("div", "basta-kalam-text");
  for (const line of layoutBastaKalam(text, true).filter((item) => !item.hidden)) {
    block.append(node("span", bastaVerseClassNames(line), line.text));
  }
  host.append(block);
}
function addLyricText(host: HTMLElement, text: string, isRoman = false) {
  const block = node("div", "lyric-reading-text " + (isRoman ? "roman-lyrics-text" : "lyrics-text"));
  for (const stanza of splitLyricStanzas(text)) {
    const group = node("div", "lyric-stanza");
    for (const line of stanza) {
      group.append(node("span", line.number ? "poetry-stanza-number" : "lyric-verse", line.text));
    }
    block.append(group);
  }
  host.append(block);
}
function preface(roman: string): string {
  const lines = roman.split(/\r?\n/);
  const first = lines.findIndex((line) => /^[0-9٠-٩۰-۹]+[.)۔-]?$/.test(line.trim()));
  return lines.slice(0, first < 0 ? lines.length : first).join("\n").trim();
}
function stanzaSection(parent: HTMLElement, poem: Poem, item: RecitationItem, language: "urdu" | "roman",
  sources: Map<string, Poem>) {
  const original = poem.basta!;
  const references = item.stanzaSequence || [];
  if (language === "urdu") {
    if (original.preface) addBastaText(parent, original.preface);
  } else if (preface(original.roman || "")) {
    addBastaText(parent, preface(original.roman || ""));
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
      parent.append(node("p", "recite-empty-edition", "Roman text unavailable for stanza " + stanza.number));
    } else {
      addBastaText(parent, stanza.printedNumber + "\n" +
        (language === "urdu" ? stanza.urdu : stanza.roman));
    }
  }
}
async function resolvedPoems(item: RecitationItem): Promise<{ poem: Poem; sources: Map<string, Poem> }> {
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
function renderWork(work: HTMLElement, item: RecitationItem, index: number,
  poem: Poem, sources: Map<string, Poem>) {
  const header = node("header", "recite-work-header");
  const headline = node("h2", "", (index + 1) + ". " + poem.title);
  headline.lang = poem.lang; headline.dir = poem.direction;
  const alt = node("p", "", poem.alternateTitle || "");
  const sourceLink = node("a", "", "Original source");
  sourceLink.href = poem.sourceUrl;
  header.append(headline);
  if (poem.alternateTitle) header.append(alt);
  header.append(sourceLink);
  const editions = node("div", "recite-editions");
  editions.dataset.syncedScrollRoot = "";
  const urdu = node("section", "lyric-reading-panel lyric-reading-urdu");
  urdu.lang = poem.lang; urdu.dir = poem.direction;
  urdu.dataset.syncedScrollPanel = "";
  urdu.setAttribute("aria-label", "Original poem text");
  const roman = node("section", "lyric-reading-panel lyric-reading-roman");
  roman.lang = "en"; roman.dir = "ltr";
  roman.dataset.syncedScrollPanel = "";
  roman.setAttribute("aria-label", "Roman Urdu text");
  const headingU = node("h3", "lyric-version-heading", "Original text");
  const headingR = node("h3", "lyric-version-heading", "Roman Urdu");
  urdu.append(headingU); roman.append(headingR);
  if (item.stanzaSequence) {
    stanzaSection(urdu, poem, item, "urdu", sources);
    stanzaSection(roman, poem, item, "roman", sources);
  } else if (poem.kind === "basta") {
    addBastaText(urdu, poem.urdu);
    if (poem.roman) addBastaText(roman, poem.roman);
    else roman.append(node("p", "recite-empty-edition", "Roman text is unavailable for this kalam."));
  } else {
    addLyricText(urdu, poem.urdu);
    if (poem.roman) addLyricText(roman, poem.roman, true);
    else roman.append(node("p", "recite-empty-edition", "Roman text is unavailable for this kalam."));
  }
  const image = node("figure", "lyric-reading-image");
  if (poem.image) {
    const link = node("a");
    link.href = poem.image; link.className = "scan-viewer-trigger";
    link.setAttribute("aria-label", "Open original scan");
    const img = node("img");
    img.src = poem.image; img.alt = "Original scan of " + poem.title;
    img.loading = "lazy"; img.decoding = "async";
    link.append(img); image.append(link);
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
async function readSet(): Promise<{ set: RecitationSet; local: boolean; draftId?: string }> {
  const params = new URLSearchParams(location.search);
  const remote = params.get("set");
  const local = params.get("draft");
  if (remote) {
    if (!/^[a-f0-9]{24}$/.test(remote)) throw Error("Invalid shared link");
    const response = await fetch("/api/recitation-sets/" + remote);
    if (!response.ok) throw Error(response.status === 503
      ? "This deployment has no D1 binding configured" : "Shared programme unavailable");
    const data = await response.json();
    return { set: validateRecitationSet(data.set), local: false };
  }
  if (local) {
    const found = readDrafts().find((draft) => draft.id === local);
    if (!found) throw Error("Draft not found in this browser");
    return { set: validateRecitationSet(found.set), local: true, draftId: found.id };
  }
  throw Error("Open a saved or shared Recitation Set to begin reading");
}

export async function initRecitationReader(): Promise<void> {
  const page = dom<HTMLElement>("recite-reader");
  if (!page) return;
  const root = dom<HTMLElement>("recite-reading-root");
  const holder = dom<HTMLElement>("recite-works");
  const err = dom<HTMLElement>("recite-reader-error");
  let set: RecitationSet;
  let local = false;
  let draftId: string | undefined;
  try {
    const response = await readSet();
    set = response.set; local = response.local; draftId = response.draftId;
  } catch (e) {
    dom<HTMLElement>("recite-reader-title").textContent = "Programme unavailable";
    err.hidden = false; err.textContent = (e as Error).message;
    root.hidden = true; return;
  }
  dom<HTMLElement>("recite-reader-title").textContent = set.title;
  dom<HTMLElement>("recite-reader-description").textContent =
    [set.occasion, set.description].filter(Boolean).join(" · ");
  dom<HTMLAnchorElement>("recite-reader-edit").href =
    local && draftId ? "/recite/?draft=" + encodeURIComponent(draftId) : "/recite/";
  const copy = dom<HTMLAnchorElement>("recite-reader-copy");
  const remoteId = new URLSearchParams(location.search).get("set");
  copy.href = remoteId && /^[a-f0-9]{24}$/.test(remoteId)
    ? "/recite/?set=" + remoteId : "/recite/?draft=" + encodeURIComponent(draftId || "");
  copy.textContent = remoteId ? "Edit a copy of this set" : "Back to set builder";
  let mode = "continuous";
  try { if (localStorage.getItem(viewKey) === "sequential") mode = "sequential"; } catch {}
  const select = dom<HTMLSelectElement>("recite-reader-contents");
  const view = dom<HTMLSelectElement>("recite-reader-view");
  view.value = mode;
  const works = set.items.map((item, index) => {
    const section = node("section", "recite-work");
    section.id = "kalam-" + (index + 1);
    section.dataset.reciteIndex = String(index);
    section.append(node("p", "recite-work-placeholder", "Loading kalam " + (index + 1) + "…"));
    holder.append(section);
    select.append(new Option((index + 1) + ". " + (item.sourceTitle || item.id), String(index)));
    return section;
  });
  let position = 0;
  const loading = new Map<number, Promise<void>>();
  async function load(index: number): Promise<void> {
    if (index < 0 || index >= works.length) return;
    if (!loading.has(index)) {
      const promise = resolvedPoems(set.items[index])
        .then(({ poem, sources }) => {
          renderWork(works[index], set.items[index], index, poem, sources);
          select.options[index].textContent = (index + 1) + ". " +
            (poem.alternateTitle || poem.title);
        }).catch(() => {
          const original = set.items[index];
          const heading = node("h2", "", (index + 1) + ". " +
            (original.sourceTitle || original.id));
          const explanation = node("p", "recite-missing-stanza",
            "This kalam is currently unavailable or awaiting source verification. " +
            "Its position and reference are preserved; no other text has been substituted.");
          explanation.setAttribute("role", "status");
          const lookup = node("a", "", "Search the archive");
          lookup.href = "/search/?q=" + encodeURIComponent(original.sourceTitle || original.id);
          const wrapper = node("div", "recite-work-placeholder");
          wrapper.append(heading, explanation, lookup);
          works[index].replaceChildren(wrapper);
        });
      loading.set(index, promise);
    }
    await loading.get(index);
  }
  const previous = dom<HTMLButtonElement>("recite-previous");
  const next = dom<HTMLButtonElement>("recite-next");
  function setPosition(index: number) {
    position = Math.min(works.length - 1, Math.max(0, index));
    dom<HTMLElement>("recite-position").textContent = (position + 1) + " / " + works.length;
    select.value = String(position);
    previous.disabled = position === 0;
    next.disabled = position === works.length - 1;
  }
  async function go(index: number, scroll = true) {
    setPosition(index);
    if (mode === "sequential") {
      works.forEach((work, i) => { work.hidden = i !== position; });
      await load(position);
      void load(position + 1);
    } else {
      works.forEach((work) => { work.hidden = false; });
      await load(position);
    }
    if (scroll) works[position].scrollIntoView({ block: "start", behavior: "auto" });
    window.dispatchEvent(new Event("basta:content-loaded"));
  }
  previous.addEventListener("click", () => { void go(position - 1); });
  next.addEventListener("click", () => { void go(position + 1); });
  select.addEventListener("change", () => { void go(Number(select.value)); });
  view.addEventListener("change", () => {
    mode = view.value === "sequential" ? "sequential" : "continuous";
    try { localStorage.setItem(viewKey, mode); } catch {}
    void go(position, false);
  });
  // Identify the programme position during manual continuous scrolling.
  let scrollPending = false;
  const updateScrollPosition = () => {
    if (scrollPending || mode !== "continuous") return;
    scrollPending = true;
    requestAnimationFrame(() => {
      scrollPending = false;
      const line = document.documentElement.dataset.readingFocus === "true"
        ? root.getBoundingClientRect().top + 135 : window.innerHeight * .3;
      let active = 0;
      for (let i = 0; i < works.length; i++) {
        if (works[i].getBoundingClientRect().top <= line) active = i;
      }
      setPosition(active);
    });
  };
  window.addEventListener("scroll", updateScrollPosition, { passive: true });
  root.addEventListener("scroll", updateScrollPosition, { passive: true });
  // Each poem is its own synchronization group, preventing cross-poem scrolling.
  initReadingControls();
  initVerseFitting();
  initSyncedColumns();
  initScanViewer();
  const obs = "IntersectionObserver" in window ? new IntersectionObserver((events) => {
    if (mode !== "continuous") return;
    for (const event of events) {
      if (event.isIntersecting) {
        const index = Number((event.target as HTMLElement).dataset.reciteIndex);
        void load(index);
      }
    }
  }, { rootMargin: "1200px 0px" }) : null;
  works.forEach((work) => obs?.observe(work));
  await go(0, false);
  if (mode === "continuous" && !obs) {
    // Browsers without IntersectionObserver still get the complete programme.
    for (let i = 1; i < works.length; i++) void load(i);
  }
}
