// DOM primitives and immutable ordering for the Recitation Set editor.
export const elm = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export const button = (title: string, callback: () => void, disabled = false, accessibleName?: string): HTMLButtonElement => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = title; b.disabled = disabled;
  if (accessibleName) b.setAttribute("aria-label", accessibleName);
  b.addEventListener("click", callback);
  return b;
};
export const div = (className: string, text?: string): HTMLDivElement => {
  const e = document.createElement("div"); e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};
export const option = (value: string, text: string): HTMLOptionElement => new Option(text, value);
export const move = <T>(items: T[], start: number, end: number): T[] => {
  const copy = items.slice();
  if (start < 0 || start >= copy.length || end < 0 || end >= copy.length) return copy;
  copy.splice(end, 0, copy.splice(start, 1)[0]);
  return copy;
};
