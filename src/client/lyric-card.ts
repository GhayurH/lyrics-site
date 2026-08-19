// File role: Client-side counterpart to LyricCard.astro for Saved/Recent, using the same data model, class contract, and bookmark behavior.
import type { LyricCardData } from "../lib/catalog";
import { BOOKMARK_ICON_PATH } from "../lib/ui";

function bookmarkButton(id: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "favorite-button favorite-icon-button lyric-card-save";
  button.dataset.favoriteButton = "";
  button.dataset.lyricId = id;
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "Save this lyric");
  button.setAttribute("title", "Save this lyric");

  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${BOOKMARK_ICON_PATH}"></path></svg><span class="visually-hidden" data-favorite-label>Save this lyric</span>`;
  return button;
}

/** Create the same card structure used by the server-rendered browse lists. */
export function createLyricCard(
  lyric: LyricCardData,
  showKalamType = true,
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "lyric-card";

  const link = document.createElement("a");
  link.className = "lyric-card-link";
  link.href = lyric.href;

  const title = document.createElement("span");
  title.className = "lyric-card-title";
  title.lang = lyric.lang;
  title.dir = lyric.direction;
  title.textContent = lyric.title;
  link.append(title);

  if (lyric.alternateTitle) {
    const roman = document.createElement("span");
    roman.className = "lyric-card-roman";
    roman.lang = "en";
    roman.dir = "ltr";
    roman.textContent = lyric.alternateTitle;
    link.append(roman);
  }

  const meta = document.createElement("span");
  meta.className = "lyric-card-meta";
  meta.setAttribute("aria-hidden", "true");

  if (showKalamType) {
    const chip = document.createElement("span");
    chip.className = "metadata-chip";
    chip.textContent = lyric.kalamType;
    meta.append(chip);
  }
  link.append(meta);

  item.append(link, bookmarkButton(lyric.id));
  return item;
}
