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
import { initBastaSelections } from "./basta-selections";
import { isMobileViewport } from "./viewport";

import { defaultEditionsForReader, isEdition, readingModeFromEditions, selectedEditions, type Edition } from "./reading-editions";
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

  const defaultEditions = defaultEditionsForReader(kind, isMobileViewport());
  let selected = selectedEditions(prefs.columnsByReader[kind] ?? defaultEditions, available, imageOnly);
  const summary = controls.querySelector<HTMLElement>("[data-reading-regular-label]");
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
  // Close the compact menu on an outside tap, so it cannot obscure reading.
  document.addEventListener("pointerdown", (event) => {
    if (controls.dataset.regularOptionsOpen === "true" &&
        event.target instanceof Node && !controls.contains(event.target)) {
      setRegularOptionsOpen(false);
    }
  });
  controls.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && controls.dataset.regularOptionsOpen === "true"
        && document.documentElement.dataset.readingFocus !== "true") {
      setRegularOptionsOpen(false);
      regularToggle?.focus();
    }
  });
  setRegularOptionsOpen(false);

  const applyPrefs = () => {
    if (summary) summary.textContent = "View: " + selected.map((edition) =>
      edition === "urdu" ? "Urdu" : edition === "roman" ? "Roman" : "Image").join(" + ");
    // CSS and scroll synchronization still need the derived single/parallel mode alongside the selected editions.
    const mode = readingModeFromEditions(selected);
    const columns = selected.join(" ");
    root.dataset.readingMode = mode;
    root.dataset.readingColumns = columns;
    root.dataset.lineSpacing = prefs.spacing;
    // Recitation poems are inserted lazily. Sync all existing item grids here;
    // new items read these root values when first rendered.
    root.querySelectorAll<HTMLElement>(".recite-editions").forEach((grid) => {
      grid.dataset.readingMode = mode;
      grid.dataset.readingColumns = columns;
      grid.dataset.lineSpacing = prefs.spacing;
    });
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

  // Fold secondary settings when the reader reaches the viewport. Keep the
  // navigation strip available in the compact toolbar.
  let compactQueued = false;
  const syncCompact = () => {
    compactQueued = false;
    const active = document.documentElement.dataset.readingFocus === "true";
    const readingStarted = root.getBoundingClientRect().top < window.innerHeight * 0.45;
    controls.dataset.readerCompact = String(!active && window.scrollY > 160 && readingStarted);
  };
  const queueCompact = () => {
    if (compactQueued) return;
    compactQueued = true;
    requestAnimationFrame(syncCompact);
  };
  window.addEventListener("scroll", queueCompact, { passive: true });
  window.addEventListener("resize", queueCompact, { passive: true });
  syncCompact();

  applyPrefs();
  initReadingFocus(root, controls);
  initFloatingScans();
  initBastaBookmarks(root, controls);
  initBastaSelections(root);
}

export function recordRecentLyric(id: string, limit = 20): void {
  const recent = storeRecentLyric(id, limit);
  window.dispatchEvent(
    new CustomEvent("kalam:recent-changed", { detail: { recent } }),
  );
}
