// Snapshot scroll positions independently of the Focus toolbar and history.
// The same anchor is restored when exiting or resizing, without verse re-layout.
import { pageAtReadingLine } from "./reading-position";

export type ReadingAnchor = { node: HTMLElement; top: number };
export type ReadingExitSnapshot = { anchor?: ReadingAnchor; page?: HTMLElement; pageNumber?: number };

/** Probe the actual visible element, not a stale hash or cached stanza index. */
export function visibleReadingAnchor(root: HTMLElement): ReadingAnchor | undefined {
  for (const y of [0.4, 0.65, 0.25]) {
    for (const x of [0.5, 0.75, 0.25]) {
      const candidate = document.elementFromPoint(innerWidth * x, innerHeight * y);
      if (!(candidate instanceof HTMLElement) || !root.contains(candidate)) continue;
      const node = candidate.closest<HTMLElement>(
        ".basta-kalam-text, .lyric-stanza, .basta-reader-page, .basta-original-page, .lyric-reading-panel",
      ) ?? candidate;
      return { node, top: node.getBoundingClientRect().top };
    }
  }
  return undefined;
}

/** Capture the mostly-visible printed page, preserving a finer stanza anchor. */
export function captureReadingExit(root: HTMLElement, continuous: boolean): ReadingExitSnapshot {
  const anchor = visibleReadingAnchor(root);
  if (!continuous) return { anchor };
  const bounds = root.getBoundingClientRect();
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-basta-page]"));
  const pageRects = pages.map((node) => {
    const rect = node.getBoundingClientRect();
    return { id: Number(node.dataset.bastaPage), top: rect.top, bottom: rect.bottom };
  });
  // A rotated viewport can leave only a sliver of the preceding page at its top.
  const visible = pageRects.map((item) => ({
    id: item.id,
    height: Math.max(0, Math.min(item.bottom, bounds.bottom) - Math.max(item.top, bounds.top)),
  })).sort((a, b) => b.height - a.height);
  const pageNumber = visible[0]?.height
    ? visible[0].id : pageAtReadingLine(pageRects, bounds.top, bounds.height);
  return { anchor, page: pages.find((node) => Number(node.dataset.bastaPage) === pageNumber), pageNumber };
}

/** Compensate only for layout delta; never assign an arbitrary scroll offset. */
export function restoreReadingAnchor(saved: ReadingAnchor | undefined, scroller: HTMLElement | Window): void {
  if (!saved?.node.isConnected) return;
  const delta = saved.node.getBoundingClientRect().top - saved.top;
  if (Math.abs(delta) < 1) return;
  if (scroller === window) window.scrollBy(0, delta);
  else (scroller as HTMLElement).scrollTop += delta;
}
