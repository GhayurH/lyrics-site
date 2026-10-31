// File role: Keep every printed verse on one line without horizontal scrolling.
// Verse size is automatic; no reader-facing text-size or wrap preference exists.
import { fitLine } from "../lib/verse-fit";

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

/** Keep equal size within each couplet/stanza; other stanzas aren't penalized. */
function fitGroup(lines: HTMLElement[], ctx: CanvasRenderingContext2D): void {
  for (const line of lines) line.style.removeProperty("font-size");
  const metrics = lines.map((line) => {
    const base = Number.parseFloat(getComputedStyle(line).fontSize);
    const available = readableWidth(line);
    return { line, base, available, natural: naturalWidth(line, ctx) };
  }).filter(({ base, available }) => base > 0 && available > 0);
  if (!metrics.length) return;

  const ratio = Math.min(1, ...metrics.map(({ base, available, natural }) =>
    natural > 0 ? fitLine(base, available, natural) / base : 1));
  for (const { line, base } of metrics) {
    if (ratio < 0.999) line.style.fontSize = `${(base * ratio).toFixed(3)}px`;
  }

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

function fitKalam(kalam: HTMLElement, ctx: CanvasRenderingContext2D): void {
  const verses = Array.from(kalam.querySelectorAll<HTMLElement>(".basta-verse-poetry"));
  const groups: HTMLElement[][] = [];
  for (const verse of verses) {
    if (!groups.length || verse.classList.contains("basta-couplet-separator")) groups.push([]);
    groups[groups.length - 1].push(verse);
  }
  for (const group of groups) fitGroup(group, ctx);
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
