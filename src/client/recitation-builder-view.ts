// Rendering owns transient programme and stanza DOM; the builder controller owns
// selection, draft persistence, publication and user-initiated state transitions.
import type { RecitationDraft, RecitationItem, StanzaRef } from "../lib/recitation-set";
import { type CatalogItem, getCatalog, catalogById, loadBasta } from "./recitation-catalog";
import { elm, button, div, option, move } from "./recitation-builder-ui";
import { node } from "./dom";
import { editorUrl, publicUrl, readDrafts, readerUrl } from "./recitation-storage";

/** Derive share, expiry, live and disabled controls from a single draft snapshot. */
export function renderRecitationControls(draft: RecitationDraft): void {
  const hasTitle = !!draft.set.title.trim();
  const hasKalams = draft.set.items.length > 0;
  const complete = hasTitle && hasKalams;
  const sharePanel = document.querySelector<HTMLElement>(".recite-share");
  if (sharePanel) sharePanel.dataset.ready = String(complete);
  const shareDetails = elm<HTMLDetailsElement>("recite-share-details");
  // Manual disclosure choices are respected until another draft is selected.
  if (!shareDetails.dataset.userToggled) shareDetails.open = complete || Boolean(draft.remoteId);
  for (const [stage, available] of [["plan", true], ["find", true], ["share", complete]] as const) {
    const link = document.querySelector<HTMLAnchorElement>(`.recite-steps [data-recite-step="${stage}"]`);
    if (link) link.dataset.stageReady = String(available);
  }
  // A fresh blank draft already exists; avoid creating or copying empty
  // entries that all appear identical in the set picker.
  const hasDraftContent = hasTitle || hasKalams ||
    !!draft.set.occasion.trim() || !!draft.set.description.trim();
  elm<HTMLButtonElement>("recite-new").disabled = !hasDraftContent;
  elm<HTMLButtonElement>("recite-duplicate").disabled = !hasKalams;
  elm<HTMLButtonElement>("recite-delete").disabled = !hasKalams;
  const read = elm<HTMLAnchorElement>("recite-open-reader");
  read.href = complete ? readerUrl(draft) : "/recite/";
  read.setAttribute("aria-disabled", String(!complete));
  read.title = complete ? "Open this programme for reading" : (!hasTitle ? "Give your set a title before reading" : "Add a kalam before reading");
  read.classList.toggle("recite-link-disabled", !complete);
  const publish = elm<HTMLButtonElement>("recite-publish");
  publish.disabled = !complete;
  publish.textContent = draft.remoteId && draft.editToken ? "Update shared set" : "Publish set";
  const reason = !hasTitle && !hasKalams
    ? "Give your set a title and add at least one kalam to publish."
    : !hasTitle ? "Give your set a title to publish."
    : !hasKalams ? "Add at least one kalam to publish." : "";
  const publishWrapper = elm<HTMLElement>("recite-publish-control");
  publishWrapper.dataset.unavailable = String(!complete);
  publishWrapper.dataset.reason = reason;
  publishWrapper.tabIndex = complete ? -1 : 0;
  elm<HTMLElement>("recite-publish-help").textContent = reason;
  const state = elm<HTMLElement>("recite-publish-state");
  state.textContent = draft.remoteId
    ? draft.editToken
      ? draft.publishedSnapshot === JSON.stringify(draft.set) ? "Shared · Up to date" : "You have changes to share"
      : "You can publish your own copy"
    : "Not shared yet";
  const expiry = elm<HTMLElement>("recite-expiration");
  const published = draft.remoteId && draft.publishedSnapshot === JSON.stringify(draft.set);
  expiry.textContent = !draft.remoteId
    ? "Your draft is saved on this device. Share it when you are ready."
    : !published ? "Publish again to share your latest changes."
    : draft.set.permanent ? "Your shared programme stays available until you delete it."
    : draft.expiresAt ? "Your sharing link is available until " +
      new Date(draft.expiresAt).toLocaleDateString() + ". Updating the programme extends this date."
    : "Your sharing link follows the usual two-year expiry period.";
  const deletePublished = elm<HTMLButtonElement>("recite-delete-published");
  deletePublished.hidden = !(draft.remoteId && draft.editToken);
  const shared = elm<HTMLElement>("recite-shared-links");
  shared.hidden = !draft.remoteId;
  const liveControls = elm<HTMLElement>("recite-live-controls");
  liveControls.hidden = !(draft.remoteId && draft.editToken);
  const liveIndex = Math.max(0, draft.set.items.findIndex((item) =>
    item.uid === draft.set.live?.currentUid));
  const synced = !!draft.remoteId && !!draft.editToken &&
    draft.publishedSnapshot === JSON.stringify(draft.set);
  const liveActive = draft.set.live?.active === true;
  elm<HTMLElement>("recite-live-position").textContent = draft.set.items.length
    ? "Kalam " + (liveIndex + 1) + " / " + draft.set.items.length + (liveActive ? " · Live" : " · Stopped")
    : "No kalams";
  for (const id of ["recite-live-prev", "recite-live-next", "recite-live-start", "recite-live-stop"]) {
    elm<HTMLButtonElement>(id).disabled = !synced || !draft.set.items.length;
  }
  elm<HTMLButtonElement>("recite-live-prev").disabled ||= liveIndex === 0;
  elm<HTMLButtonElement>("recite-live-next").disabled ||= liveIndex >= draft.set.items.length - 1;
  elm<HTMLButtonElement>("recite-live-start").disabled ||= liveActive;
  elm<HTMLButtonElement>("recite-live-stop").disabled ||= !liveActive;
  elm<HTMLElement>("recite-live-message").textContent = !draft.remoteId ? ""
    : !synced ? "Publish your programme changes before controlling the live position."
    : liveActive ? "Broadcasting the selected kalam to participants who opted in."
    : "Live following is stopped.";
  elm<HTMLButtonElement>("recite-show-qr").hidden = !draft.remoteId;
  if (draft.remoteId) {
    elm<HTMLInputElement>("recite-public-url").value = publicUrl(draft.remoteId);
    elm<HTMLInputElement>("recite-edit-url").value =
      draft.editToken ? editorUrl(draft) : "Not available on this device";
    elm<HTMLButtonElement>("recite-copy-edit").disabled = !draft.editToken;
    elm<HTMLButtonElement>("recite-show-qr").hidden = false;
  }
}

