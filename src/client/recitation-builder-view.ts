// Rendering owns transient programme and stanza DOM; the builder controller owns
// selection, draft persistence, publication and user-initiated state transitions.
import type { RecitationDraft, RecitationItem, StanzaRef } from "../lib/recitation-set";
import { type CatalogItem, getCatalog, catalogById, loadBasta } from "./recitation-catalog";
import { elm, button, div, option, move } from "./recitation-builder-ui";

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
      const row = document.createElement("li");
      row.className = "recite-list-row"; row.draggable = true;
      const name = div("recite-list-info");
      const strong = document.createElement("strong");
      const itemTitle = metadata?.title || item.sourceTitle || item.id;
      strong.textContent = (index + 1) + ". " + itemTitle;
      if (/[\u0600-\u06ff]/u.test(metadata?.title || "")) { strong.lang = "ur"; strong.dir = "rtl"; }
      name.append(strong);
      const sub = document.createElement("small");
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
      const label = document.createElement("label");
      label.textContent = "Reciter for " + itemTitle + " (optional)";
      label.className = "recite-inline-note";
      const input = document.createElement("input");
      input.maxLength = 100; input.placeholder = "Assigned reciter";
      input.value = item.reciter || "";
      input.addEventListener("change", () => {
        handlers.update(item, "reciter", input.value);
      });
      label.append(input);
      const noteLabel = document.createElement("label");
      noteLabel.textContent = "Note for " + itemTitle + " (optional)";
      noteLabel.className = "recite-inline-note";
      const note = document.createElement("input");
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
