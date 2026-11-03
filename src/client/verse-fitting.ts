// File role: Keep every printed verse on one line without horizontal scrolling.
// Verse size is automatic; no reader-facing text-size or wrap preference exists.
import { fitLine, MAX_VERSE_GROWTH } from "../lib/verse-fit";

function readableWidth(verse: HTMLElement): number {
  const style = getComputedStyle(verse);
  return Math.max(0, verse.clientWidth
    - (Number.parseFloat(style.paddingInlineStart) || 0)
    - (Number.parseFloat(style.paddingInlineEnd) || 0));
}

function naturalWidth(verse: HTMLElement, ctx: CanvasRenderingContext2D): number {
  const style = getComputedStyle(verse);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(verse.textContent?.trim() ?? "").width;
}

/** Keep one font size within each stanza, scaling up when its longest line
 * would otherwise acquire stretched word spacing. */

function readingIsMagnified(): boolean {
  // Desktop browser zoom reduces the CSS viewport without shrinking the outer window.
  // Pinch zoom on mobile is reported separately by VisualViewport.scale.
  return (window.visualViewport?.scale || 1) >= 1.75 ||
    (window.innerWidth < 800 && window.outerWidth / Math.max(window.innerWidth, 1) >= 1.75);
}
function fitGroup(lines: HTMLElement[], ctx: CanvasRenderingContext2D, maxGrowth = MAX_VERSE_GROWTH): void {
  for (const line of lines) {
    line.style.removeProperty("font-size");
    line.classList.remove("poetry-overflow-line", "poetry-fitted-anchor");
    if (line.dataset.zoomPan === "true") {
      line.removeAttribute("tabindex");
      line.removeAttribute("aria-label");
      delete line.dataset.zoomPan;
    }
  }
  const metrics = lines.map((line) => {
    const base = Number.parseFloat(getComputedStyle(line).fontSize);
    const available = readableWidth(line);
    return { line, base, available, natural: naturalWidth(line, ctx) };
  }).filter(({ base, available }) => base > 0 && available > 0);
  if (!metrics.length) return;

  // The tightest natural-width/available-width ratio determines the font
  // scale for the whole stanza. When the chosen width exceeds its glyphs,
  // grow instead of relying on justify to insert exaggerated word spaces.
  const ratio = Math.min(...metrics.map(({ base, available, natural }) =>
    natural > 0 ? fitLine(base, available, natural, maxGrowth) / base : 1));
  if (maxGrowth > 1) {
    const widest = metrics.reduce((a, b) =>
      b.natural / b.available > a.natural / a.available ? b : a);
    // The naturally widest verse is not justified; only shorter verses
    // distribute their extra space. This also handles the growth ceiling.
    widest.line.classList.add("poetry-fitted-anchor");
  }
  const pan = readingIsMagnified() && metrics.some(({ base }) => base * ratio < 16);
  for (const { line, base } of metrics) {
    if (pan) {
      // Keep a readable floor at extreme browser zoom; only the affected line
      // scrolls horizontally, retaining the one-line source transcription.
      line.style.fontSize = Math.max(16, base * ratio).toFixed(3) + "px";
      line.classList.add("poetry-overflow-line");
      line.tabIndex = 0;
      line.dataset.zoomPan = "true";
      line.setAttribute("aria-label", "Long poetry line. Use horizontal scroll or arrow keys to read.");
    } else if (Math.abs(ratio - 1) > 0.001) line.style.fontSize = `${(base * ratio).toFixed(3)}px`;
  }
  if (pan) return;

  // Canvas and actual text shaping/justification can differ, especially for Nastaliq.
  // Correct against measured rendered widths without introducing scrollbars or wrapping.
  for (let attempt = 0; attempt < 5; attempt++) {
    const excess = Math.max(1, ...metrics.map(({ line }) =>
      line.clientWidth > 0 ? line.scrollWidth / line.clientWidth : 1));
    if (excess <= 1.005) break;
    const adjustment = 0.96 / excess;
    for (const { line, base } of metrics) {
      const current = Number.parseFloat(line.style.fontSize) || base;
      line.style.fontSize = `${(current * adjustment).toFixed(3)}px`;
    }
  }
}

