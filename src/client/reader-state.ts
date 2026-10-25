// File role: Shared browser controller for independent edition visibility, typography, and reading preferences.
import {
  STORAGE_KEYS,
  readRecord,
  recordRecentLyric as storeRecentLyric,
  writeRecord,
} from "./storage";
import { initReadingFocus } from "./reading-focus";

import { isEdition, readingModeFromEditions, selectedEditions, type Edition } from "./reading-editions";
const VALID_FONT_SIZES = new Set(["small", "default", "large", "xlarge"]);
const VALID_SPACINGS = new Set(["compact", "default", "relaxed"]);

interface ReadingPrefs extends Record<string, unknown> {
  columnsByReader: Record<string, Edition[]>;
  fontSize: string;
  spacing: string;
}

/** Selected editions are saved per reader type, not imposed on unrelated pages. */
export function initReadingControls(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  const controls = document.querySelector<HTMLElement>("[data-reading-controls]");
  if (!root || !controls || controls.dataset.readingReady === "true") return;
  controls.dataset.readingReady = "true";

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
    fontSize:
      typeof saved.fontSize === "string" && VALID_FONT_SIZES.has(saved.fontSize)
        ? saved.fontSize : "default",
    spacing:
      typeof saved.spacing === "string" && VALID_SPACINGS.has(saved.spacing)
        ? saved.spacing : "default",
  };

  let selected = selectedEditions(prefs.columnsByReader[kind], available, imageOnly);
  const fontSelect = controls.querySelector<HTMLSelectElement>("[data-reading-font-size]");
  const spacingSelect = controls.querySelector<HTMLSelectElement>("[data-reading-line-spacing]");

  const applyPrefs = () => {
    // Legacy mode is retained for the original typographic/layout rules.
    root.dataset.readingMode = readingModeFromEditions(selected);
    root.dataset.readingColumns = selected.join(" ");
    root.dataset.fontSize = prefs.fontSize;
    root.dataset.lineSpacing = prefs.spacing;
    for (const input of checks) input.checked = selected.includes(input.value as Edition);
    if (fontSelect) fontSelect.value = prefs.fontSize;
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
  fontSelect?.addEventListener("change", () => {
    if (!VALID_FONT_SIZES.has(fontSelect.value)) return;
    prefs.fontSize = fontSelect.value;
    storePrefs();
    applyPrefs();
  });
  spacingSelect?.addEventListener("change", () => {
    if (!VALID_SPACINGS.has(spacingSelect.value)) return;
    prefs.spacing = spacingSelect.value;
    storePrefs();
    applyPrefs();
  });

  applyPrefs();
  initReadingFocus(root, controls);
}

export function recordRecentLyric(id: string, limit = 20): void {
  const recent = storeRecentLyric(id, limit);
  window.dispatchEvent(
    new CustomEvent("kalam:recent-changed", { detail: { recent } }),
  );
}
