// Source-scan paging for individual Basta kalams. The poetry remains
// continuous; changing the printed source image never changes stanza IDs.
export function initBastaKalamScans(): void {
  document.querySelectorAll<HTMLElement>("[data-basta-scan-pages]").forEach((figure) => {
    if (figure.dataset.scanNavigationReady === "true") return;
    figure.dataset.scanNavigationReady = "true";

    const scans = Array.from(figure.querySelectorAll<HTMLAnchorElement>(
      ":scope > a[data-basta-scan-page]"));
    if (!scans.length) return;
    const previous = figure.querySelector<HTMLButtonElement>("[data-basta-scan-prev]");
    const next = figure.querySelector<HTMLButtonElement>("[data-basta-scan-next]");
    const status = figure.querySelector<HTMLElement>("[data-basta-scan-status]");
    const printedPage = figure.querySelector<HTMLAnchorElement>("[data-basta-scan-original]");
    let current = Math.max(0, scans.findIndex((scan) => !scan.hidden));

    /** Change the single visible scan without moving or re-rendering verses. */
    const select = (index: number, updateUrl = false) => {
      current = Math.max(0, Math.min(scans.length - 1, index));
      const active = scans[current];
      scans.forEach((scan, position) => { scan.hidden = position !== current; });
      const page = active.dataset.bastaScanPage ?? "";
      figure.dataset.activeSourcePage = page;
      if (previous) previous.disabled = current === 0;
      if (next) next.disabled = current === scans.length - 1;
      if (status) status.textContent = `Page ${page} · ${current + 1} of ${scans.length}`;
      if (printedPage) printedPage.href = `/basta/${page}/`;

      if (updateUrl) {
        // Replacing the fragment keeps a shareable source page without making
        // each scan click a separate Back-history entry or exiting Focus Mode.
        const url = new URL(location.href);
        url.hash = active.id;
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      }
    };

    /** Source-map links and direct #scan-page-NNN visits retain their meaning. */
    const selectFromHash = () => {
      const index = scans.findIndex((scan) => location.hash === `#${scan.id}`);
      if (index < 0) return;
      select(index);
      // The browser may have attempted to scroll to an initially hidden
      // target before hashchange; reveal it before bringing it into view.
      requestAnimationFrame(() => scans[index].scrollIntoView({ block: "nearest" }));
    };

    previous?.addEventListener("click", () => select(current - 1, true));
    next?.addEventListener("click", () => select(current + 1, true));
    window.addEventListener("hashchange", selectFromHash);

    select(current);
    selectFromHash();
  });
}
