import { isMobileViewport } from "./viewport";
// File role: Browser-side programme reader; load canonical verses on demand while keeping programme order separate from source text.
import { validateRecitationSet, type RecitationSet } from "../lib/recitation-set";
import { node, resolvedPoems, renderWork } from "./recitation-reader-view";
import { readDrafts } from "./recitation-storage";
import { initReadingControls } from "./reader-state";
import { initVerseFitting } from "./verse-fitting";
import { initSyncedColumns } from "./synced-columns";
import { initScanViewer } from "./scan-viewer";
import { programmeHtml, downloadProgramme } from "./recitation-export";

const viewKey = "kalam:recitation-view";
const dom = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
async function readSet(): Promise<{ set: RecitationSet; local: boolean; draftId?: string }> {
  const params = new URLSearchParams(location.search);
  const remote = params.get("set");
  const local = params.get("draft");
  if (remote) {
    if (!/^[a-f0-9]{24}$/.test(remote)) throw Error("Invalid shared link");
    const response = await fetch("/api/recitation-sets/" + remote);
    if (!response.ok) throw Error(response.status === 503
      ? "This deployment has no D1 binding configured"
      : response.status === 410 ? "This published programme has expired."
      : "Shared programme unavailable");
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
  try {
    const storedView = localStorage.getItem(viewKey);
    if (storedView === "sequential" || storedView === "continuous") mode = storedView;
    else if (isMobileViewport()) mode = "sequential";
  } catch {
    if (isMobileViewport()) mode = "sequential";
  }
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
  // Build complete snapshots only when requested, never during normal
  // streaming/lazy reading. Batches avoid a burst of 40 network requests.
  async function loadAll(): Promise<void> {
    for (let index = 0; index < works.length; index += 4) {
      await Promise.all(works.slice(index, index + 4).map((_, offset) => load(index + offset)));
    }
  }
  const exportMessage = dom<HTMLElement>("recite-export-status");
  const offlineButton = dom<HTMLButtonElement>("recite-download-offline");
  const printButton = dom<HTMLButtonElement>("recite-print");
  let exporting = false;
  async function snapshot(): Promise<string> {
    if (exporting) throw Error("An export is already in progress");
    exporting = true;
    offlineButton.disabled = printButton.disabled = true;
    exportMessage.textContent = "Preparing all programme kalams…";
    try {
      await loadAll();
      return programmeHtml(set, works);
    } finally {
      exporting = false;
      offlineButton.disabled = printButton.disabled = false;
    }
  }
  offlineButton.addEventListener("click", async () => {
    try {
      const html = await snapshot();
      downloadProgramme(html, set.title);
      exportMessage.textContent = "Offline HTML saved. Open it without internet; scans are not included.";
    } catch (e) { exportMessage.textContent = (e as Error).message; }
  });
  printButton.addEventListener("click", async () => {
    // Open the tab directly from the click event, before asynchronous loading;
    // otherwise most browsers block the print preview as a popup.
    const tab = window.open("", "_blank");
    if (!tab) {
      exportMessage.textContent = "Allow the print tab, then try again.";
      return;
    }
    try {
      const html = await snapshot();
      // Preserve the complete standalone document (including its doctype)
      // without the deprecated document.write API.
      const snapshotDocument = new DOMParser().parseFromString(html, "text/html");
      tab.document.replaceChildren(
        tab.document.importNode(snapshotDocument.doctype!, true),
        tab.document.importNode(snapshotDocument.documentElement, true),
      );
      // Printing before the embedded Nastaliq faces load causes silent fallback
      // to Naskh, even though the HTML declares the right font.
      await tab.document.fonts.ready;
      tab.focus();
      tab.print(); // Browser print dialog also offers Save as PDF.
      exportMessage.textContent = "Print preview opened. Choose Save as PDF to export a PDF.";
    } catch (e) {
      tab.close();
      exportMessage.textContent = (e as Error).message;
    }
  });
  const previous = dom<HTMLButtonElement>("recite-previous");
  const next = dom<HTMLButtonElement>("recite-next");
  const followLabel = dom<HTMLLabelElement>("recite-live-label");
  const follow = dom<HTMLInputElement>("recite-follow-live");
  const liveStatus = dom<HTMLElement>("recite-live-status");
  followLabel.hidden = !remoteId;
  let following = false;
  let livePolling = false;
  async function pollLive(): Promise<void> {
    if (!following || !remoteId || livePolling || document.hidden || !page.isConnected) return;
    livePolling = true;
    try {
      const response = await fetch("/api/recitation-sets/" + remoteId, { cache: "no-store" });
      if (!response.ok) throw Error("Unable to retrieve organizer's live position");
      const data = await response.json();
      const current = validateRecitationSet(data.set).live;
      if (!following) return;
      if (!current?.active) {
        liveStatus.textContent = "Organizer is not broadcasting a position.";
      } else {
        const nextIndex = set.items.findIndex((item) => item.uid === current.currentUid);
        if (nextIndex < 0) {
          liveStatus.textContent = "Programme changed. Reload this reader to follow it.";
        } else {
          liveStatus.textContent = "Following organizer · kalam " + (nextIndex + 1);
          if (nextIndex !== position) await go(nextIndex);
        }
      }
    } catch (e) { liveStatus.textContent = (e as Error).message; }
    finally { livePolling = false; }
  }
  follow.addEventListener("change", () => {
    following = follow.checked;
    liveStatus.textContent = following ? "Checking organizer's position…" : "Live following off.";
    if (following) void pollLive();
  });
  // Only consenting participants poll; hidden pages do not generate traffic.
  window.setInterval(() => { if (following) void pollLive(); }, 10000);
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
  const leaveLive = () => {
    if (following) {
      following = false; follow.checked = false;
      liveStatus.textContent = "Manual navigation: live following paused.";
    }
  };
  previous.addEventListener("click", () => { leaveLive(); void go(position - 1); });
  next.addEventListener("click", () => { leaveLive(); void go(position + 1); });
  select.addEventListener("change", () => { leaveLive(); void go(Number(select.value)); });
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
