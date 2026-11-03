// Builder-specific controls and array reordering. Generic element creation
// comes from the same DOM primitive used by the progressive and recitation readers.
import { node } from "./dom";
export const elm = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export const button = (title: string, callback: () => void, disabled = false, accessibleName?: string): HTMLButtonElement => {
  const b = node("button", undefined, title);
  b.type = "button"; b.disabled = disabled;
  if (accessibleName) b.setAttribute("aria-label", accessibleName);
  b.addEventListener("click", callback);
  return b;
};
export const div = (className: string, text?: string): HTMLDivElement => {
  return node("div", className, text);
};
export const option = (value: string, text: string): HTMLOptionElement => new Option(text, value);
/** Return a new ordering so saving the draft never mutates a stale UI list. */
export const move = <T>(items: T[], start: number, end: number): T[] => {
  const copy = items.slice();
  if (start < 0 || start >= copy.length || end < 0 || end >= copy.length) return copy;
  copy.splice(end, 0, copy.splice(start, 1)[0]);
  return copy;
};
