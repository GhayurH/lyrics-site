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

function initMobileNavigation(): void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>("#mobile-nav-toggle");
  const navigation = document.querySelector<HTMLElement>("#site-navigation");
  if (!button || !navigation) return;

  const setOpen = (open: boolean) => {
    root.dataset.mobileNavOpen = String(open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    button.title = open ? "Close navigation" : "Open navigation";
  };
  button.addEventListener("click", () => setOpen(root.dataset.mobileNavOpen !== "true"));
  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (root.dataset.mobileNavOpen !== "true") return;
    if (event.target instanceof Node && !event.target.parentElement?.closest(".site-header")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.mobileNavOpen === "true") {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia("(min-width: 701px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

function initThemeToggle(): void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (!button) return;

  const updateButton = () => {
    const darkMode = root.dataset.theme === "dark";
    const actionLabel = darkMode ? "Light mode" : "Dark mode";
    const srLabel = button.querySelector<HTMLElement>("[data-theme-toggle-label]");
    if (srLabel) srLabel.textContent = actionLabel;
    button.title = `Switch to ${darkMode ? "light" : "dark"} mode`;
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f7f7f8" : "#171719");
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
  initMobileNavigation();
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
