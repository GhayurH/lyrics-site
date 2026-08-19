// File role: Shared browser controller for lyric and Basta reading-mode, text-size, and line-spacing preferences.
import {
  STORAGE_KEYS,
  readRecord,
  recordRecentLyric as storeRecentLyric,
  writeRecord,
} from "./storage";

const VALID_MODES = new Set(["parallel", "urdu", "roman"]);
const VALID_FONT_SIZES = new Set(["small", "default", "large", "xlarge"]);
const VALID_SPACINGS = new Set(["compact", "default", "relaxed"]);

interface ReadingPrefs extends Record<string, unknown> {
  mode: string;
  fontSize: string;
  spacing: string;
}

/** Apply and persist the shared mode, font-size, and line-spacing controls. */
export function initReadingControls(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  const controls = document.querySelector<HTMLElement>("[data-reading-controls]");
  if (!root || !controls || controls.dataset.readingReady === "true") return;
  controls.dataset.readingReady = "true";

  const hasRoman = root.dataset.hasRoman !== "false";
  const fontSelect = controls.querySelector<HTMLSelectElement>("[data-reading-font-size]");
  const spacingSelect = controls.querySelector<HTMLSelectElement>("[data-reading-line-spacing]");
  const modeButtons = controls.querySelectorAll<HTMLButtonElement>("[data-reading-mode-button]");
  const saved = readRecord(STORAGE_KEYS.readingPrefs);

  const savedMode =
    typeof saved.mode === "string" && VALID_MODES.has(saved.mode)
      ? saved.mode
      : "parallel";

  const prefs: ReadingPrefs = {
    mode: savedMode,
    fontSize:
      typeof saved.fontSize === "string" && VALID_FONT_SIZES.has(saved.fontSize)
        ? saved.fontSize
        : "default",
    spacing:
      typeof saved.spacing === "string" && VALID_SPACINGS.has(saved.spacing)
        ? saved.spacing
        : "default",
  };

  const storePrefs = () => writeRecord(STORAGE_KEYS.readingPrefs, prefs);

  const applyPrefs = () => {
    root.dataset.readingMode = hasRoman ? prefs.mode : "urdu";
    root.dataset.fontSize = prefs.fontSize;
    root.dataset.lineSpacing = prefs.spacing;

    if (fontSelect) fontSelect.value = prefs.fontSize;
    if (spacingSelect) spacingSelect.value = prefs.spacing;

    modeButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(hasRoman && button.dataset.readingModeButton === prefs.mode),
      );
    });
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.readingModeButton;
      if (!hasRoman || !mode || !VALID_MODES.has(mode)) return;
      prefs.mode = mode;
      storePrefs();
      applyPrefs();
    });
  });

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
}

export function recordRecentLyric(id: string, limit = 20): void {
  const recent = storeRecentLyric(id, limit);
  window.dispatchEvent(
    new CustomEvent("kalam:recent-changed", { detail: { recent } }),
  );
}
