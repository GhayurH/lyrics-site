// File role: Keep every printed verse on one line without horizontal scrolling.
// Verse size is automatic; no reader-facing text-size or wrap preference exists.
import { fitLine, MAX_VERSE_GROWTH, readingIsMagnified } from "../lib/verse-fit";

function readableWidth(verse: HTMLElement, style: CSSStyleDeclaration): number {
  return Math.max(0, verse.clientWidth
    - (Number.parseFloat(style.paddingInlineStart) || 0)
    - (Number.parseFloat(style.paddingInlineEnd) || 0));
}

const measuredText = new Map<string, number>();
function naturalWidth(verse: HTMLElement, style: CSSStyleDeclaration, ctx: CanvasRenderingContext2D): number {
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const text = verse.textContent?.trim() ?? "";
  const key = ctx.font + "\n" + text;
  const cached = measuredText.get(key);
  if (cached !== undefined) return cached;
  const width = ctx.measureText(text).width;
  if (measuredText.size >= 2000) measuredText.clear();
  measuredText.set(key, width);
  return width;
}

/** Match stanza type size to its longest natural line while keeping every
 * displayed verse fully justified. */
function fitGroup(lines: HTMLElement[], ctx: CanvasRenderingContext2D, maxGrowth = MAX_VERSE_GROWTH): void {
  for (const line of lines) {
    line.style.removeProperty("font-size");
    line.classList.remove("poetry-overflow-line");
    if (line.dataset.zoomPan === "true") {
      line.removeAttribute("tabindex");
      line.removeAttribute("aria-description");
      delete line.dataset.zoomPan;
    }
  }
  const metrics = lines.map((line) => {
    const style = getComputedStyle(line);
    const base = Number.parseFloat(style.fontSize);
    const available = readableWidth(line, style);
    return { line, base, available, natural: naturalWidth(line, style, ctx) };
  }).filter(({ base, available }) => base > 0 && available > 0);
  if (!metrics.length) return;

  // The tightest natural-width/available-width ratio sizes the stanza.
  // Grow when the longest line covers under 95% of its text track; every
  // line stays justified, including when the maximum growth is reached.
  const ratio = Math.min(...metrics.map(({ base, available, natural }) =>
    natural > 0 ? fitLine(base, available, natural, maxGrowth) / base : 1));
  const pan = readingIsMagnified(innerWidth, outerWidth, window.visualViewport?.scale || 1)
    && metrics.some(({ base }) => base * ratio < 16);
  for (const { line, base } of metrics) {
    if (pan) {
      // Keep a readable floor at extreme browser zoom; only the affected line
      // scrolls horizontally, retaining the one-line source transcription.
      line.style.fontSize = Math.max(16, base * ratio).toFixed(3) + "px";
      line.classList.add("poetry-overflow-line");
      line.tabIndex = 0;
      line.dataset.zoomPan = "true";
      line.setAttribute("aria-description", "Use horizontal scroll or arrow keys to read the full line.");
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
  let generation = 0;
  let groups: HTMLElement[] = [];
  const fitted = new WeakMap<HTMLElement, { width: number; generation: number; magnified: boolean }>();
  const fitVisible = () => {
    pending = false;
    const pages = new Map<HTMLElement, DOMRect>();
    const magnified = readingIsMagnified(innerWidth, outerWidth, window.visualViewport?.scale || 1);
    for (const group of groups) {
      if (!group.isConnected) continue;
      const page = group.closest<HTMLElement>("[data-basta-page]");
      if (page) {
        let rect = pages.get(page);
        if (!rect) { rect = page.getBoundingClientRect(); pages.set(page, rect); }
        if (rect.bottom < -800 || rect.top > innerHeight + 800) continue;
      }
      const width = group.clientWidth;
      if (!width) continue;
      const previous = fitted.get(group);
      if (previous?.width === width && previous.generation === generation && previous.magnified === magnified) continue;
      if (group.classList.contains("lyric-stanza")) fitStanza(group, context);
      else fitKalam(group, context);
      fitted.set(group, { width, generation, magnified });
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(fitVisible);
  };
  const invalidate = () => { generation++; schedule(); };
  const refreshGroups = () => {
    groups = [...root.querySelectorAll<HTMLElement>(".lyric-stanza, .basta-kalam-text")];
    schedule();
  };
  const fontsChanged = () => { measuredText.clear(); invalidate(); };

  new MutationObserver(invalidate).observe(root, {
    attributes: true, attributeFilter: ["data-reading-mode", "data-reading-columns", "data-line-spacing"],
  });
  // Viewport-based font sizes can change while a capped column keeps its width.
  window.addEventListener("resize", invalidate, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", refreshGroups);
  window.addEventListener("kalam:columns-changed", invalidate);
  window.addEventListener("kalam:fonts-changed", fontsChanged);
  document.fonts.ready.then(fontsChanged);
  document.fonts.addEventListener?.("loadingdone", fontsChanged);

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
  refreshGroups();
}
