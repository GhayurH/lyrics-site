// File role: Give only the tallest side-by-side reading edition a local
// scrollbar. Shorter editions remain fully visible; stacked/single views use
// the normal page scroll.
const ROOT = "[data-synced-scroll-root]";
const PANEL = "[data-synced-scroll-panel]";

const scrollingByRoot = new WeakMap<HTMLElement, HTMLElement>();

function scrollRange(panel: HTMLElement): number {
  return Math.max(0, panel.scrollHeight - panel.clientHeight);
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.min(upper, Math.max(lower, value));
}

export function progressOf(panel: HTMLElement): number {
  const range = scrollRange(panel);
  return range === 0 ? 0 : clamp(panel.scrollTop / range, 0, 1);
}

/** The tallest edition scrolls within the full natural height of the next tallest. */
export function tallerPanelLayout(
  heights: number[],
): { index: number; height: number } | undefined {
  if (heights.length < 2) return undefined;
  const ranked = heights
    .map((height, index) => ({ index, height }))
    .sort((a, b) => b.height - a.height);
  // Nearly equal editions need no inner scrollbar.
  if (ranked[1].height < 1 || ranked[0].height - ranked[1].height <= 2) return undefined;
  return { index: ranked[0].index, height: ranked[1].height };
}

function refreshColumns(): void {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT)) {
    const readingRoot = root.closest<HTMLElement>("[data-reading-root]");
    // Stacked and single-column changes must clear scroll containers even
    // on streamed pages that are currently outside the viewport.
    if (readingRoot?.dataset.readingMode !== "parallel") {
      const panels = Array.from(root.querySelectorAll<HTMLElement>(PANEL));
      for (const panel of panels) {
        delete panel.dataset.syncedActive;
        delete panel.dataset.syncedScrollable;
        panel.style.removeProperty("height");
        panel.removeAttribute("tabindex");
      }
      scrollingByRoot.delete(root);
      returnToDocumentFlow(panels);
      continue;
    }
    // Streamed pages are measured when they enter the viewport, not while
    // content-visibility is deferring their layout.
    if (root.closest("[data-basta-stream]")) {
      const bounds = root.getBoundingClientRect();
      if (bounds.bottom < -600 || bounds.top > window.innerHeight + 600) continue;
    }

    const previous = scrollingByRoot.get(root);
    const fraction = previous ? progressOf(previous) : 0;
    const panels = Array.from(root.querySelectorAll<HTMLElement>(PANEL));
    for (const panel of panels) {
      delete panel.dataset.syncedActive;
      delete panel.dataset.syncedScrollable;
      panel.style.removeProperty("height");
      panel.removeAttribute("tabindex");
    }
    scrollingByRoot.delete(root);

    // A 'parallel' selection may actually stack at a responsive breakpoint.
    // Only editions physically occupying the same horizontal row are paired.
    const rows: Array<Array<{ panel: HTMLElement; top: number; left: number }>> = [];
    for (const panel of panels) {
      // A viewport-fixed scan is visual reference material, not a text scroller.
      if (panel.dataset.floatingScan === "true" ||
          !panel.getClientRects().length || getComputedStyle(panel).display === "none") continue;
      const rect = panel.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const row = rows.find((items) => Math.abs(items[0].top - rect.top) < 24);
      const item = { panel, top: rect.top, left: rect.left };
      if (row) row.push(item);
      else rows.push([item]);
    }
    const row = rows.find((items) =>
      items.length >= 2 &&
      Math.max(...items.map((item) => item.left)) -
        Math.min(...items.map((item) => item.left)) >= 24,
    );
    if (!row) {
      returnToDocumentFlow(panels);
      continue;
    }

    const group = row.map((item) => item.panel);
    // align-self:start prevents the grid from stretching the shorter edition
    // to the height of the taller one while natural heights are measured.
    group.forEach((panel) => { panel.dataset.syncedActive = "true"; });
    const heights = group.map((panel) =>
      Math.max(panel.scrollHeight, panel.getBoundingClientRect().height),
    );
    const layout = tallerPanelLayout(heights);
    if (!layout) {
      returnToDocumentFlow(panels);
      continue;
    }

    const taller = group[layout.index];
    taller.dataset.syncedScrollable = "true";
    taller.style.height = `${layout.height}px`;
    taller.tabIndex = 0;
    taller.scrollTop = scrollRange(taller) * fraction;
    scrollingByRoot.set(root, taller);
    for (const panel of panels) {
      if (panel !== taller) panel.scrollTop = 0;
    }
  }
}

function returnToDocumentFlow(panels: HTMLElement[]): void {
  for (const panel of panels) panel.scrollTop = 0;
}

/** Apply content-driven scrolling across lyrics and both Basta readers. */
export function initSyncedColumns(): void {
  const readingRoot = document.querySelector<HTMLElement>("[data-reading-root]");
  if (!readingRoot || readingRoot.dataset.syncedScrollReady === "true") return;
  readingRoot.dataset.syncedScrollReady = "true";

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshColumns();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(readingRoot, {
    attributes: true,
    attributeFilter: ["data-reading-mode", "data-reading-columns", "data-font-size", "data-line-spacing"],
  });
  // Focus mode changes the available width and the image's intrinsic height.
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-reading-focus"],
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  window.addEventListener("kalam:columns-changed", schedule);
  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest(ROOT)) schedule();
  }, true);
  window.addEventListener("kalam:fonts-changed", schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);

  if ("IntersectionObserver" in window) {
    const observed = new WeakSet<HTMLElement>();
    const intersection = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) schedule();
    }, { rootMargin: "400px 0px" });
    const watchPages = () => {
      for (const page of document.querySelectorAll<HTMLElement>(ROOT)) {
        if (!observed.has(page)) {
          observed.add(page);
          intersection.observe(page);
        }
      }
    };
    watchPages();
    window.addEventListener("basta:content-loaded", watchPages);
  }
  schedule();
}
