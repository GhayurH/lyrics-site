// Interactive bilingual split shared by standalone lyrics, Basta, and Recitation Sets.
// CSS owns edition geometry; verse-fitting.ts owns one-line type sizing.
import { DEFAULT_ROMAN_WIDTH, MIN_ROMAN_WIDTH, MAX_ROMAN_WIDTH,
  normalizeRomanWidth, romanWidthFromPointer } from "../lib/reading-split";

const GRID = ".lyric-reading-grid, .basta-parallel-kalams-page, .basta-parallel-kalams-reader";
const ROMAN = ".lyric-reading-roman, .basta-page-roman, .basta-reader-roman";
const URDU = ".lyric-reading-urdu, .basta-page-urdu, .basta-reader-urdu";
interface Pair { grid: HTMLElement; roman: HTMLElement; urdu: HTMLElement; handle: HTMLDivElement }

/** Store one ratio per reader kind, not separately for every streamed page. */
export function initReadingColumnSplit(root: HTMLElement, initial: number, save: (ratio: number) => void): void {
  if (root.dataset.columnSplitReady === "true") return;
  root.dataset.columnSplitReady = "true";
  let percent = normalizeRomanWidth(initial);
  const pairs = new Map<HTMLElement, Pair>();
  let queued = false;

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const [grid, { roman, urdu, handle }] of pairs) {
        if (!grid.isConnected) { pairs.delete(grid); continue; }
        const rect = grid.getBoundingClientRect();
        if (rect.bottom < -500 || rect.top > innerHeight + 500) continue;
        const left = roman.getBoundingClientRect(), right = urdu.getBoundingClientRect();
        const cols = root.dataset.readingColumns?.split(" ") ?? [];
        const parallel = cols.includes("roman") && cols.includes("urdu") &&
          getComputedStyle(roman).display !== "none" && getComputedStyle(urdu).display !== "none" &&
          Math.abs(left.top - right.top) < 20 && left.right <= right.left + 10 &&
          left.width > 0 && right.width > 0;
        grid.dataset.splitActive = String(parallel);
        if (parallel) {
          handle.style.left = (left.right - rect.left) + "px";
          handle.style.top = (left.top - rect.top) + "px";
          handle.style.height = Math.max(left.height, right.height) + "px";
        }
      }
    });
  };

  /** Inherited fractional tracks resize every page together; existing fitter reacts to the event. */
  const change = (width: number, persist = false) => {
    const next = normalizeRomanWidth(width);
    if (next === percent && !persist) return;
    percent = next;
    root.style.setProperty("--reading-roman-share", percent + "fr");
    root.style.setProperty("--reading-urdu-share", (100 - percent) + "fr");
    for (const { handle } of pairs.values()) {
      handle.setAttribute("aria-valuenow", String(percent));
      handle.setAttribute("aria-valuetext", `Roman ${percent}%, Urdu ${100 - percent}%`);
    }
    if (persist) save(percent);
    window.dispatchEvent(new Event("kalam:columns-changed"));
    schedule();
  };

  // Observe entry into the viewport: continuous Basta chunks can be initially unmeasured.
  const visible = new IntersectionObserver(schedule, { rootMargin: "450px 0px" });
  const install = () => {
    // Standalone lyric pages use the reading root itself as the edition grid.
    const candidates = [...(root.matches(GRID) ? [root] : []), ...root.querySelectorAll<HTMLElement>(GRID)];
    for (const grid of candidates) {
      if (pairs.has(grid)) continue;
      const roman = [...grid.children].find((n): n is HTMLElement => n instanceof HTMLElement && n.matches(ROMAN));
      const urdu = [...grid.children].find((n): n is HTMLElement => n instanceof HTMLElement && n.matches(URDU));
      if (!roman || !urdu) continue;
      const handle = document.createElement("div");
      handle.className = "reading-column-divider";
      handle.tabIndex = 0;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-label", "Resize Roman and Urdu columns");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-valuemin", String(MIN_ROMAN_WIDTH));
      handle.setAttribute("aria-valuemax", String(MAX_ROMAN_WIDTH));
      handle.setAttribute("aria-valuenow", String(percent));
      handle.setAttribute("aria-valuetext", `Roman ${percent}%, Urdu ${100 - percent}%`);
      handle.title = "Drag to resize; arrows adjust, Shift+arrows resize faster, double-click resets.";
      roman.id ||= "reading-roman-" + pairs.size;
      urdu.id ||= "reading-urdu-" + pairs.size;
      handle.setAttribute("aria-controls", roman.id + " " + urdu.id);
      grid.append(handle);
      pairs.set(grid, { grid, roman, urdu, handle });
      visible.observe(grid);

      let dragging = false;
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || grid.dataset.splitActive !== "true") return;
        event.preventDefault();
        dragging = true;
        handle.dataset.dragging = "true";
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const a = roman.getBoundingClientRect(), b = urdu.getBoundingClientRect();
        change(romanWidthFromPointer(event.clientX, a.left, b.right));
      });
      const finish = (event: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        delete handle.dataset.dragging;
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        change(percent, true);
      };
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
      handle.addEventListener("dblclick", () => change(DEFAULT_ROMAN_WIDTH, true));
      handle.addEventListener("keydown", (event) => {
        const step = event.shiftKey ? 5 : 1;
        const width = event.key === "ArrowLeft" ? percent - step
          : event.key === "ArrowRight" ? percent + step
          : event.key === "Home" ? MIN_ROMAN_WIDTH
          : event.key === "End" ? MAX_ROMAN_WIDTH : undefined;
        if (width === undefined) return;
        event.preventDefault();
        change(width, true);
      });
    }
    schedule();
  };

  root.style.setProperty("--reading-roman-share", percent + "fr");
  root.style.setProperty("--reading-urdu-share", (100 - percent) + "fr");
  install();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("kalam:columns-changed", schedule);
  window.addEventListener("basta:content-loaded", install);
  window.addEventListener("kalam:fonts-changed", schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);
  // Observing widths rather than verse heights avoids fitting/layout feedback loops.
  const widths = new WeakMap<Element, number>();
  const resize = new ResizeObserver((entries) => {
    if (entries.some((entry) => {
      const prior = widths.get(entry.target);
      widths.set(entry.target, entry.contentRect.width);
      return prior !== entry.contentRect.width;
    })) schedule();
  });
  resize.observe(root);
  // Recitation and streamed readers add their grids after initialization.
  new MutationObserver(install).observe(root, { childList: true, subtree: true });
}
