// File role: Choose the actual visible Basta page for seamless Reading Mode exit.
export interface PageRect { id: number; top: number; bottom: number }

/** Prefer the page crossing the upper reading line, otherwise most visible. */
export function pageAtReadingLine(
  pages: readonly PageRect[],
  viewportTop: number,
  viewportHeight: number,
): number | undefined {
  const viewportBottom = viewportTop + viewportHeight;
  const line = viewportTop + Math.min(100, viewportHeight * 0.25);
  const valid = pages.filter((page) => Number.isSafeInteger(page.id) && page.bottom > page.top);
  const atLine = valid.find((page) => page.top <= line && page.bottom > line);
  if (atLine) return atLine.id;
  const overlap = valid
    .map((page) => ({
      id: page.id,
      visible: Math.max(0, Math.min(page.bottom, viewportBottom) - Math.max(page.top, viewportTop)),
    }))
    .sort((a, b) => b.visible - a.visible);
  return overlap[0]?.visible ? overlap[0].id : undefined;
}
