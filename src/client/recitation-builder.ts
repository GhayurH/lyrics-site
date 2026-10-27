// Browser-only set builder. The canonical archive is never edited by an arrangement.
import type { BastaKalam, BastaStanza } from "../lib/basta-kalam-units";
import type { RecitationDraft, RecitationItem, StanzaRef, RecitationSet } from "../lib/recitation-set";
import { validateRecitationSet } from "../lib/recitation-set";
import {
  createLocalDraft, draftFromRemote, draftUrl, duplicateDraft, editorUrl,
  findRemoteDraft, publicUrl, readDrafts, readerUrl, removeDraft, saveDraft,
} from "./recitation-storage";

interface CatalogItem {
  kind: "lyric" | "basta";
  id: string;
  title: string;
  alternateTitle?: string;
  type: string;
  sourceUrl: string;
  ready: boolean;
  numbered: boolean;
}
const byId = new Map<string, CatalogItem>();
const details = new Map<string, Promise<BastaKalam>>();
const elm = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const button = (title: string, callback: () => void, disabled = false): HTMLButtonElement => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = title; b.disabled = disabled;
  b.addEventListener("click", callback);
  return b;
};
const div = (className: string, text?: string): HTMLDivElement => {
  const e = document.createElement("div"); e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};
const option = (value: string, text: string): HTMLOptionElement => new Option(text, value);
function sourceKey(kind: string, id: string): string { return kind + ":" + id; }
function getCatalog(item: RecitationItem): CatalogItem | undefined {
  return byId.get(sourceKey(item.kind, item.id));
}
async function loadCatalog(): Promise<void> {
  const responses = await Promise.all([
    fetch("/data/recitation-lyric-catalog.json"),
    fetch("/data/basta-kalams.json"),
  ]);
  if (!responses.every((r) => r.ok)) throw Error("Unable to load the poetry index");
  const [lyrics, basta] = await Promise.all(responses.map((r) => r.json()));
  if (!Array.isArray(lyrics) || !Array.isArray(basta.kalams)) throw Error("Invalid catalog");
  for (const lyric of lyrics) {
    const item: CatalogItem = {
      kind: "lyric", id: lyric.id, title: lyric.title,
      alternateTitle: lyric.alternateTitle, type: lyric.kalamType,
      sourceUrl: lyric.sourceUrl, ready: true, numbered: false,
    };
    byId.set(sourceKey(item.kind, item.id), item);
  }
  for (const kalam of basta.kalams) {
    const item: CatalogItem = {
      kind: "basta", id: kalam.id, title: kalam.name,
      alternateTitle: kalam.romanName, type: kalam.sectionRoman,
      sourceUrl: kalam.sourceUrl, ready: kalam.status === "ready",
      numbered: !!kalam.numbered && kalam.sectionRoman === "Marsiye",
    };
    byId.set(sourceKey(item.kind, item.id), item);
  }
}
async function loadBasta(id: string): Promise<BastaKalam> {
  if (!details.has(id)) {
    const request = fetch("/data/basta-kalams/" + encodeURIComponent(id) + ".json")
      .then(async (response) => {
        if (!response.ok) throw Error("Kalam source is not verified or available");
        const result = await response.json();
        if (result.kalam?.id !== id || result.kalam.status !== "ready")
          throw Error("Invalid kalam source");
        return result.kalam as BastaKalam;
      });
    details.set(id, request);
  }
  try { return await details.get(id)!; }
  catch (error) { details.delete(id); throw error; }
}
const move = <T>(items: T[], start: number, end: number): T[] => {
  const copy = items.slice();
  if (start < 0 || start >= copy.length || end < 0 || end >= copy.length) return copy;
  copy.splice(end, 0, copy.splice(start, 1)[0]);
  return copy;
};

