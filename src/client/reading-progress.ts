// File role: Track nearby visible Basta pages and preserve within-page reading progress locally.
import { readBastaPosition, writeBastaPosition } from "./storage";
import { pageAtReadingLine, pageOffsetFraction } from "./reading-position";

function resumeOffset(): number | undefined {
  const value = new URLSearchParams(location.search).get("resume");
  if (value === null || value.trim() === "") return undefined;
  const offset = Number(value);
  return Number.isFinite(offset) && offset >= 0 && offset <= 1 ? offset : undefined;
}

function restorePageOffset(page: HTMLElement, offset: number, scroller: Window | HTMLElement): void {
  // The same fraction of physical-page height works across portrait and landscape.
  const lineTop = scroller === window ? 0 : (scroller as HTMLElement).getBoundingClientRect().top;
  page.scrollIntoView({ block: "start", behavior: "instant" });
  const lineOffset = Math.min(100, (scroller === window ? innerHeight : (scroller as HTMLElement).clientHeight) * 0.25);
  const delta = page.getBoundingClientRect().height * offset - lineOffset + lineTop;
  if (scroller === window) window.scrollBy({ top: delta, behavior: "instant" });
  else (scroller as HTMLElement).scrollTop += delta;
}

export function initReadingProgress(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  if (!root || root.dataset.readingProgressReady === "true") return;
  const kind = root.dataset.readerKind;
  if (kind !== "basta-page" && kind !== "basta-continuous") return;
  root.dataset.readingProgressReady = "true";

  const resume = resumeOffset();
  if (kind === "basta-page") {
    const page = Number(root.dataset.bastaCurrentPage);
    const update = () => {
      if (!Number.isSafeInteger(page)) return;
      const scrollable = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const offset = scrollable ? Math.min(1, Math.max(0, scrollY / scrollable)) : 0;
      writeBastaPosition({ page, mode: "page", offset: Math.round(offset * 1000) / 1000 });
    };
    if (resume !== undefined) {
      const restore = () => window.scrollTo({ top: resume * Math.max(0, document.documentElement.scrollHeight - innerHeight), behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(restore));
      window.addEventListener("load", restore, { once: true });
    } else update();
    window.addEventListener("scroll", update, { passive: true });
    return;
  }

  const nearby = new Set<HTMLElement>();
  const observed = new WeakSet<HTMLElement>();
  let queued = false;
  let pendingRestore = resume !== undefined && /^#page-\d+$/.test(location.hash);
  let restored = false;

  const scroller = () => document.documentElement.dataset.readingFocus === "true" ? root : window;
  const update = () => {
    if (queued || pendingRestore) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const focus = document.documentElement.dataset.readingFocus === "true";
      const viewportTop = focus ? root.getBoundingClientRect().top : 0;
      const viewportHeight = focus ? root.clientHeight : innerHeight;
      // Only intersecting/neighbouring pages are measured on scroll, not the full book.
      const candidates = nearby.size ? [...nearby] : !("IntersectionObserver" in window)
        ? Array.from(root.querySelectorAll<HTMLElement>("[data-basta-page]")) : [];
      const rects = candidates.filter((node) => node.isConnected).map((node) => {
        const rect = node.getBoundingClientRect();
        return { id: Number(node.dataset.bastaPage), top: rect.top, bottom: rect.bottom, node };
      }).filter(({ bottom, top }) => bottom > viewportTop - viewportHeight && top < viewportTop + viewportHeight * 2);
      const page = pageAtReadingLine(rects, viewportTop, viewportHeight);
      const current = rects.find(({ id }) => id === page);
      if (!current || page === undefined) return;

      const readingLine = viewportTop + Math.min(100, viewportHeight * 0.25);
      const offset = pageOffsetFraction(current.top, current.bottom - current.top, readingLine);
      writeBastaPosition({ page, mode: "continuous", offset: Math.round(offset * 1000) / 1000 });
      const label = document.querySelector<HTMLElement>("[data-reading-current-page]");
      if (label) label.textContent = `Page ${page}`;
      const link = document.querySelector<HTMLAnchorElement>("[data-open-current-page]");
      if (link) link.href = `/basta/${page}/`;
    });
  };

  const restore = () => {
    if (!pendingRestore || restored) return;
    const target = root.querySelector<HTMLElement>(`#${CSS.escape(location.hash.slice(1))}`);
    if (!target) return;
    restored = true;
    pendingRestore = false;
    // Resolve the streamed hash first, then restore the fine-grained offset.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      restorePageOffset(target, resume!, scroller());
      const url = new URL(location.href);
      url.searchParams.delete("resume");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      update();
    }));
  };

  let observer: IntersectionObserver | undefined;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) continue;
        if (entry.isIntersecting) nearby.add(entry.target);
        else nearby.delete(entry.target);
      }
      update();
    }, { rootMargin: "120% 0px" });
  }
  const watchPages = () => {
    root.querySelectorAll<HTMLElement>("[data-basta-page]").forEach((node) => {
      if (observed.has(node)) return;
      observed.add(node);
      observer?.observe(node);
    });
    restore();
    update();
  };
  watchPages();
  window.addEventListener("basta:content-loaded", watchPages);
  window.addEventListener("basta:hash-resolved", restore);
  window.addEventListener("basta:hash-resolved", update);
  window.addEventListener("scroll", update, { passive: true });
  root.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  requestAnimationFrame(watchPages);
}

/** Resume at the last recorded location without changing canonical page URLs. */
export function initResumeBasta(): void {
  const pos = readBastaPosition();
  for (const item of document.querySelectorAll<HTMLAnchorElement>("[data-resume-basta]")) {
    const section = item.closest<HTMLElement>("[data-basta-resume-section]");
    if (section) section.hidden = !pos;
    if (!pos) { item.hidden = true; continue; }
    const offset = pos.offset === undefined ? "" : `?resume=${pos.offset}`;
    item.href = pos.mode === "continuous" ? `/basta/read/${offset}#page-${pos.page}`
      : `/basta/${pos.page}/${offset}`;
    item.textContent = `Continue Basta at page ${pos.page}`;
    item.hidden = false;
  }
}
