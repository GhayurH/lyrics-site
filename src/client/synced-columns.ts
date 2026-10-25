// File role: Synchronize visible parallel reader panels. Basta uses kalam
// boundaries as anchors; other lyrics retain whole-column proportional scroll.
const ROOT = "[data-synced-scroll-root]";
const PANEL = "[data-synced-scroll-panel]";
const KALAM = ".basta-kalam-text";

const activeGroups = new WeakMap<HTMLElement, HTMLElement[]>();
const lastScrolled = new WeakMap<HTMLElement, HTMLElement>();
const expectedScroll = new WeakMap<HTMLElement, number>();
const stopsByPanel = new WeakMap<HTMLElement, number[]>();

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

function setPosition(panel: HTMLElement, position: number): void {
  const next = clamp(position, 0, scrollRange(panel));
  if (Math.abs(panel.scrollTop - next) < 0.75) return;
  expectedScroll.set(panel, next);
  panel.scrollTop = next;
}

export function alignPanels(group: HTMLElement[], fraction: number, source?: HTMLElement): void {
  const clamped = clamp(fraction, 0, 1);
  for (const panel of group) {
    if (panel !== source) setPosition(panel, scrollRange(panel) * clamped);
  }
}

/** Convert a scroll offset into (kalam index + progress within that kalam). */
export function segmentProgressAt(position: number, stops: number[]): number {
  const last = stops.length - 1;
  if (last <= 0 || position <= 0) return 0;
  if (position >= stops[last]) return last;
  for (let index = 0; index < last; index += 1) {
    if (position < stops[index + 1]) {
      const width = stops[index + 1] - stops[index];
      return index + (width > 0 ? clamp((position - stops[index]) / width, 0, 1) : 0);
    }
  }
  return last;
}

/** Locate the equivalent scroll offset in an edition with different heights. */
export function segmentOffsetAt(progress: number, stops: number[]): number {
  const last = stops.length - 1;
  if (last <= 0 || progress <= 0) return 0;
  if (progress >= last) return stops[last];
  const index = Math.floor(progress);
  return stops[index] + (stops[index + 1] - stops[index]) * (progress - index);
}

function measureKalamStops(panel: HTMLElement): number[] | undefined {
  const kalams = Array.from(panel.querySelectorAll<HTMLElement>(KALAM));
  if (kalams.length < 2) return undefined;

  const maximum = scrollRange(panel);
  const panelTop = panel.getBoundingClientRect().top;
  const stops = [0];
  for (const kalam of kalams.slice(1)) {
    // Place each new kalam around the lower portion of the viewport rather
    // than requiring its first line to reach the very top. This also handles
    // short closing kalams, such as the Bain on Basta page 138.
    const top = kalam.getBoundingClientRect().top - panelTop + panel.scrollTop;
    stops.push(Math.max(stops[stops.length - 1], clamp(top - panel.clientHeight * 0.7, 0, maximum)));
  }
  stops.push(maximum);
  return stops;
}

function segmentedEditions(group: HTMLElement[]): HTMLElement[] | undefined {
  const editions = group.filter((panel) => stopsByPanel.has(panel));
  if (editions.length !== 2) return undefined;
  return stopsByPanel.get(editions[0])!.length === stopsByPanel.get(editions[1])!.length
    ? editions
    : undefined;
}

function syncFromPanel(group: HTMLElement[], source: HTMLElement): void {
  const editions = segmentedEditions(group);
  if (!editions) {
    alignPanels(group, progressOf(source), source);
    return;
  }

  const fraction = progressOf(source);
  const reference = editions.find((panel) => panel.lang === "ur") ?? editions[0];
  // The scan has no text markers. Its physical percentage is interpreted
  // against the Urdu timeline, then translated to the other edition.
  const referenceOffset = editions.includes(source)
    ? source.scrollTop
    : scrollRange(reference) * fraction;
  const origin = editions.includes(source) ? source : reference;
  const semantic = segmentProgressAt(referenceOffset, stopsByPanel.get(origin)!);

  for (const panel of group) {
    if (panel === source) continue;
    if (editions.includes(panel)) {
      setPosition(panel, segmentOffsetAt(semantic, stopsByPanel.get(panel)!));
    } else {
      // Image scans remain globally proportional, since their kalam markers
      // cannot be determined reliably from the page image.
      setPosition(panel, scrollRange(panel) * fraction);
    }
  }
}

function refreshColumns(): void {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT)) {
    // Off-screen continuous pages retain their existing geometry until they
    // approach the viewport. Avoid forcing layout on hundreds of lazy pages.
    if (root.closest("[data-basta-stream]")) {
      const bounds = root.getBoundingClientRect();
      if (bounds.bottom < -600 || bounds.top > window.innerHeight + 600) continue;
    }
    const previous = activeGroups.get(root);
    const last = lastScrolled.get(root);
    const leader = previous?.includes(last!) ? last : previous?.[0];
    const oldFraction = leader ? progressOf(leader) : 0;
    const oldStops = leader && stopsByPanel.get(leader);
    const oldSemantic = leader && oldStops
      ? segmentProgressAt(leader.scrollTop, oldStops)
      : undefined;
    const panels = Array.from(root.querySelectorAll<HTMLElement>(PANEL));

    panels.forEach((panel) => {
      delete panel.dataset.syncedActive;
      panel.removeAttribute("tabindex");
      stopsByPanel.delete(panel);
    });
    activeGroups.delete(root);

    const readingRoot = root.closest<HTMLElement>("[data-reading-root]");
    if (readingRoot?.dataset.readingMode !== "parallel") continue;

    // Don't synchronize panels that have stacked at responsive breakpoints.
    const rows: Array<Array<{ panel: HTMLElement; top: number; left: number }>> = [];
    for (const panel of panels) {
      if (!panel.getClientRects().length || getComputedStyle(panel).display === "none") continue;
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
    if (!row) continue;

    const group = row.map((item) => item.panel);
    group.forEach((panel) => {
      panel.dataset.syncedActive = "true";
      panel.tabIndex = 0;
    });
    activeGroups.set(root, group);
    group.forEach((panel) => {
      const stops = measureKalamStops(panel);
      if (stops) stopsByPanel.set(panel, stops);
    });

    const source = leader && group.includes(leader) ? leader : group[0];
    const sourceStops = stopsByPanel.get(source);
    if (sourceStops && oldSemantic !== undefined) {
      setPosition(source, segmentOffsetAt(oldSemantic, sourceStops));
    } else {
      setPosition(source, scrollRange(source) * oldFraction);
    }
    syncFromPanel(group, source);
  }
}

/** Initialize proportional scrolling on lyrics and both Basta readers. */
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
    syncFromPanel(group, panel);
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(readingRoot, {
    attributes: true,
    attributeFilter: ["data-reading-mode", "data-reading-columns", "data-font-size", "data-line-spacing"],
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("basta:content-loaded", schedule);
  window.addEventListener("kalam:columns-changed", schedule);
  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest(ROOT)) schedule();
  }, true);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener?.("loadingdone", schedule);

  // Streaming chunks and content-visibility defer offscreen page geometry.
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
