// File role: Keyboard-accessible scan enlargement with centred fit, two-axis zoom, and drag-to-pan.
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
        <button type="button" data-scan-step="-1" aria-label="Zoom out">−</button>
        <span class="scan-viewer-zoom-value" role="status" aria-live="off">Fit</span>
        <button type="button" data-scan-step="1" aria-label="Zoom in">+</button>
        <button type="button" data-scan-close>Close</button>
      </div>
    </div>
    <div class="scan-viewer-canvas" tabindex="0" role="region"
      aria-label="Zoomable scan: drag to pan or use arrow keys">
      <div class="scan-viewer-stage"><img alt="" draggable="false" /></div>
    </div>`;
  document.body.append(dialog);

  const image = dialog.querySelector<HTMLImageElement>("img")!;
  const canvas = dialog.querySelector<HTMLElement>(".scan-viewer-canvas")!;
  const status = dialog.querySelector<HTMLElement>(".scan-viewer-zoom-value")!;
  const zoomButtons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-scan-zoom]"));
  type Zoom = "fit" | "actual" | "double" | "custom";
  let zoom: Zoom = "fit";
  let scale = 1;

  const fitScale = (): number => {
    if (!image.naturalWidth || !image.naturalHeight) return 1;
    const width = Math.max(1, canvas.clientWidth - 16);
    const height = Math.max(1, canvas.clientHeight - 16);
    return Math.min(1, width / image.naturalWidth, height / image.naturalHeight);
  };
  const apply = (next: Zoom, desired?: number, anchor?: { x: number; y: number }) => {
    zoom = next;
    const previousWidth = image.getBoundingClientRect().width;
    const previousHeight = image.getBoundingClientRect().height;
    const priorX = canvas.scrollLeft + (anchor?.x ?? canvas.clientWidth / 2);
    const priorY = canvas.scrollTop + (anchor?.y ?? canvas.clientHeight / 2);
    scale = next === "fit" ? fitScale() : next === "actual" ? 1
      : next === "double" ? 2 : Math.max(.1, Math.min(6, desired ?? scale));
    canvas.dataset.zoom = next;
    for (const button of zoomButtons)
      button.setAttribute("aria-pressed", String(button.dataset.scanZoom === next));
    status.textContent = next === "fit" ? "Fit" : Math.round(scale * 100) + "%";
    if (!image.naturalWidth) return;
    image.style.width = Math.round(image.naturalWidth * scale) + "px";
    image.style.height = "auto";
    // Keep the point beneath the cursor (or centre) stationary when zooming.
    requestAnimationFrame(() => {
      if (!dialog.open) return;
      if (next === "fit" || !previousWidth || !previousHeight) {
        canvas.scrollTo(0, 0);
      } else {
        const ratioX = (image.getBoundingClientRect().width / previousWidth);
        const ratioY = (image.getBoundingClientRect().height / previousHeight);
        canvas.scrollLeft = priorX * ratioX - (anchor?.x ?? canvas.clientWidth / 2);
        canvas.scrollTop = priorY * ratioY - (anchor?.y ?? canvas.clientHeight / 2);
      }
    });
  };
  zoomButtons.forEach((button) => button.addEventListener("click",
    () => apply(button.dataset.scanZoom as Zoom)));
  dialog.querySelectorAll<HTMLButtonElement>("[data-scan-step]").forEach((button) =>
    button.addEventListener("click", () => apply("custom", scale * (button.dataset.scanStep === "1" ? 1.25 : .8))));
  image.addEventListener("load", () => apply("fit"));
  new ResizeObserver(() => { if (dialog.open && zoom === "fit") apply("fit"); }).observe(canvas);

  // Pointer capture supports mouse, pen, and touch panning without navigating the page.
  let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || (canvas.scrollWidth <= canvas.clientWidth &&
        canvas.scrollHeight <= canvas.clientHeight)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: canvas.scrollLeft, top: canvas.scrollTop };
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = "true";
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    canvas.scrollLeft = drag.left - (event.clientX - drag.x);
    canvas.scrollTop = drag.top - (event.clientY - drag.y);
  });
  const endDrag = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = undefined;
    delete canvas.dataset.dragging;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", () => {
    drag = undefined; delete canvas.dataset.dragging;
  });
  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return; // Unmodified wheel keeps native panning.
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    apply("custom", scale * (event.deltaY < 0 ? 1.2 : 1 / 1.2),
      { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });
  canvas.addEventListener("keydown", (event) => {
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-70, 0], ArrowRight: [70, 0], ArrowUp: [0, -70], ArrowDown: [0, 70],
    };
    const direction = delta[event.key];
    if (!direction) return;
    event.preventDefault();
    canvas.scrollBy({ left: direction[0], top: direction[1] });
  });
  dialog.querySelector("[data-scan-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    image.style.removeProperty("width");
    drag = undefined;
    delete canvas.dataset.dragging;
  });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>(
      ".scan-viewer-trigger, .basta-original-page a, .lyric-reading-image a");
    const source = anchor?.querySelector<HTMLImageElement>("img");
    if (!anchor || !source) return;
    event.preventDefault();
    event.stopPropagation();
    image.alt = source.alt;
    dialog.showModal();
    canvas.scrollTo(0, 0);
    // Loading resolves asynchronously, including for cached and cross-origin scans.
    image.src = anchor.href;
    if (image.complete && image.naturalWidth) apply("fit");
  }, true);
}
