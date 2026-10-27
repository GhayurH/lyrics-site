// Shared mobile viewport query for JavaScript-only defaults.
// Reader stacking is container-based and stays in reading-columns.css.
export const MOBILE_VIEWPORT_QUERY = "(max-width: 700px)";

export function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}
