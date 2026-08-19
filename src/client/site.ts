// File role: Global browser enhancements for theme switching and favorite-button synchronization; loaded once by BaseLayout.
import {
  STORAGE_KEYS,
  readFavoriteIds,
  toggleFavorite,
} from "./storage";

function syncFavoriteButtons(): void {
  const favorites = new Set(readFavoriteIds());

  document
    .querySelectorAll<HTMLButtonElement>("[data-favorite-button][data-lyric-id]")
    .forEach((button) => {
      const id = button.dataset.lyricId;
      if (!id) return;

      const saved = favorites.has(id);
      const label = saved ? "Remove from saved lyrics" : "Save this lyric";

      button.setAttribute("aria-pressed", String(saved));
      button.dataset.saved = String(saved);
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);

      const inlineLabel = button.querySelector<HTMLElement>("[data-favorite-label]");
      if (inlineLabel?.hasAttribute("data-favorite-compact-label")) {
        inlineLabel.textContent = saved ? "Saved" : "Save";
      } else if (inlineLabel) {
        inlineLabel.textContent = label;
      } else {
        button.textContent = saved ? "Saved" : "Save";
      }
    });
}

function initThemeToggle(): void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (!button) return;

  const updateButton = () => {
    const darkMode = root.dataset.theme === "dark";
    button.textContent = darkMode ? "Light mode" : "Dark mode";
    button.setAttribute(
      "aria-label",
      darkMode ? "Switch to light mode" : "Switch to dark mode",
    );
    button.setAttribute("aria-pressed", String(darkMode));
  };

  updateButton();
  button.addEventListener("click", () => {
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = theme;
    root.dataset.pfTheme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
    updateButton();
  });
}

export function initSiteShell(): void {
  const root = document.documentElement;
  if (root.dataset.siteClientReady === "true") return;
  root.dataset.siteClientReady = "true";

  initThemeToggle();
  syncFavoriteButtons();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>(
      "[data-favorite-button][data-lyric-id]",
    );
    const id = button?.dataset.lyricId;
    if (!button || !id) return;

    const favorites = toggleFavorite(id);
    syncFavoriteButtons();
    window.dispatchEvent(
      new CustomEvent("kalam:favorites-changed", { detail: { favorites } }),
    );
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.favorites) syncFavoriteButtons();
  });

  window.addEventListener("kalam:cards-rendered", syncFavoriteButtons);
}