function fitStanza(stanza: HTMLElement, ctx: CanvasRenderingContext2D): void {
  fitGroup(Array.from(stanza.querySelectorAll<HTMLElement>(".lyric-verse")), ctx);
}

/** Split at printed stanza counters, actual blank stanza breaks, and ruled
 * couplet separators. A 4+2 stanza stays together because its internal
 * blank is suppressed by the shared Basta layout renderer.
 */
function fitKalam(kalam: HTMLElement, ctx: CanvasRenderingContext2D): void {
  let group: HTMLElement[] = [];
  const flush = () => {
    if (group.length) fitGroup(group, ctx);
    group = [];
  };
  for (const child of kalam.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("kalam-reading-title")) {
      flush();
      // Headings retain their independent sizing and centered presentation.
      fitGroup([child], ctx, 1);
      continue;
    }
    if (child.classList.contains("poetry-stanza-number") ||
        child.classList.contains("basta-couplet-separator") ||
        (child.classList.contains("basta-verse-line") && !child.textContent?.trim()))
      flush();
    if (child.classList.contains("basta-refrain")) {
      flush();
      fitGroup([child], ctx);
      continue;
    }
    if (child.classList.contains("basta-verse-poetry")) group.push(child);
  }
  flush();
}

export function initVerseFitting(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  if (!root || root.dataset.verseFitReady === "true") return;
  root.dataset.verseFitReady = "true";
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return;

  let pending = false;
  const fitVisible = () => {
    pending = false;
    for (const group of root.querySelectorAll<HTMLElement>(".lyric-stanza, .basta-kalam-text")) {
      const page = group.closest<HTMLElement>("[data-basta-page]");
      if (page) {
        const rect = page.getBoundingClientRect();
        if (rect.bottom < -800 || rect.top > innerHeight + 800) continue;
      }
      if (group.classList.contains("lyric-stanza")) fitStanza(group, context);
      else fitKalam(group, context);
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(fitVisible);
  };

  new MutationObserver(schedule).observe(root, {
    attributes: true, attributeFilter: ["data-reading-mode", "data-reading-columns", "data-line-spacing"],
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  window.addEventListener("kalam:columns-changed", schedule);
  window.addEventListener("kalam:fonts-changed", schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);

  // Only width changes matter; fitting itself may legitimately change block heights.
  if ("ResizeObserver" in window) {
    const widths = new WeakMap<Element, number>();
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (widths.get(entry.target) !== width) {
          widths.set(entry.target, width);
          changed = true;
        }
      }
      if (changed) schedule();
    });
    ro.observe(root);
    root.querySelectorAll<HTMLElement>(".lyric-reading-panel,.basta-page-urdu,.basta-page-roman,.basta-reader-urdu,.basta-reader-roman").forEach((panel) => ro.observe(panel));
    window.addEventListener("basta:content-loaded", () => {
      root.querySelectorAll<HTMLElement>(".basta-reader-urdu,.basta-reader-roman").forEach((panel) => ro.observe(panel));
    });
  }

  const intersection = "IntersectionObserver" in window
    ? new IntersectionObserver(schedule, { rootMargin: "800px 0px" }) : null;
  const seen = new WeakSet<HTMLElement>();
  const observePages = () => {
    if (!intersection) return;
    root.querySelectorAll<HTMLElement>("[data-basta-page]").forEach((node) => {
      if (!seen.has(node)) { seen.add(node); intersection.observe(node); }
    });
  };
  window.addEventListener("basta:content-loaded", observePages);
  observePages();
  if (!intersection) root.addEventListener("scroll", schedule, { passive: true });
  schedule();
}
