// File role: Saved/Recent page controller: resolves browser-local IDs against the static catalog and renders canonical lyric cards on demand.
import type { LyricCardData } from "../lib/catalog";
import { createLyricCard } from "./lyric-card";
import { readBastaBookmarks } from "./basta-bookmarks";
import { readBastaSelections, removeBastaSelection } from "./basta-selections";
import { readDrafts } from "./recitation-storage";
import {
  STORAGE_KEYS,
  clearFavorites,
  clearRecent,
  readFavoriteIds,
  readStringList,
  writeStringList,
} from "./storage";

export async function initSavedLibrary(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#saved-library");
  if (!root || root.dataset.savedReady === "true") return;
  root.dataset.savedReady = "true";

  // Personal bookmarks and programmes work even if the lyric catalog fails.
  const renderLocal = () => {
    const bookmarks = readBastaBookmarks();
    const pageList = document.querySelector<HTMLElement>("#basta-bookmarks-list");
    pageList?.replaceChildren(...bookmarks.map((page) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "/basta/" + page + "/";
      link.textContent = "Basta · Page " + page;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove bookmark for Basta page " + page);
      remove.addEventListener("click", () => {
        writeStringList(STORAGE_KEYS.bastaBookmarks, readBastaBookmarks().filter((n) => n !== page).map(String));
        renderLocal();
      });
      item.append(link, remove);
      return item;
    }));
    const pageEmpty = document.querySelector<HTMLElement>("#basta-bookmarks-empty");
    if (pageEmpty) pageEmpty.hidden = bookmarks.length > 0;
    const pageCount = document.querySelector<HTMLElement>("#basta-bookmarks-count");
    if (pageCount) pageCount.textContent = bookmarks.length + " saved";

    const selections = readBastaSelections();
    const selectionList = document.querySelector<HTMLElement>("#basta-selections-list");
    selectionList?.replaceChildren(...selections.map((value) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "/basta/" + value.page + "/#basta-" + value.kind + "-" + value.index;
      link.textContent = "Basta · Page " + value.page + " · " +
        (value.kind === "stanza" ? "Stanza " : "Kalam ") + value.index;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove bookmark for " + link.textContent);
      remove.addEventListener("click", () => { removeBastaSelection(value); renderLocal(); });
      item.append(link, remove);
      return item;
    }));
    const selectionEmpty = document.querySelector<HTMLElement>("#basta-selections-empty");
    if (selectionEmpty) selectionEmpty.hidden = selections.length > 0;
    const selectionCount = document.querySelector<HTMLElement>("#basta-selections-count");
    if (selectionCount) selectionCount.textContent = selections.length + " saved";

    const drafts = readDrafts().filter((draft) => draft.set.title.trim() || draft.set.items.length);
    const draftList = document.querySelector<HTMLElement>("#recitation-drafts-list");
    draftList?.replaceChildren(...drafts.map((draft) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "/recite/?draft=" + encodeURIComponent(draft.id);
      link.textContent = draft.set.title.trim() || "Untitled programme";
      const details = document.createElement("span");
      details.textContent = draft.set.items.length + " kalam" + (draft.set.items.length === 1 ? "" : "s");
      item.append(link, details);
      return item;
    }));
    const draftsEmpty = document.querySelector<HTMLElement>("#recitation-drafts-empty");
    if (draftsEmpty) draftsEmpty.hidden = drafts.length > 0;
    const draftCount = document.querySelector<HTMLElement>("#recitation-drafts-count");
    if (draftCount) draftCount.textContent = drafts.length + " saved";
  };
  renderLocal();
  window.addEventListener("kalam:basta-bookmarks-changed", renderLocal);
  window.addEventListener("kalam:basta-selections-changed", renderLocal);
  window.addEventListener("storage", renderLocal);
  let catalog: LyricCardData[];
  try {
    const response = await fetch("/data/saved-catalog.json");
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
    const parsed: unknown = await response.json();
    if (!Array.isArray(parsed)) throw new Error("Catalog response is not an array");
    catalog = parsed as LyricCardData[];
  } catch (error) {
    console.error(error);
    const loadError = document.querySelector<HTMLElement>("#saved-load-error");
    if (loadError) loadError.hidden = false;
    return;
  }

  const byId = new Map(catalog.map((entry) => [entry.id, entry]));
  const favoritesList = document.querySelector<HTMLUListElement>("#favorites-list");
  const recentList = document.querySelector<HTMLUListElement>("#recent-list");
  const favoritesEmpty = document.querySelector<HTMLElement>("#favorites-empty");
  const recentEmpty = document.querySelector<HTMLElement>("#recent-empty");
  const favoritesCount = document.querySelector<HTMLElement>("#favorites-count");
  const recentCount = document.querySelector<HTMLElement>("#recent-count");

  const resolve = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((entry): entry is LyricCardData => Boolean(entry));

  function render(): void {
    const favoriteEntries = resolve(readFavoriteIds());
    const recentEntries = resolve(readStringList(STORAGE_KEYS.recent));

    favoritesList?.replaceChildren(
      ...favoriteEntries.map((entry) => createLyricCard(entry)),
    );
    recentList?.replaceChildren(
      ...recentEntries.map((entry) => createLyricCard(entry)),
    );

    if (favoritesEmpty) favoritesEmpty.hidden = favoriteEntries.length > 0;
    if (recentEmpty) recentEmpty.hidden = recentEntries.length > 0;
    if (favoritesCount) favoritesCount.textContent = `${favoriteEntries.length} saved`;
    if (recentCount) recentCount.textContent = `${recentEntries.length} recent`;

    // Cards were inserted after the global favorite controller initialized.
    window.dispatchEvent(new CustomEvent("kalam:cards-rendered"));
  }

  document.querySelector("#clear-favorites")?.addEventListener("click", () => {
    clearFavorites();
    window.dispatchEvent(
      new CustomEvent("kalam:favorites-changed", { detail: { favorites: [] } }),
    );
    render();
  });

  document.querySelector("#clear-recent")?.addEventListener("click", () => {
    clearRecent();
    render();
  });

  window.addEventListener("kalam:favorites-changed", render);
  window.addEventListener("kalam:recent-changed", render);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.favorites || event.key === STORAGE_KEYS.recent) {
      render();
    }
  });

  render();
}