/** Preserve selected identity while rebuilding the local-draft chooser. */
export function renderDraftSelector(draft: RecitationDraft): void {
  const chooser = elm<HTMLSelectElement>("recite-drafts");
  chooser.replaceChildren(...readDrafts().map((entry) =>
    option(entry.id, (entry.set.title || "Untitled set") +
      (entry.remoteId ? " · shared" : " · draft"))));
  chooser.value = draft.id;
}

export interface SequenceHandlers {
  reorder(from: number, to: number): void;
  arrange(item: RecitationItem, trigger: HTMLButtonElement): void;
  remove(item: RecitationItem): void;
  update(item: RecitationItem, field: "reciter" | "note", value: string): void;
}

/** Render one programme sequence from the currently selected local draft. */
export function renderProgrammeSequence(draft: RecitationDraft, handlers: SequenceHandlers): void {
  // A fresh row represents the persisted programme order, never mutable catalog data.
  let dragging: string | undefined;
  const list = elm<HTMLOListElement>("recite-sequence");
  list.replaceChildren();
  elm<HTMLElement>("recite-count").textContent = draft.set.items.length +
    " kalam" + (draft.set.items.length === 1 ? "" : "s");
  elm<HTMLElement>("recite-empty").hidden = draft.set.items.length > 0;
  const programmePanel = document.querySelector<HTMLElement>(".recite-programme");
  if (programmePanel) programmePanel.dataset.empty = String(draft.set.items.length === 0);
  draft.set.items.forEach((item, index) => {
    const metadata = getCatalog(item);
    const row = node("li");
    row.className = "recite-list-row"; row.draggable = true;
    const name = div("recite-list-info");
    const strong = node("strong");
    const itemTitle = metadata?.title || item.sourceTitle || item.id;
    strong.textContent = (index + 1) + ". " + itemTitle;
    if (/[\u0600-\u06ff]/u.test(metadata?.title || "")) { strong.lang = "ur"; strong.dir = "rtl"; }
    name.append(strong);
    const sub = node("small");
    sub.textContent = (!metadata || !metadata.ready ? "SOURCE UNAVAILABLE — kept in programme · " : "") +
      (metadata?.type === "Marsiye" ? "Marsiya" : metadata?.type || item.kind) +
      (item.stanzaSequence ? " · Custom stanzas (" + item.stanzaSequence.length + ")" : "");
    name.append(sub);
    const actions = div("recite-list-actions");
    actions.append(
      button("↑", () => handlers.reorder(index, index - 1), index === 0, `Move ${itemTitle} up`),
      button("↓", () => handlers.reorder(index, index + 1), index === draft.set.items.length - 1, `Move ${itemTitle} down`),
    );
    if (metadata?.numbered) {
      const arrange = button("Arrange stanzas", () => {
        handlers.arrange(item, arrange);
      }, false, `Arrange stanzas for ${itemTitle}`);
      actions.append(arrange);
    }
    actions.append(button("Remove", () => {
      handlers.remove(item);
    }, false, `Remove ${itemTitle} from programme`));
    const label = node("label");
    label.textContent = "Reciter for " + itemTitle + " (optional)";
    label.className = "recite-inline-note";
    const input = node("input");
    input.maxLength = 100; input.placeholder = "Assigned reciter";
    input.value = item.reciter || "";
    input.addEventListener("change", () => {
      handlers.update(item, "reciter", input.value);
    });
    label.append(input);
    const noteLabel = node("label");
    noteLabel.textContent = "Note for " + itemTitle + " (optional)";
    noteLabel.className = "recite-inline-note";
    const note = node("input");
    note.maxLength = 400; note.placeholder = "Optional note";
    note.value = item.note || "";
    note.addEventListener("change", () => handlers.update(item, "note", note.value));
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
      if (source >= 0) handlers.reorder(source, index);
      dragging = undefined;
    });
    row.addEventListener("dragend", () => { dragging = undefined; row.classList.remove("recite-drag-over"); });
    list.append(row);
  });
}

