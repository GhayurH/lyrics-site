// File role: Fit Basta and standalone lyric verses to their respective reading columns, preserving single lines and justification.
const VERSE_SELECTOR = ".basta-verse-poetry, .lyric-verse";
const TEXT_SELECTOR = ".basta-kalam-text, .lyric-reading-text";
const MIN_URDU_PX = 17;
const MIN_ROMAN_PX = 14;

function fitKalam(kalam: HTMLElement, context: CanvasRenderingContext2D): void {
  kalam.style.removeProperty("font-size");
  kalam.style.removeProperty("--basta-verse-min-width");

  const verses = Array.from(kalam.querySelectorAll<HTMLElement>(VERSE_SELECTOR));
  if (!verses.length || kalam.clientWidth <= 0 || kalam.getClientRects().length === 0) return;

  const computed = getComputedStyle(kalam);
  const base = Number.parseFloat(computed.fontSize);
  if (!Number.isFinite(base) || base <= 0) return;
  context.font = `${computed.fontStyle} ${computed.fontWeight} ${base}px ${computed.fontFamily}`;

  const width = kalam.clientWidth;
  let minRatio = 1;
  let maxVerseWidth = 0;
  for (const verse of verses) {
    const value = verse.textContent?.trim();
    if (!value) continue;
    const styles = getComputedStyle(verse);
    // Include both logical edges: first verses use end padding for the
    // reverse indent while second verses use a start margin.
    const inset = (Number.parseFloat(styles.marginInlineStart) || 0)
      + (Number.parseFloat(styles.marginInlineEnd) || 0)
      + (Number.parseFloat(styles.paddingInlineStart) || 0)
      + (Number.parseFloat(styles.paddingInlineEnd) || 0)
      + (Number.parseFloat(styles.borderInlineStartWidth) || 0)
      + (Number.parseFloat(styles.borderInlineEndWidth) || 0);
    // Measure shaping with the browser's text engine; leave room for
    // Nastaliq glyph variation and fractional pixel rounding.
    const natural = context.measureText(value).width * 1.03;
    if (natural <= 0) continue;
    minRatio = Math.min(minRatio, Math.max(0, width - inset) / natural);
    // Keep the non-scaling border and indentation outside font metrics.
    maxVerseWidth = Math.max(maxVerseWidth, natural + inset);
  }

  const minimum = kalam.closest('[lang="ur"]') ? MIN_URDU_PX : MIN_ROMAN_PX;
  const fitted = Math.min(base, Math.max(minimum, base * minRatio));
  if (fitted < base - 0.1) kalam.style.fontSize = `${fitted.toFixed(2)}px`;

  // If the minimum font is still too wide, preserve legibility and give
  // the poem a scrollable common line measure instead of wrapping.
  const required = maxVerseWidth * (fitted / base);
  if (required > width) {
    kalam.style.setProperty("--basta-verse-min-width", `${Math.ceil(required)}px`);
  }
}

export function initVerseFitting(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  if (!root || root.dataset.verseFitReady === "true") return;
  root.dataset.verseFitReady = "true";

  const context = document.createElement("canvas").getContext("2d");
  if (!context) return;
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      root.querySelectorAll<HTMLElement>(TEXT_SELECTOR).forEach((kalam) => fitKalam(kalam, context));
    });
  };

  // Font preferences change the root attributes, while streaming readers
  // insert pages in chunks. Resizing or font downloads can change widths.
  const observer = new MutationObserver(schedule);
  observer.observe(root, { attributes: true, attributeFilter: ["data-reading-mode", "data-font-size"] });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);
  schedule();
}

/** Preserve existing Basta-page entry points while sharing the fitter. */
export const initBastaVerseFitting = initVerseFitting;
