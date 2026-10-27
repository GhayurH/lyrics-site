// Float original scans beneath the visible toolbars only when text is beside them.
const SCANS = ".lyric-reading-grid > .lyric-reading-image, .basta-page-grid > .basta-original-page, .basta-reader-page-grid > .basta-reader-original-image, .recite-editions > .lyric-reading-image";

export function initFloatingScans(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  const controls = document.querySelector<HTMLElement>("[data-reading-controls]");
  if (!root || !controls || root.dataset.floatingScansReady === "true") return;
  root.dataset.floatingScansReady = "true";
  let scheduled = false;
  let clearance = -1;
  const bottom = (element: HTMLElement | null): number => {
    if (!element || getComputedStyle(element).visibility === "hidden") return 0;
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight ? rect.bottom : 0;
  };
  const updateClearance = () => {
    const next = Math.max(0, bottom(document.querySelector<HTMLElement>(".site-header")), bottom(controls)) + 8;
    if (Math.abs(next - clearance) >= 1) {
      clearance = next;
      root.style.setProperty("--reader-scan-clearance", next + "px");
    }
  };
  const refresh = () => {
    scheduled = false;
    const scans = Array.from(root.querySelectorAll<HTMLElement>(SCANS));
    for (const scan of scans) scan.dataset.floatingScan = "false";
    for (const scan of scans) {
      const parent = scan.parentElement;
      if (!parent || !scan.querySelector("img") || getComputedStyle(scan).display === "none" ||
          !root.dataset.readingColumns?.split(" ").includes("image")) continue;
      const rect = scan.getBoundingClientRect();
      const paired = Array.from(parent.children).some((sibling) => {
        if (sibling === scan || !(sibling instanceof HTMLElement) ||
            getComputedStyle(sibling).display === "none") return false;
        const other = sibling.getBoundingClientRect();
        return other.width > 0 && Math.abs(other.top - rect.top) < 20 &&
          Math.abs(other.left - rect.left) > 20;
      });
      if (paired) scan.dataset.floatingScan = "true";
    }
    updateClearance();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };
  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateClearance(); });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  root.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("kalam:columns-changed", schedule);
  window.addEventListener("basta:content-loaded", schedule);
  document.addEventListener("fullscreenchange", schedule);
  document.fonts.ready.then(schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-reading-focus"],
  });
  new MutationObserver(onScroll).observe(controls, {
    attributes: true, attributeFilter: ["data-regular-options-open", "data-reading-options-open"],
  });
  schedule();
}
