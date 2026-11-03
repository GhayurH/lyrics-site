// File role: Browser-side programme editor for selecting, arranging, and publishing kalams. The canonical archive is never modified.
import type { BastaStanza } from "../lib/basta-kalam-units";
import { elm, button, option, move } from "./recitation-builder-ui";
import { sourceWarnings } from "./recitation-source-validation";
import { publishSharedRecitation, updateSharedLivePosition, deleteSharedRecitation } from "./recitation-remote";
import type { RecitationDraft, RecitationItem, StanzaRef, RecitationSet } from "../lib/recitation-set";
import { catalogById, loadBasta, loadCatalog } from "./recitation-catalog";
import { renderProgrammeSequence, renderCatalogueResults, renderStanzaArrangement, renderRecitationControls, renderDraftSelector } from "./recitation-builder-view";
import { validateRecitationSet } from "../lib/recitation-set";
import { readTemplates, saveTemplate, removeTemplate, findTemplate, STARTER_TEMPLATES, materializeTemplate } from "./recitation-templates";
import {
  createLocalDraft, draftFromRemote, draftUrl, duplicateDraft,
  findRemoteDraft, publicUrl, readDrafts, removeDraft, saveDraft,
} from "./recitation-storage";

/** Own one mutable draft session; view modules receive current state and user commands, but cannot mutate stored drafts or publish. */
export async function initRecitationBuilder(): Promise<void> {
  const app = elm<HTMLElement>("recite-app");
  if (!app) return;
  const info = elm<HTMLElement>("recite-message");
  const say = (message: string) => { info.textContent = message; };
  say("Loading poetry catalog…");
  let draft: RecitationDraft;
  let arranging: string | undefined;
  let arrangementTrigger: HTMLButtonElement | undefined;
  // Keep an unfiltered catalog from overwhelming the programme workflow.
  let resultLimit = 8;
  let catalogReady = false;

  /** Save locally, then recalculate all dependent published and reader actions. */
  function persist() {
    try { saveDraft(draft); } catch (e) { say((e as Error).message); }
    renderRecitationControls(draft);
  }
  /** Switch drafts without destroying the previous draft or its private capability. */
  function setCurrent(next: RecitationDraft) {
    delete elm<HTMLDetailsElement>("recite-share-details").dataset.userToggled;
    draft = next;
    history.replaceState(null, "", draftUrl(draft.id));
    arranging = undefined;
    render();
  }
  /** Bind stateless item rows to source-preserving draft mutations. */
  function renderSequence() {
    renderProgrammeSequence(draft, {
      reorder,
      arrange(item, trigger) {
        arranging = item.uid;
        arrangementTrigger = trigger;
        // The editor follows programme order and receives focus after a direct action.
        elm<HTMLOListElement>("recite-sequence").after(elm<HTMLElement>("recite-arrangement"));
        const heading = elm<HTMLElement>("recite-arrangement-heading");
        heading.tabIndex = -1;
        heading.scrollIntoView({ block: "start" });
        heading.focus({ preventScroll: true });
        void showArrangement();
      },
      remove(item) {
        const index = draft.set.items.findIndex(candidate => candidate.uid === item.uid);
        if (index < 0) return;
        draft.set.items.splice(index, 1);
        if (arranging === item.uid) arranging = undefined;
        persist(); render();
      },
      update(item, field, value) {
        item[field] = value;
        persist();
        if (field === "reciter") renderDraftSelector(draft);
      },
    });
  }
  /** Reorder entry UIDs without modifying underlying poem identity. */
  function reorder(from: number, to: number) {
    draft.set.items = move(draft.set.items, from, to);
    persist(); renderSequence();
  }
  /** Delegate catalog display; this controller alone can add persistent entries. */
  function renderResults() {
    renderCatalogueResults(catalogById.values(), {
      query: elm<HTMLInputElement>("recite-search").value,
      source: elm<HTMLSelectElement>("recite-source").value,
      limit: resultLimit,
    }, item => {
      if (draft.set.items.length >= 40) { say("A set can contain up to 40 kalams"); return; }
      draft.set.items.push({ uid: crypto.randomUUID(), kind: item.kind, id: item.id, sourceTitle: item.title });
      persist(); renderSequence(); renderDraftSelector(draft);
      say("Added to programme: " + item.title);
    });
  }
  /** Reconcile editor fields and panels whenever a draft or catalog changes. */
  function render() {
    elm<HTMLInputElement>("recite-title").value = draft.set.title;
    elm<HTMLInputElement>("recite-occasion").value = draft.set.occasion;
    elm<HTMLTextAreaElement>("recite-description").value = draft.set.description;
    elm<HTMLInputElement>("recite-permanent").checked = draft.set.permanent === true;
    renderDraftSelector(draft); renderSequence(); renderResults(); renderRecitationControls(draft);
    if (arranging) void showArrangement();
    else elm<HTMLElement>("recite-arrangement").hidden = true;
  }
  /** Ignore stale asynchronous Marsiya responses after a selection change. */
  async function showArrangement() {
    const item = draft.set.items.find(candidate => candidate.uid === arranging);
    if (!item) { elm<HTMLElement>("recite-arrangement").hidden = true; return; }
    await renderStanzaArrangement(item, {
      current: () => arranging === item.uid,
      adjust: sequence => adjustStanza(item, sequence),
      refreshBorrow: refreshBorrowStanzas,
    });
  }
  /** Keep all custom source references intact and disallow an empty sequence. */
  function adjustStanza(item: RecitationItem, sequence: StanzaRef[]) {
    if (!sequence.length) { say("Keep at least one stanza, or use Restore original"); return; }
    item.stanzaSequence = sequence;
    persist(); renderSequence(); void showArrangement();
  }
  /** Populate only the currently selected verified borrowing source. */
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

  /** Create an independent, unprivileged programme from the template contract. */
  function startFromTemplate(samples: boolean): void {
    const template = findTemplate(elm<HTMLSelectElement>("recite-template").value);
    if (!template) return;
    if (samples && !catalogReady) { say("Poetry catalog is still loading."); return; }
    if (samples && !template.suggestedTypes?.length) {
      say("Saved templates already contain your chosen kalams; use Start from template."); return;
    }
    if ((draft.set.items.length || draft.set.title.trim()) &&
        !confirm("Create a new draft? Your existing draft stays saved separately.")) return;
    const next = createLocalDraft();
    next.set = materializeTemplate(template, samples, catalogById.values());
    setCurrent(next); persist(); render();
    say(samples ? "Added sample kalams. Review every selection before sharing." :
      "Template copied into a new draft.");
  }
  /** Reconcile built-in and user-saved choices without replacing the open draft. */
  function refreshTemplates(): void {
    const select = elm<HTMLSelectElement>("recite-template");
    const current = select.value;
    const items = [...STARTER_TEMPLATES, ...readTemplates()];
    select.replaceChildren(...items.map((entry) => option(entry.id, entry.name)));
    if (items.some((entry) => entry.id === current)) select.value = current;
    const template = findTemplate(select.value);
    elm<HTMLButtonElement>("recite-template-delete").disabled = !select.value.startsWith("saved:");
    elm<HTMLButtonElement>("recite-template-fill").disabled = !template?.suggestedTypes?.length;
    const stages = elm<HTMLElement>("recite-template-stages");
    stages.replaceChildren();
    for (const type of template?.suggestedTypes || []) {
      const choose = button("Find " + type, () => {
        elm<HTMLSelectElement>("recite-source").value = "all";
        elm<HTMLInputElement>("recite-search").value = type;
        resultLimit = 24; renderResults();
        elm<HTMLElement>("recite-find-heading").scrollIntoView({behavior:"smooth",block:"start"});
        elm<HTMLInputElement>("recite-search").focus();
      }, false, "Find kalams of type " + type);
      choose.className = "button button-secondary";
      stages.append(choose);
    }
  }
  refreshTemplates();
  elm<HTMLSelectElement>("recite-template").addEventListener("change", refreshTemplates);
  elm<HTMLButtonElement>("recite-template-use").addEventListener("click", () => startFromTemplate(false));
  elm<HTMLButtonElement>("recite-template-fill").addEventListener("click", () => startFromTemplate(true));
  elm<HTMLButtonElement>("recite-template-save").addEventListener("click", () => {
    if (!draft.set.items.length && !draft.set.title.trim()) {
      say("Add a title or a kalam first."); return;
    }
    const name = prompt("Template name:", draft.set.title || "Programme");
    if (!name?.trim()) return;
    try { saveTemplate(name.trim(), draft.set); refreshTemplates(); say("Template saved locally."); }
    catch (e) { say((e as Error).message); }
  });
  elm<HTMLButtonElement>("recite-template-delete").addEventListener("click", () => {
    const id = elm<HTMLSelectElement>("recite-template").value;
    if (!id.startsWith("saved:") || !confirm("Delete saved template?")) return;
    removeTemplate(id); refreshTemplates(); say("Template deleted.");
  });
  elm<HTMLButtonElement>("recite-show-qr").addEventListener("click", () => {
    if (!draft.remoteId) return;
    elm<HTMLImageElement>("recite-qr-image").src =
      "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
      encodeURIComponent(publicUrl(draft.remoteId));
    elm<HTMLDialogElement>("recite-qr-dialog").showModal();
  });

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
      if (!response.ok) throw Error(response.status === 410
        ? "This published programme has expired. Any locally saved copy remains available."
        : "Unable to open shared set");
      const payload = await response.json();
      const set = validateRecitationSet(payload.set);
      const existing = findRemoteDraft(requestedSet);
      draft = existing
        ? { ...existing, set, publishedSnapshot: JSON.stringify(set),
          expiresAt: payload.expiresAt ?? null, remoteRevision: payload.revision,
          ...(secret ? { editToken: secret } : {}) }
        : { ...draftFromRemote(requestedSet, set, secret),
          expiresAt: payload.expiresAt ?? null, remoteRevision: payload.revision };
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
    const item = add ? catalogById.get(add) : undefined;
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
  elm<HTMLAnchorElement>("recite-open-reader").addEventListener("click", (event) => {
    if (!draft.set.title.trim() || draft.set.items.length === 0) {
      event.preventDefault();
      say("Give your programme a title and add at least one kalam before reading.");
    }
  });
  elm<HTMLButtonElement>("recite-new").addEventListener("click", () => {
    if (elm<HTMLButtonElement>("recite-new").disabled) return;
    setCurrent(createLocalDraft()); persist(); render();
  });
  elm<HTMLButtonElement>("recite-duplicate").addEventListener("click", () => {
    if (!draft.set.items.length) return;
    setCurrent(duplicateDraft(draft)); persist(); render(); say("Saved as a separate draft");
  });
  elm<HTMLButtonElement>("recite-delete").addEventListener("click", () => {
    if (!draft.set.items.length) return;
    if (!confirm("Delete this locally saved copy? Published links will remain accessible.")) return;
    removeDraft(draft.id);
    setCurrent(readDrafts()[0] || createLocalDraft()); persist(); render();
  });
  for (const [id, field] of [
    ["recite-title", "title"], ["recite-occasion", "occasion"], ["recite-description", "description"],
  ] as const) {
    elm<HTMLInputElement | HTMLTextAreaElement>(id).addEventListener("input", (e) => {
      draft.set[field] = (e.target as HTMLInputElement).value;
      persist(); renderDraftSelector(draft);
    });
  }
  elm<HTMLInputElement>("recite-permanent").addEventListener("change", (event) => {
    if ((event.target as HTMLInputElement).checked) draft.set.permanent = true;
    else delete draft.set.permanent;
    persist();
  });
  elm<HTMLInputElement>("recite-search").addEventListener("input", () => { resultLimit = 24; renderResults(); });
  elm<HTMLSelectElement>("recite-source").addEventListener("change", () => { resultLimit = 24; renderResults(); });
  elm<HTMLButtonElement>("recite-more").addEventListener("click", () => { resultLimit += 24; renderResults(); });
  elm<HTMLButtonElement>("recite-arrangement-close").addEventListener("click", () => {
    arranging = undefined; elm<HTMLElement>("recite-arrangement").hidden = true;
    if (arrangementTrigger?.isConnected) arrangementTrigger.focus();
    arrangementTrigger = undefined;
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
  elm<HTMLButtonElement>("recite-publish").addEventListener("click", async () => {
    let clean: RecitationSet;
    try {
      // Edits can remove a formerly selected live entry. Stop broadcasting
      // rather than publish a dangling pointer into a changed programme.
      if (draft.set.live && !draft.set.items.some((item) => item.uid === draft.set.live?.currentUid))
        delete draft.set.live;
      clean = validateRecitationSet(draft.set);
    }
    catch (e) { say((e as Error).message); return; }
    const warnings = await sourceWarnings(clean);
    if (warnings.length) {
      say(warnings.join(" · "));
      if (!confirm(warnings.join("\n") +
          "\n\nPublish anyway? Missing references will be shown as warnings; they will not be removed.")) return;
    }
    const publishButton = elm<HTMLButtonElement>("recite-publish");
    publishButton.disabled = true;
    try {
      const updated = await publishSharedRecitation(draft, clean);
      elm<HTMLInputElement>("recite-permanent").checked = !!draft.set.permanent;
      persist(); renderDraftSelector(draft); renderRecitationControls(draft);
      say(updated ? "Shared programme updated. The public link is unchanged." :
        "Published. Share the read-only link with the group.");
    } catch (e) { say((e as Error).message); }
    finally { renderRecitationControls(draft); }
  });
  let updatingLive = false;
  /** Never broadcast unpublished draft changes; remote revisions guard concurrent edits. */
  async function updateLive(offset: number, active: boolean): Promise<void> {
    if (updatingLive || !draft.remoteId || !draft.editToken) return;
    if (draft.publishedSnapshot !== JSON.stringify(draft.set)) {
      say("Publish the programme changes before navigating live.");
      return;
    }
    const currentIndex = Math.max(0, draft.set.items.findIndex((item) =>
      item.uid === draft.set.live?.currentUid));
    const index = Math.min(draft.set.items.length - 1, Math.max(0, currentIndex + offset));
    const uid = draft.set.items[index]?.uid;
    if (!uid) return;
    if (!draft.remoteRevision) {
      say("Reload the shared programme before navigating live."); return;
    }
    updatingLive = true;
    for (const id of ["recite-live-prev","recite-live-next","recite-live-start","recite-live-stop"]) {
      elm<HTMLButtonElement>(id).disabled = true;
    }
    try {
      await updateSharedLivePosition(draft, uid, active);
      persist(); renderRecitationControls(draft);
    } catch (e) { say((e as Error).message); }
    finally { updatingLive = false; renderRecitationControls(draft); }
  }
  elm<HTMLButtonElement>("recite-live-start").addEventListener("click", () => { void updateLive(0, true); });
  elm<HTMLButtonElement>("recite-live-stop").addEventListener("click", () => { void updateLive(0, false); });
  elm<HTMLButtonElement>("recite-live-prev").addEventListener("click", () => { void updateLive(-1, true); });
  elm<HTMLButtonElement>("recite-live-next").addEventListener("click", () => { void updateLive(1, true); });

  elm<HTMLButtonElement>("recite-delete-published").addEventListener("click", async () => {
    if (!draft.remoteId || !draft.editToken) {
      say("Only someone with the private organizer edit link can delete this published set.");
      return;
    }
    if (!confirm("Permanently delete \"" + draft.set.title +
      "\" from Kalam Archive? The public link will stop working and the set cannot be recovered. Your local draft will also be removed.")) return;
    const button = elm<HTMLButtonElement>("recite-delete-published");
    button.disabled = true;
    try {
      await deleteSharedRecitation(draft);
      const deleted = draft.id;
      removeDraft(deleted);
      setCurrent(readDrafts()[0] || createLocalDraft());
      say("The published set was permanently deleted; its public link no longer works.");
    } catch (e) { say((e as Error).message); }
    finally { button.disabled = false; }
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
