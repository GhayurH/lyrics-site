// Focus-mode position anchors are separate from toolbar and history state.
export type ReadingAnchor = { node: HTMLElement; top: number };

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
export function restoreReadingAnchor(saved: ReadingAnchor | undefined, scroller: HTMLElement | Window): void {

  if (!saved?.node.isConnected) return;
  const delta = saved.node.getBoundingClientRect().top - saved.top;
  if (Math.abs(delta) < 1) return;
  if (scroller === window) window.scrollBy(0, delta);
  else (scroller as HTMLElement).scrollTop += delta;

}
