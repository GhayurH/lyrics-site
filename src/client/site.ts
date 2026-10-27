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
    if (open) delete root.dataset.mobileHeaderHidden;
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

/** Hide the header on downward reading scrolls; upward movement reveals it.
 * Desktop applies this only after the reading content starts, while mobile
 * retains the site-wide compact-header behavior.
 */
function initHeaderAutoHide(): void {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  const reading = document.querySelector<HTMLElement>("[data-reading-root]");
  const mobile = window.matchMedia("(max-width: 700px)");
  let previousY = window.scrollY;
  let lastDirection = 0;
  let distance = 0;
  let lastSource: Window | HTMLElement = window;
  let pending = false;
  const panelPositions = new WeakMap<HTMLElement, number>();

  const show = () => {
    delete root.dataset.mobileHeaderHidden;
    delete root.dataset.desktopReaderHeaderHidden;
  };
  const reset = () => {
    distance = 0;
    lastDirection = 0;
  };
  const measureHeader = () => {
    root.style.setProperty("--site-header-height", `${header.offsetHeight}px`);
  };
  const readingStarted = () =>
    Boolean(reading && reading.getBoundingClientRect().top <= header.offsetHeight + 4);

  const recordDirection = (source: Window | HTMLElement, delta: number, canHide: boolean) => {
    if (source !== lastSource) {
      lastSource = source;
      reset();
    }
    if (Math.abs(delta) < 1) return;
    const direction = Math.sign(delta);
    if (direction !== lastDirection) distance = 0;
    lastDirection = direction;
    distance += Math.abs(delta);
    if (distance < 18) return;
    if (direction < 0) show();
    else if (canHide) {
      if (mobile.matches) root.dataset.mobileHeaderHidden = "true";
      else root.dataset.desktopReaderHeaderHidden = "true";
    }
    distance = 0;
  };

  const updateWindow = () => {
    pending = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - previousY;
    previousY = y;
    // Only an actually open mobile menu pins the header; keyboard focus on
    // its buttons should not permanently prevent auto-hide.
    if (root.dataset.readingFocus === "true" ||
        (mobile.matches && root.dataset.mobileNavOpen === "true")) {
      show();
      reset();
      return;
    }
    if (mobile.matches) {
      delete root.dataset.desktopReaderHeaderHidden;
      if (y < 80) {
        show();
        reset();
        return;
      }
      recordDirection(window, delta, y > 120);
    } else {
      delete root.dataset.mobileHeaderHidden;
      if (!readingStarted()) {
        show();
        reset();
        return;
      }
      recordDirection(window, delta, true);
    }
  };
  window.addEventListener("scroll", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateWindow);
  }, { passive: true });

  // A long Urdu column can scroll without moving the document. Apply the
  // same direction behavior once the reader has reached the sticky toolbar.
  document.addEventListener("scroll", (event) => {
    const panel = event.target;
    if (!(panel instanceof HTMLElement) ||
        panel.dataset.syncedScrollable !== "true" ||
        !reading?.contains(panel)) return;
    const previous = panelPositions.get(panel) ?? 0;
    panelPositions.set(panel, panel.scrollTop);
    if (!mobile.matches && root.dataset.readingFocus !== "true" && readingStarted()) {
      recordDirection(panel, panel.scrollTop - previous, true);
    }
  }, true);

  const resetOnResize = () => {
    previousY = window.scrollY;
    lastSource = window;
    reset();
    show();
    measureHeader();
  };
  mobile.addEventListener("change", resetOnResize);
  window.addEventListener("resize", resetOnResize, { passive: true });
  header.addEventListener("focusin", show);
  window.addEventListener("pageshow", () => { show(); previousY = window.scrollY; });
  document.fonts.ready.then(measureHeader);
  measureHeader();
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
  initHeaderAutoHide();
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
