// File role: Preserve current Basta page across modes using browser-local storage.
import { readBastaPosition, writeBastaPosition } from "./storage";
import { pageAtReadingLine } from "./reading-position";

export function initReadingProgress(): void {
  const root = document.querySelector<HTMLElement>("[data-reading-root]");
  if (!root || root.dataset.readingProgressReady === "true") return;
  const kind = root.dataset.readerKind;
  if (kind !== "basta-page" && kind !== "basta-continuous") return;
  root.dataset.readingProgressReady = "true";

  if (kind === "basta-page") {
    const page = Number(root.dataset.bastaCurrentPage);
    if (Number.isSafeInteger(page)) writeBastaPosition({ page, mode: "page" });
    return;
  }

  let queued = false;
  const update = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const focus = document.documentElement.dataset.readingFocus === "true";
      const viewportTop = focus ? root.getBoundingClientRect().top : 0;
      const viewportHeight = focus ? root.clientHeight : window.innerHeight;
      const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-basta-page]"))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { id: Number(node.dataset.bastaPage), top: rect.top, bottom: rect.bottom };
        })
        .filter((entry) => entry.bottom > viewportTop - viewportHeight && entry.top < viewportTop + viewportHeight * 2);
      const page = pageAtReadingLine(pages, viewportTop, viewportHeight);
      if (page) {
        writeBastaPosition({ page, mode: "continuous" });
        const label = document.querySelector<HTMLElement>("[data-reading-current-page]");
        if (label) label.textContent = `Page ${page}`;
        const link = document.querySelector<HTMLAnchorElement>("[data-open-current-page]");
        if (link) link.href = `/basta/${page}/`;
      }
    });
  };
  window.addEventListener("scroll", update, { passive: true });
  root.addEventListener("scroll", update, { passive: true });
  window.addEventListener("basta:content-loaded", update);
  window.addEventListener("basta:hash-resolved", update);
  window.addEventListener("resize", update, { passive: true });
  if (!readBastaPosition()) update();
  else requestAnimationFrame(update);
}

/** Show the local resume link on browse and saved pages, without server tracking. */
export function initResumeBasta(): void {
  const pos = readBastaPosition();
  for (const item of document.querySelectorAll<HTMLAnchorElement>("[data-resume-basta]")) {
    if (!pos) { item.hidden = true; continue; }
    item.href = pos.mode === "continuous" ? `/basta/read/#page-${pos.page}` : `/basta/${pos.page}/`;
    item.textContent = `Continue Basta at page ${pos.page}`;
    item.hidden = false;
  }
}
