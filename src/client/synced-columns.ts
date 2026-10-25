// File role: Synchronize independently scrolling parallel reading columns by
// percentage of each panel's available scroll distance (not pixel offset).
const ROOT = "[data-synced-scroll-root]";
const PANEL = "[data-synced-scroll-panel]";
const activeGroups = new WeakMap<HTMLElement, HTMLElement[]>();
const lastScrolled = new WeakMap<HTMLElement, HTMLElement>();
const expectedScroll = new WeakMap<HTMLElement, number>();

function progressOf(panel: HTMLElement): number {
  const range = Math.max(0, panel.scrollHeight - panel.clientHeight);
  return range === 0 ? 0 : Math.min(1, Math.max(0, panel.scrollTop / range));
}

function alignPanels(group: HTMLElement[], fraction: number, source?: HTMLElement): void {
  const clamped = Math.min(1, Math.max(0, fraction));
  for (const panel of group) {
    if (panel === source) continue;
    const maximum = Math.max(0, panel.scrollHeight - panel.clientHeight);
    const next = maximum * clamped;
    if (Math.abs(panel.scrollTop - next) < 0.75) continue;
    expectedScroll.set(panel, next);
    panel.scrollTop = next;
  }
}

function refreshColumns(): void {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT)) {
    // Capture position before temporarily removing scroll constraints.
    const previous = activeGroups.get(root);
    const leader = previous && (lastScrolled.get(root) ?? previous[0]);
    const progress = leader ? progressOf(leader) : 0;
    const panels = Array.from(root.querySelectorAll<HTMLElement>(PANEL));

    panels.forEach((panel) => {
      delete panel.dataset.syncedActive;
      panel.removeAttribute("tabindex");
    });
    activeGroups.delete(root);

    const readingRoot = root.closest<HTMLElement>("[data-reading-root]");
    if (readingRoot?.dataset.readingMode !== "parallel") continue;

    // CSS breakpoints stack panels. Synchronize only panels on the same
    // horizontal row; a scan stacked above the editions is excluded.
    const rows: Array<Array<{ panel: HTMLElement; top: number; left: number }>> = [];
    for (const panel of panels) {
      if (!panel.getClientRects().length || getComputedStyle(panel).display === "none") continue;
      const rect = panel.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const match = rows.find((row) => Math.abs(row[0].top - rect.top) < 24);
      const item = { panel, top: rect.top, left: rect.left };
      if (match) match.push(item);
      else rows.push([item]);
    }
    const row = rows.find((candidate) =>
      candidate.length >= 2 &&
      Math.max(...candidate.map((item) => item.left)) -
        Math.min(...candidate.map((item) => item.left)) >= 24,
    );
    if (!row) continue;

    const group = row.map((item) => item.panel);
    group.forEach((panel) => {
      panel.dataset.syncedActive = "true";
      panel.tabIndex = 0; // Keyboard users can scroll each visible region.
    });
    activeGroups.set(root, group);
    alignPanels(group, progress);
  }
}

/** Enable proportional scroll synchronization on lyric and Basta pages. */
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

  document.addEventListener("scroll", (event) => {
    const panel = event.target;
    if (!(panel instanceof HTMLElement) || !panel.matches(PANEL)) return;
    const root = panel.closest<HTMLElement>(ROOT);
    if (!root) return;
    const group = activeGroups.get(root);
    if (!group?.includes(panel)) return;

    const expected = expectedScroll.get(panel);
    if (expected !== undefined) {
      expectedScroll.delete(panel);
      if (Math.abs(panel.scrollTop - expected) < 1) return;
    }
    lastScrolled.set(root, panel);
    alignPanels(group, progressOf(panel), panel);
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(readingRoot, {
    attributes: true,
    attributeFilter: ["data-reading-mode", "data-font-size", "data-line-spacing"],
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest(ROOT)) schedule();
  }, true);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);

  // content-visibility and lazy chunks can defer offscreen page layout; when
  // a page enters the viewport, measure its columns at their actual widths.
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