export async function initRecitationBuilder(): Promise<void> {
  const app = elm<HTMLElement>("recite-app");
  if (!app) return;
  const info = elm<HTMLElement>("recite-message");
  const say = (message: string) => { info.textContent = message; };
  say("Loading poetry catalog…");
  let draft: RecitationDraft;
  let arranging: string | undefined;
  let resultLimit = 24;
  let catalogReady = false;
  let dragging: string | undefined;

  function persist() {
    try { saveDraft(draft); } catch (e) { say((e as Error).message); }
    updateLinks();
  }
  function setCurrent(next: RecitationDraft) {
    draft = next;
    history.replaceState(null, "", draftUrl(draft.id));
    arranging = undefined;
    render();
  }
  function updateLinks() {
    const complete = draft.set.title.trim() && draft.set.items.length;
    const read = elm<HTMLAnchorElement>("recite-open-reader");
    read.href = complete ? readerUrl(draft) : "/recite/";
    read.setAttribute("aria-disabled", String(!complete));
    read.classList.toggle("recite-link-disabled", !complete);
    const publish = elm<HTMLButtonElement>("recite-publish");
    publish.disabled = !complete;
    publish.textContent = draft.remoteId && draft.editToken ? "Update shared set" : "Publish set";
    const state = elm<HTMLElement>("recite-publish-state");
    state.textContent = draft.remoteId
      ? draft.editToken
        ? draft.publishedSnapshot === JSON.stringify(draft.set) ? "Published · Up to date" : "Unpublished changes on this device"
        : "Read-only copy · Publishing creates a new link"
      : "Not yet published";
    const shared = elm<HTMLElement>("recite-shared-links");
    shared.hidden = !draft.remoteId;
    if (draft.remoteId) {
      elm<HTMLInputElement>("recite-public-url").value = publicUrl(draft.remoteId);
      elm<HTMLInputElement>("recite-edit-url").value =
        draft.editToken ? editorUrl(draft) : "Not available on this device";
      elm<HTMLButtonElement>("recite-copy-edit").disabled = !draft.editToken;
    }
  }
  function refreshDrafts() {
    const chooser = elm<HTMLSelectElement>("recite-drafts");
    chooser.replaceChildren(...readDrafts().map((entry) =>
      option(entry.id, (entry.set.title || "Untitled set") +
        (entry.remoteId ? " · shared" : " · draft"))));
    chooser.value = draft.id;
  }
  function renderSequence() {
    const list = elm<HTMLOListElement>("recite-sequence");
    list.replaceChildren();
    elm<HTMLElement>("recite-count").textContent = draft.set.items.length +
      " kalam" + (draft.set.items.length === 1 ? "" : "s");
    elm<HTMLElement>("recite-empty").hidden = draft.set.items.length > 0;
    draft.set.items.forEach((item, index) => {
      const metadata = getCatalog(item);
      const row = document.createElement("li");
      row.className = "recite-list-row"; row.draggable = true;
      const name = div("recite-list-info");
      const strong = document.createElement("strong");
      strong.textContent = (index + 1) + ". " + (metadata?.title || item.sourceTitle || item.id);
      if (/[\u0600-\u06ff]/u.test(metadata?.title || "")) { strong.lang = "ur"; strong.dir = "rtl"; }
      name.append(strong);
      const sub = document.createElement("small");
      sub.textContent = (!metadata || !metadata.ready ? "SOURCE UNAVAILABLE — kept in programme · " : "") + (metadata?.type || item.kind) +
        (item.stanzaSequence ? " · Custom stanzas (" + item.stanzaSequence.length + ")" : "");
      name.append(sub);
      const actions = div("recite-list-actions");
      actions.append(
        button("↑", () => reorder(index, index - 1), index === 0),
        button("↓", () => reorder(index, index + 1), index === draft.set.items.length - 1),
      );
      if (metadata?.numbered) {
        actions.append(button("Arrange stanzas", () => {
          arranging = item.uid; void showArrangement();
        }));
      }
      actions.append(button("Remove", () => {
        draft.set.items.splice(index, 1); if (arranging === item.uid) arranging = undefined;
        persist(); render();
      }));
      const label = document.createElement("label");
      label.textContent = "Reciter (optional)";
      label.className = "recite-inline-note";
      const input = document.createElement("input");
      input.maxLength = 100; input.placeholder = "Assigned reciter";
      input.value = item.reciter || "";
      input.addEventListener("change", () => {
        item.reciter = input.value; persist(); refreshDrafts();
      });
      label.append(input);
      const noteLabel = document.createElement("label");
      noteLabel.textContent = "Recitation note (optional)";
      noteLabel.className = "recite-inline-note";
      const note = document.createElement("input");
      note.maxLength = 400; note.placeholder = "Optional note";
      note.value = item.note || "";
      note.addEventListener("change", () => { item.note = note.value; persist(); });
      noteLabel.append(note);
      row.append(name, actions, label, noteLabel);
      row.addEventListener("dragstart", (e) => {
        dragging = item.uid; e.dataTransfer?.setData("text/plain", item.uid);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault(); row.classList.add("recite-drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("recite-drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault(); row.classList.remove("recite-drag-over");
        const source = draft.set.items.findIndex((x) => x.uid === dragging);
        if (source >= 0) reorder(source, index);
        dragging = undefined;
      });
      row.addEventListener("dragend", () => { dragging = undefined; row.classList.remove("recite-drag-over"); });
      list.append(row);
    });
  }
  function reorder(from: number, to: number) {
    draft.set.items = move(draft.set.items, from, to);
    persist(); renderSequence();
  }
  function renderResults() {
    const query = elm<HTMLInputElement>("recite-search").value.trim().toLocaleLowerCase();
    const source = elm<HTMLSelectElement>("recite-source").value;
    const matches = Array.from(byId.values()).filter((item) => {
      if (source !== "all" && item.kind !== source) return false;
      return !query || (item.title + " " + (item.alternateTitle || "") + " " + item.type)
        .toLocaleLowerCase().includes(query);
    });
    const list = elm<HTMLUListElement>("recite-results");
    list.replaceChildren(...matches.slice(0, resultLimit).map((item) => {
      const li = document.createElement("li");
      const label = div("");
      const title = document.createElement("strong");
      const view = document.createElement("a");
      view.href = item.sourceUrl;
      view.target = "_blank"; view.rel = "noopener noreferrer";
      view.textContent = item.title;
      if (/[\u0600-\u06ff]/u.test(item.title)) { view.lang = "ur"; view.dir = "rtl"; }
      title.append(view); label.append(title);
      if (item.alternateTitle) label.append(div("recite-hint", item.alternateTitle));
      const type = document.createElement("small");
      type.textContent = (item.kind === "basta" ? "Basta · " : "Lyrics · ") + item.type +
        (!item.ready ? " · Awaiting verification" : "");
      label.append(type);
      const add = button("Add", () => {
        if (draft.set.items.length >= 40) { say("A set can contain up to 40 kalams"); return; }
        draft.set.items.push({ uid: crypto.randomUUID(), kind: item.kind, id: item.id, sourceTitle: item.title });
        persist(); renderSequence(); refreshDrafts();
        say("Added to programme: " + item.title);
      }, !item.ready);
      li.append(label, add);
      return li;
    }));
    const more = elm<HTMLButtonElement>("recite-more");
    more.hidden = resultLimit >= matches.length;
    more.textContent = "Show more (" + (matches.length - resultLimit) + " remaining)";
  }
  function render() {
    elm<HTMLInputElement>("recite-title").value = draft.set.title;
    elm<HTMLInputElement>("recite-occasion").value = draft.set.occasion;
    elm<HTMLTextAreaElement>("recite-description").value = draft.set.description;
    refreshDrafts(); renderSequence(); renderResults(); updateLinks();
    if (arranging) void showArrangement();
    else elm<HTMLElement>("recite-arrangement").hidden = true;
  }
  async function showArrangement() {
    const item = draft.set.items.find((candidate) => candidate.uid === arranging);
    const panel = elm<HTMLElement>("recite-arrangement");
    if (!item) { panel.hidden = true; return; }
    panel.hidden = false;
    elm<HTMLElement>("recite-arrangement-title").textContent =
      getCatalog(item)?.title || item.id;
    const list = elm<HTMLOListElement>("recite-stanzas");
    list.replaceChildren(div("recite-hint", "Loading numbered stanzas…"));
    try {
      const current = await loadBasta(item.id);
      if (arranging !== item.uid) return;
      if (current.sectionRoman !== "Marsiye" || !current.stanzas.length)
        throw Error("This kalam has no verified numbered stanzas");
      const sequence = item.stanzaSequence || current.stanzas.map((stanza) =>
        ({ kalamId: current.id, stanzaId: stanza.id }));
      const sources = await Promise.all(sequence.map((ref) => loadBasta(ref.kalamId).catch(() => undefined)));
      if (arranging !== item.uid) return;
      list.replaceChildren(...sequence.map((ref, index) => {
        const origin = sources[index];
        const stanza = origin?.stanzas.find((s) => s.id === ref.stanzaId);
        const li = document.createElement("li");
        li.className = "recite-list-row";
        const description = div("recite-list-info");
        const name = document.createElement("strong");
        name.textContent = (index + 1) + ". Stanza " + (stanza?.number ?? "?");
        const excerpt = document.createElement("small");
        excerpt.textContent = (origin?.name || ref.kalamId) +
          (stanza ? " · " + stanza.urdu.split("\n").find((s) => !!s.trim())?.slice(0, 80) :
            " · SOURCE UNAVAILABLE — reference preserved");
        description.append(name, excerpt);
        const actions = div("recite-list-actions");
        actions.append(
          button("↑", () => adjustStanza(item, move(sequence, index, index - 1)), index === 0),
          button("↓", () => adjustStanza(item, move(sequence, index, index + 1)), index === sequence.length - 1),
          button("Remove", () => adjustStanza(item, sequence.filter((_, pos) => pos !== index))),
        );
        li.append(description, actions);
        return li;
      }));
      const select = elm<HTMLSelectElement>("recite-borrow-kalam");
      const before = select.value || current.id;
      select.replaceChildren(...Array.from(byId.values())
        .filter((v) => v.numbered && v.ready)
        .map((v) => option(v.id, v.title)));
      select.value = Array.from(select.options).some((o) => o.value === before) ? before : current.id;
      await refreshBorrowStanzas();
    } catch (e) {
      list.replaceChildren(div("recite-hint", (e as Error).message));
    }
  }
  function adjustStanza(item: RecitationItem, sequence: StanzaRef[]) {
    if (!sequence.length) { say("Keep at least one stanza, or use Restore original"); return; }
    item.stanzaSequence = sequence;
    persist(); renderSequence(); void showArrangement();
  }
  async function refreshBorrowStanzas() {
    const select = elm<HTMLSelectElement>("recite-borrow-stanza");
    const kalamId = elm<HTMLSelectElement>("recite-borrow-kalam").value;
    select.replaceChildren();
    if (!kalamId) return;
    try {
      const poem = await loadBasta(kalamId);
      if (elm<HTMLSelectElement>("recite-borrow-kalam").value !== kalamId) return;
      select.replaceChildren(...poem.stanzas.map((s: BastaStanza) =>
        option(s.id, "Stanza " + s.number + " · " + s.urdu.split("\n")[0].slice(0, 50))));
    } catch (e) { say((e as Error).message); }
  }

  // Initialize local drafts before waiting for source catalogs.
  const drafts = readDrafts();
  draft = drafts[0] || createLocalDraft();
  const params = new URLSearchParams(location.search);
  const requestedDraft = params.get("draft");
  const requestedSet = params.get("set");
  const secret = location.hash.startsWith("#edit=")
    ? decodeURIComponent(location.hash.slice(6)) : undefined;
  if (secret) history.replaceState(null, "", location.pathname + location.search);
  if (requestedDraft) draft = drafts.find((entry) => entry.id === requestedDraft) || draft;
  if (requestedSet && /^[a-f0-9]{24}$/.test(requestedSet)) {
    try {
      const response = await fetch("/api/recitation-sets/" + requestedSet);
      if (!response.ok) throw Error("Unable to open shared set");
      const payload = await response.json();
      const set = validateRecitationSet(payload.set);
      const existing = findRemoteDraft(requestedSet);
      draft = existing
        ? { ...existing, set, publishedSnapshot: JSON.stringify(set),
          ...(secret ? { editToken: secret } : {}) }
        : draftFromRemote(requestedSet, set, secret);
      saveDraft(draft);
      say("Shared programme loaded");
    } catch (e) { say((e as Error).message); }
  }
  render();
  try {
    await loadCatalog(); catalogReady = true;
  } catch (e) { say((e as Error).message); }
  render();
  if (catalogReady && info.textContent === "Loading poetry catalog…") say("");
  if (catalogReady) {
    const add = params.get("add");
    const item = add && byId.get(add);
    if (item?.ready && draft.set.items.length < 40) {
      draft.set.items.push({ uid: crypto.randomUUID(), kind: item.kind, id: item.id, sourceTitle: item.title });
      persist(); render(); say("Added " + item.title);
      history.replaceState(null, "", draftUrl(draft.id));
    }
  }
  elm<HTMLSelectElement>("recite-drafts").addEventListener("change", (e) => {
    const selected = readDrafts().find((item) => item.id === (e.target as HTMLSelectElement).value);
    if (selected) setCurrent(selected);
  });
  elm<HTMLButtonElement>("recite-new").addEventListener("click", () => {
    setCurrent(createLocalDraft()); persist(); render();
  });
  elm<HTMLButtonElement>("recite-duplicate").addEventListener("click", () => {
    setCurrent(duplicateDraft(draft)); persist(); render(); say("Saved as a separate draft");
  });
  elm<HTMLButtonElement>("recite-delete").addEventListener("click", () => {
    if (!confirm("Delete this locally saved copy? Published links will remain accessible.")) return;
    removeDraft(draft.id);
    setCurrent(readDrafts()[0] || createLocalDraft()); persist(); render();
  });
  for (const [id, field] of [
    ["recite-title", "title"], ["recite-occasion", "occasion"], ["recite-description", "description"],
  ] as const) {
    elm<HTMLInputElement | HTMLTextAreaElement>(id).addEventListener("input", (e) => {
      draft.set[field] = (e.target as HTMLInputElement).value;
      persist(); refreshDrafts();
    });
  }
  elm<HTMLInputElement>("recite-search").addEventListener("input", () => { resultLimit = 24; renderResults(); });
  elm<HTMLSelectElement>("recite-source").addEventListener("change", () => { resultLimit = 24; renderResults(); });
  elm<HTMLButtonElement>("recite-more").addEventListener("click", () => { resultLimit += 24; renderResults(); });
  elm<HTMLButtonElement>("recite-arrangement-close").addEventListener("click", () => {
    arranging = undefined; elm<HTMLElement>("recite-arrangement").hidden = true;
  });
  elm<HTMLSelectElement>("recite-borrow-kalam").addEventListener("change", () => { void refreshBorrowStanzas(); });
  elm<HTMLButtonElement>("recite-borrow-add").addEventListener("click", () => {
    const item = draft.set.items.find((x) => x.uid === arranging);
    if (!item) return;
    const ref = {
      kalamId: elm<HTMLSelectElement>("recite-borrow-kalam").value,
      stanzaId: elm<HTMLSelectElement>("recite-borrow-stanza").value,
    };
    if (!ref.kalamId || !ref.stanzaId) return;
    void loadBasta(item.id).then((poem) => {
      const original = poem.stanzas.map((s) => ({ kalamId: poem.id, stanzaId: s.id }));
      adjustStanza(item, [...(item.stanzaSequence || original), ref]);
    }).catch((e) => say((e as Error).message));
  });
  elm<HTMLButtonElement>("recite-stanza-original").addEventListener("click", () => {
    const item = draft.set.items.find((x) => x.uid === arranging);
    if (!item) return;
    delete item.stanzaSequence;
    persist(); renderSequence(); void showArrangement();
  });
  async function sourceWarnings(set: RecitationSet): Promise<string[]> {
    const warnings: string[] = [];
    for (const item of set.items) {
      const source = getCatalog(item);
      if (!source?.ready) {
        warnings.push("Unavailable kalam: " + (item.sourceTitle || item.id));
        continue;
      }
      for (const ref of item.stanzaSequence || []) {
        try {
          const poem = await loadBasta(ref.kalamId);
          if (!poem.stanzas.some((stanza) => stanza.id === ref.stanzaId)) {
            warnings.push("Missing stanza: " + ref.kalamId + " / " + ref.stanzaId);
          }
        } catch {
          warnings.push("Unavailable stanza source: " + ref.kalamId);
        }
      }
    }
    return [...new Set(warnings)];
  }
  elm<HTMLButtonElement>("recite-publish").addEventListener("click", async () => {
    let clean: RecitationSet;
    try { clean = validateRecitationSet(draft.set); }
    catch (e) { say((e as Error).message); return; }
    const warnings = await sourceWarnings(clean);
    if (warnings.length) {
      say(warnings.join(" · "));
      if (!confirm(warnings.join("\n") +
          "\n\nPublish anyway? Missing references will be shown as warnings; they will not be removed.")) return;
    }
    // New publication never overwrites a remote set without its edit capability.
    const update = !!draft.remoteId && !!draft.editToken;
    const url = update
      ? "/api/recitation-sets/" + draft.remoteId
      : "/api/recitation-sets/";
    const publishButton = elm<HTMLButtonElement>("recite-publish");
    publishButton.disabled = true;
    try {
      const response = await fetch(url, {
        method: update ? "PUT" : "POST",
        headers: { "Content-Type": "application/json",
          ...(update ? { Authorization: "Bearer " + draft.editToken } : {}) },
        body: JSON.stringify(clean),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Publishing failed");
      draft.set = clean;
      if (!update) {
        draft.remoteId = result.id;
        draft.editToken = result.editToken;
      }
      draft.publishedSnapshot = JSON.stringify(clean);
      persist(); refreshDrafts(); updateLinks();
      say(update ? "Shared programme updated. The public link is unchanged." :
        "Published. Share the read-only link with the group.");
    } catch (e) { say((e as Error).message); }
    finally { publishButton.disabled = false; }
  });
  for (const [buttonId, inputId] of [
    ["recite-copy-public", "recite-public-url"],
    ["recite-copy-edit", "recite-edit-url"],
  ]) {
    elm<HTMLButtonElement>(buttonId).addEventListener("click", async () => {
      const value = elm<HTMLInputElement>(inputId).value;
      try { await navigator.clipboard.writeText(value); say("Link copied"); }
      catch { elm<HTMLInputElement>(inputId).select(); say("Select and copy the highlighted link"); }
    });
  }
  app.inert = false;

}
