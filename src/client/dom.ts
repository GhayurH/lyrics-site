/** Accessible DOM creation primitive for client-side renderers.
 * Server-rendered Astro components keep using HTML; callers own behavior,
 * attributes and event listeners, so this stays deliberately small.
 */
export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