/** Search the unified verified-source catalog without changing persistent IDs. */
export function renderCatalogueResults(
  items: Iterable<CatalogItem>, criteria: { query: string; source: string; limit: number },
  onAdd: (item: CatalogItem) => void,
): void {
  const query = criteria.query.trim().toLocaleLowerCase();
  const source = criteria.source;
  const matches = Array.from(items).filter((item) => {
    if (source !== "all" && item.kind !== source) return false;
    return !query || (item.title + " " + (item.alternateTitle || "") + " " + item.type)
      .toLocaleLowerCase().includes(query);
  });
  const list = elm<HTMLUListElement>("recite-results");
  list.replaceChildren(...matches.slice(0, criteria.limit).map((item) => {
    const li = node("li");
    const label = div("");
    const title = node("strong");
    const view = node("a");
    view.href = item.sourceUrl;
    view.target = "_blank"; view.rel = "noopener noreferrer";
    view.textContent = item.title;
    if (/[\u0600-\u06ff]/u.test(item.title)) { view.lang = "ur"; view.dir = "rtl"; }
    title.append(view); label.append(title);
    if (item.alternateTitle) label.append(div("recite-hint", item.alternateTitle));
    const type = node("small");
    type.textContent = (item.kind === "basta" ? "Basta · " : "Lyrics · ") + item.type +
      (!item.ready ? " · Awaiting verification" : "");
    label.append(type);
    const add = button("Add", () => {
      onAdd(item);
    }, !item.ready);
    li.append(label, add);
    return li;
  }));
  const more = elm<HTMLButtonElement>("recite-more");
  const remaining = Math.max(0, matches.length - criteria.limit);
  more.hidden = remaining === 0;
  more.disabled = remaining === 0;
  more.textContent = remaining ? `Show more (${remaining} remaining)` : "All matching kalams shown";
}

/** Render verified Marsiya units. Async completions never replace a different selection. */
export async function renderStanzaArrangement(
  item: RecitationItem,
  handlers: { current: () => boolean; adjust: (sequence: StanzaRef[]) => void; refreshBorrow: () => Promise<void> },
): Promise<void> {
  const panel = elm<HTMLElement>("recite-arrangement");
  panel.hidden = false;
  elm<HTMLElement>("recite-arrangement-title").textContent =
    getCatalog(item)?.title || item.id;
  const list = elm<HTMLOListElement>("recite-stanzas");
  list.replaceChildren(div("recite-hint", "Loading numbered stanzas…"));
  try {
    const current = await loadBasta(item.id);
    if (!handlers.current()) return;
    if (current.sectionRoman !== "Marsiye" || !current.stanzas.length)
      throw Error("This kalam has no verified numbered stanzas");
    const sequence = item.stanzaSequence || current.stanzas.map((stanza) =>
      ({ kalamId: current.id, stanzaId: stanza.id }));
    const sources = await Promise.all(sequence.map((ref) => loadBasta(ref.kalamId).catch(() => undefined)));
    if (!handlers.current()) return;
    list.replaceChildren(...sequence.map((ref, index) => {
      const origin = sources[index];
      const stanza = origin?.stanzas.find((s) => s.id === ref.stanzaId);
      const li = node("li");
      li.className = "recite-list-row";
      const description = div("recite-list-info");
      const name = node("strong");
      name.textContent = (index + 1) + ". Stanza " + (stanza?.number ?? "?");
      const excerpt = node("small");
      excerpt.textContent = (origin?.name || ref.kalamId) +
        (stanza ? " · " + stanza.urdu.split("\n").find((s) => !!s.trim())?.slice(0, 80) :
          " · SOURCE UNAVAILABLE — reference preserved");
      description.append(name, excerpt);
      const actions = div("recite-list-actions");
      actions.append(
        button("↑", () => handlers.adjust(move(sequence, index, index - 1)), index === 0, `Move stanza ${stanza?.number ?? index + 1} up`),
        button("↓", () => handlers.adjust(move(sequence, index, index + 1)), index === sequence.length - 1, `Move stanza ${stanza?.number ?? index + 1} down`),
        button("Remove", () => handlers.adjust(sequence.filter((_, pos) => pos !== index)), false, `Remove stanza ${stanza?.number ?? index + 1}`),
      );
      li.append(description, actions);
      return li;
    }));
    const select = elm<HTMLSelectElement>("recite-borrow-kalam");
    const before = select.value || current.id;
    select.replaceChildren(...Array.from(catalogById.values())
      .filter((v) => v.numbered && v.ready)
      .map((v) => option(v.id, v.title)));
    select.value = Array.from(select.options).some((o) => o.value === before) ? before : current.id;
    await handlers.refreshBorrow();
  } catch (e) {
    list.replaceChildren(div("recite-hint", (e as Error).message));
  }
}
