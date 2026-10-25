// File role: Lightweight, keyboard-accessible scan enlargement for every reading mode.
export function initScanViewer(): void {
  if (document.documentElement.dataset.scanViewerReady === "true") return;
  document.documentElement.dataset.scanViewerReady = "true";

  const dialog = document.createElement("dialog");
  dialog.className = "scan-viewer";
  dialog.setAttribute("aria-label", "Original page scan");
  dialog.innerHTML = `
    <div class="scan-viewer-toolbar">
      <strong>Original scan</strong>
      <div role="group" aria-label="Image zoom">
        <button type="button" data-scan-zoom="fit" aria-pressed="true">Fit</button>
        <button type="button" data-scan-zoom="actual" aria-pressed="false">100%</button>
        <button type="button" data-scan-zoom="double" aria-pressed="false">200%</button>
        <button type="button" data-scan-close>Close</button>
      </div>
    </div>
    <div class="scan-viewer-canvas"><img alt="" /></div>`;
  document.body.append(dialog);

  const image = dialog.querySelector<HTMLImageElement>("img")!;
  const canvas = dialog.querySelector<HTMLElement>(".scan-viewer-canvas")!;
  const zoomButtons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-scan-zoom]"));
  const setZoom = (level: string) => {
    canvas.dataset.zoom = level;
    // Native pixels rather than percentages of the current viewport.
    image.style.width = level === "fit" || !image.naturalWidth
      ? "" : `${image.naturalWidth * (level === "double" ? 2 : 1)}px`;
    image.style.height = "auto";
    canvas.scrollTo({ top: 0, left: 0 });
    for (const button of zoomButtons) button.setAttribute("aria-pressed", String(button.dataset.scanZoom === level));
  };
  zoomButtons.forEach((button) => button.addEventListener("click", () => setZoom(button.dataset.scanZoom ?? "fit")));
  image.addEventListener("load", () => setZoom(canvas.dataset.zoom || "fit"));
  dialog.querySelector("[data-scan-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { image.removeAttribute("src"); });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>(".scan-viewer-trigger, .basta-original-page a, .lyric-reading-image a");
    const imageNode = anchor?.querySelector<HTMLImageElement>("img");
    if (!anchor || !imageNode) return;
    event.preventDefault();
    event.stopPropagation();
    image.src = anchor.href;
    image.alt = imageNode.alt;
    setZoom("fit");
    dialog.showModal();
  }, true);
}
