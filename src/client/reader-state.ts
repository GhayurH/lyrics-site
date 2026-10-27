// File role: Shared browser controller for edition visibility and line-spacing preferences.
import {
  STORAGE_KEYS,
  readRecord,
  recordRecentLyric as storeRecentLyric,
  writeRecord,
} from "./storage";
import { initReadingFocus } from "./reading-focus";
import { initFloatingScans } from "./floating-scans";
import { initBastaBookmarks } from "./basta-bookmarks";

import { isEdition, readingModeFromEditions, selectedEditions, type Edition } from "./reading-editions";
const VALID_SPACINGS = new Set(["compact", "default", "relaxed"]);

interface ReadingPrefs extends Record<string, unknown> {
  columnsByReader: Record<string, Edition[]>;
  spacing: string;
}

/** Selected editions are saved per reader type, not imposed on unrelated pages. */
export function initReadingControls(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  const controls = document.querySelector<HTMLElement>("[data-reading-controls]");
  if (!root || !controls || controls.dataset.readingReady === "true") return;
  controls.dataset.readingReady = "true";
  document.documentElement.dataset.readerEnhanced = "true";

  const kind = root.dataset.readerKind ?? "index";
  const imageOnly = root.dataset.imageOnly === "true";
  const checks = Array.from(controls.querySelectorAll<HTMLInputElement>("[data-reading-column]"));
  const available = checks.map((input) => input.value).filter(isEdition);
  const saved = readRecord(STORAGE_KEYS.readingPrefs);
  const columnsByReader: Record<string, Edition[]> = {};
  if (saved.columnsByReader && typeof saved.columnsByReader === "object") {
    for (const [key, value] of Object.entries(saved.columnsByReader)) {
      if (Array.isArray(value)) columnsByReader[key] = value.filter(isEdition);
    }
  }

  const prefs: ReadingPrefs = {
    columnsByReader,
    spacing:
      typeof saved.spacing === "string" && VALID_SPACINGS.has(saved.spacing)
        ? saved.spacing : "default",
  };

  let selected = selectedEditions(prefs.columnsByReader[kind], available, imageOnly);
  const spacingSelect = controls.querySelector<HTMLSelectElement>("[data-reading-line-spacing]");
  const regularToggle = controls.querySelector<HTMLButtonElement>("[data-reading-regular-toggle]");
  const regularIndicator = regularToggle?.querySelector<HTMLElement>("[data-reading-regular-indicator]");
  const setRegularOptionsOpen = (open: boolean) => {
    controls.dataset.regularOptionsOpen = String(open);
    regularToggle?.setAttribute("aria-expanded", String(open));
    regularToggle?.setAttribute("aria-label", open ? "Hide reading options" : "Show reading options");
    if (regularIndicator) regularIndicator.textContent = open ? "▴" : "▾";
  };
  regularToggle?.addEventListener("click", () =>
    setRegularOptionsOpen(controls.dataset.regularOptionsOpen !== "true"));
  controls.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && controls.dataset.regularOptionsOpen === "true"
        && document.documentElement.dataset.readingFocus !== "true") {
      setRegularOptionsOpen(false);
      regularToggle?.focus();
    }
  });
  setRegularOptionsOpen(false);

  const applyPrefs = () => {
    // CSS and scroll synchronization still need the derived single/parallel mode alongside the selected editions.
    root.dataset.readingMode = readingModeFromEditions(selected);
    root.dataset.readingColumns = selected.join(" ");
    root.dataset.lineSpacing = prefs.spacing;
    for (const input of checks) input.checked = selected.includes(input.value as Edition);
    if (spacingSelect) spacingSelect.value = prefs.spacing;
    window.dispatchEvent(new Event("kalam:columns-changed"));
  };
  const storePrefs = () => writeRecord(STORAGE_KEYS.readingPrefs, prefs);

  for (const input of checks) {
    input.addEventListener("change", () => {
      const updated = checks.filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value).filter(isEdition);
      // A reader must have at least one usable edition.
      if (updated.length === 0) { input.checked = true; return; }
      selected = updated;
      prefs.columnsByReader[kind] = updated;
      storePrefs();
      applyPrefs();
    });
  }
  spacingSelect?.addEventListener("change", () => {
    if (!VALID_SPACINGS.has(spacingSelect.value)) return;
    prefs.spacing = spacingSelect.value;
    storePrefs();
    applyPrefs();
  });

  applyPrefs();
  initReadingFocus(root, controls);
  initFloatingScans();
  initBastaBookmarks(root, controls);
}

export function recordRecentLyric(id: string, limit = 20): void {
  const recent = storeRecentLyric(id, limit);
  window.dispatchEvent(
    new CustomEvent("kalam:recent-changed", { detail: { recent } }),
  );
}
