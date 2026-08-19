// File role: Saved/Recent page controller: resolves browser-local IDs against the static catalog and renders canonical lyric cards on demand.
import type { LyricCardData } from "../lib/catalog";
import { createLyricCard } from "./lyric-card";
import {
  STORAGE_KEYS,
  clearFavorites,
  clearRecent,
  readFavoriteIds,
  readStringList,
} from "./storage";

export async function initSavedLibrary(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#saved-library");
  if (!root || root.dataset.savedReady === "true") return;
  root.dataset.savedReady = "true";

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
