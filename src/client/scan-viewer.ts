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
    <div class="scan-viewer-message" role="status" aria-live="polite">
      <span data-scan-message>Loading scan…</span>
      <button type="button" data-scan-retry hidden>Retry scan</button>
      <a data-scan-original target="_blank" rel="noopener">Open original scan</a>
    </div>
    <div class="scan-viewer-canvas" tabindex="0" role="region"
      aria-label="Zoomable scan: drag to pan or use arrow keys">
      <div class="scan-viewer-stage"><img alt="" draggable="false" /></div>
    </div>`;
  document.body.append(dialog);

  const image = dialog.querySelector<HTMLImageElement>("img")!;
  const canvas = dialog.querySelector<HTMLElement>(".scan-viewer-canvas")!;
  const status = dialog.querySelector<HTMLElement>(".scan-viewer-zoom-value")!;
  const message = dialog.querySelector<HTMLElement>("[data-scan-message]")!;
  const retry = dialog.querySelector<HTMLButtonElement>("[data-scan-retry]")!;
  const original = dialog.querySelector<HTMLAnchorElement>("[data-scan-original]")!;
  const zoomButtons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-scan-zoom]"));
  type Zoom = "fit" | "actual" | "double" | "custom";
  let zoom: Zoom = "fit";
  let scale = 1;
  let sourceURL = "";
  let opener: HTMLAnchorElement | null = null;
  const setLoading = () => {
    message.textContent = "Loading scan…";
    retry.hidden = true;
    canvas.hidden = true;
    dialog.setAttribute("aria-busy", "true");
  };
  const load = () => {
    setLoading();
    image.removeAttribute("src");
    image.src = sourceURL;
  };

  const fitScale = (): number => {
    if (!image.naturalWidth || !image.naturalHeight) return 1;
    const width = Math.max(1, canvas.clientWidth - 16);
    const height = Math.max(1, canvas.clientHeight - 16);
    return Math.min(1, width / image.naturalWidth, height / image.naturalHeight);
  };
  const apply = (next: Zoom, desired?: number, anchor?: { x: number; y: number }) => {
    zoom = next;
    const viewport = canvas.getBoundingClientRect();
    const previous = image.getBoundingClientRect();
    const targetX = anchor?.x ?? canvas.clientWidth / 2;
    const targetY = anchor?.y ?? canvas.clientHeight / 2;
    const relativeX = previous.width
      ? Math.max(0, Math.min(1, (viewport.left + targetX - previous.left) / previous.width)) : .5;
    const relativeY = previous.height
      ? Math.max(0, Math.min(1, (viewport.top + targetY - previous.top) / previous.height)) : .5;
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
      if (next === "fit" || !previous.width || !previous.height) {
        canvas.scrollTo(0, 0);
      } else {
        // Measure the image after layout so a previously centred narrow image
        // zooms around its own centre rather than jumping to the far-right edge.
        const after = image.getBoundingClientRect();
        canvas.scrollLeft += after.left + after.width * relativeX - (viewport.left + targetX);
        canvas.scrollTop += after.top + after.height * relativeY - (viewport.top + targetY);
      }
    });
  };
  zoomButtons.forEach((button) => button.addEventListener("click",
    () => apply(button.dataset.scanZoom as Zoom)));
  dialog.querySelectorAll<HTMLButtonElement>("[data-scan-step]").forEach((button) =>
    button.addEventListener("click", () => apply("custom", scale * (button.dataset.scanStep === "1" ? 1.25 : .8))));
  image.addEventListener("load", () => {
    if (!dialog.open) return;
    dialog.setAttribute("aria-busy", "false");
    canvas.hidden = false;
    message.textContent = "Scan loaded.";
    retry.hidden = true;
    apply("fit");
  });
  image.addEventListener("error", () => {
    if (!dialog.open) return;
    dialog.setAttribute("aria-busy", "false");
    canvas.hidden = true;
    message.textContent = "The scan could not be loaded. Check your connection, retry, or open the original file.";
    retry.hidden = false;
  });
  retry.addEventListener("click", load);
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
    opener?.focus();
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
    opener = anchor;
    sourceURL = anchor.href;
    original.href = sourceURL;
    dialog.showModal();
    canvas.scrollTo(0, 0);
    // Loading resolves asynchronously, including for cached and cross-origin scans.
    load();
  }, true);

  // Inline failures remain recoverable without opening a broken full-screen view.
  const recoveries = new WeakMap<HTMLImageElement, HTMLElement>();
  const inlineError = (image: HTMLImageElement) => {
    if (dialog.contains(image) || !image.closest("[data-reading-root]")) return;
    const link = image.closest<HTMLAnchorElement>("a[href]");
    if (!link || recoveries.has(image)) return;
    const notice = document.createElement("div");
    notice.className = "scan-inline-error";
    notice.setAttribute("role", "status");
    const text = document.createElement("span"); text.textContent = "Scan unavailable. ";
    const again = document.createElement("button"); again.type = "button"; again.textContent = "Retry scan";
    const file = document.createElement("a"); file.href = link.href; file.target = "_blank"; file.rel = "noopener"; file.textContent = "Open original file";
    again.addEventListener("click", () => {
      text.textContent = "Retrying scan… ";
      const src = image.src; image.removeAttribute("src"); image.src = src;
    });
    notice.append(text, again, file); link.after(notice); recoveries.set(image, notice);
  };
  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) {
      const existing = recoveries.get(event.target);
      if (existing) existing.querySelector("span")!.textContent = "Scan unavailable. ";
      else inlineError(event.target);
    }
  }, true);
  document.addEventListener("load", (event) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    recoveries.get(event.target)?.remove(); recoveries.delete(event.target);
  }, true);
  document.querySelectorAll<HTMLImageElement>("[data-reading-root] img").forEach((image) => {
    if (image.complete && image.currentSrc && !image.naturalWidth) inlineError(image);
  });
}
