// File role: Fit printed verses without silently defeating the chosen text-size preference.
import { fitLine } from "../lib/verse-fit";
const MIN_FONT = {
  urdu: { small: 17, default: 22, large: 27, xlarge: 31 },
  roman: { small: 14, default: 17, large: 20, xlarge: 24 },
} as const;
type FontChoice = keyof typeof MIN_FONT.urdu;

function floorFor(root: HTMLElement, group: HTMLElement): number {
  const language = group.closest('[lang="ur"]') ? "urdu" : "roman";
  const choice = root.dataset.fontSize as FontChoice;
  return MIN_FONT[language][choice in MIN_FONT[language] ? choice : "default"];
}
function lineInset(verse: HTMLElement): number {
  const style = getComputedStyle(verse);
  return ["marginInlineStart", "marginInlineEnd", "paddingInlineStart", "paddingInlineEnd",
    "borderInlineStartWidth", "borderInlineEndWidth"]
    .reduce((total, key) => total + (Number.parseFloat(style.getPropertyValue(
      key.replace(/[A-Z]/g, (char) => "-" + char.toLowerCase())
    )) || 0), 0);
}
function measure(verse: HTMLElement, ctx: CanvasRenderingContext2D, base: number): number {
  const style = getComputedStyle(verse);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${base}px ${style.fontFamily}`;
  return ctx.measureText(verse.textContent?.trim() ?? "").width * 1.04 + lineInset(verse);
}
function fitLyricStanza(root: HTMLElement, stanza: HTMLElement, ctx: CanvasRenderingContext2D): void {
  stanza.style.removeProperty("font-size");
  stanza.style.removeProperty("--verse-min-width");
  if (root.dataset.wrapVerses === "true" || !stanza.clientWidth) return;
  const lines = Array.from(stanza.querySelectorAll<HTMLElement>(".lyric-verse"));
  if (!lines.length) return;
  const base = Number.parseFloat(getComputedStyle(stanza).fontSize);
  if (!(base > 0)) return;
  const natural = Math.max(...lines.map((line) => measure(line, ctx, base)));
  const fit = fitLine(base, floorFor(root, stanza), stanza.clientWidth, natural);
  if (fit.size < base - .1) stanza.style.fontSize = `${fit.size.toFixed(2)}px`;
  if (fit.minWidth > stanza.clientWidth) stanza.style.setProperty("--verse-min-width", `${Math.ceil(fit.minWidth)}px`);
}

function fitBastaKalam(root: HTMLElement, kalam: HTMLElement, ctx: CanvasRenderingContext2D): void {
  const verses = Array.from(kalam.querySelectorAll<HTMLElement>(".basta-verse-poetry"));
  verses.forEach((line) => { line.style.removeProperty("font-size"); line.style.removeProperty("--verse-min-width"); });
  if (root.dataset.wrapVerses === "true" || !kalam.clientWidth || !verses.length) return;
  // Couplets fit together; a single long verse no longer shrinks every stanza in a kalam.
  const groups: HTMLElement[][] = [];
  for (const verse of verses) {
    if (!groups.length || verse.classList.contains("basta-couplet-separator")) groups.push([]);
    groups[groups.length - 1].push(verse);
  }
  const base = Number.parseFloat(getComputedStyle(kalam).fontSize);
  if (!(base > 0)) return;
  const width = kalam.clientWidth;
  const minimum = floorFor(root, kalam);
  for (const group of groups) {
    const natural = Math.max(...group.map((verse) => measure(verse, ctx, base)));
    const fit = fitLine(base, minimum, width, natural);
    for (const verse of group) {
      if (fit.size < base - .1) verse.style.fontSize = `${fit.size.toFixed(2)}px`;
      if (fit.minWidth > width) verse.style.setProperty("--verse-min-width", `${Math.ceil(fit.minWidth)}px`);
    }
  }
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
      if (group.classList.contains("lyric-stanza")) fitLyricStanza(root, group, context);
      else fitBastaKalam(root, group, context);
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(fitVisible);
  };
  const observe = new MutationObserver(schedule);
  observe.observe(root, { attributes: true, attributeFilter: ["data-reading-mode", "data-reading-columns", "data-font-size", "data-wrap-verses"] });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  window.addEventListener("kalam:columns-changed", schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);
  const intersection = "IntersectionObserver" in window ? new IntersectionObserver(schedule, { rootMargin: "800px 0px" }) : null;
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
