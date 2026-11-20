// Shared static pagination: the first page keeps its established public URL.
export const PAGE_SIZE = 60;

function positiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}

export function pageHref(basePath: string, page: number): string {
  positiveInteger(page, "Page");
  if (!basePath.startsWith("/") || basePath.startsWith("//") || /[?#]/.test(basePath))
    throw new TypeError("Pagination requires a root-relative path without a query or fragment");
  const base = basePath.replace(/\/+$/, "") + "/";
  return page === 1 ? base : `${base}page/${page}/`;
}

export function paginationRange(totalItems: number, page: number, pageSize = PAGE_SIZE) {
  positiveInteger(pageSize, "Page size");
  positiveInteger(page, "Page");
  if (!Number.isSafeInteger(totalItems) || totalItems < 0)
    throw new RangeError("Total items must be a nonnegative integer");
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (page > totalPages) throw new RangeError("Page is outside this collection");
  const offset = (page - 1) * pageSize;
  return {
    totalItems, totalPages, currentPage: page,
    startItem: totalItems ? offset + 1 : 0, endItem: Math.min(offset + pageSize, totalItems),
  };
}

export function paginateItems<T>(items: readonly T[], page: number, pageSize = PAGE_SIZE) {
  const range = paginationRange(items.length, page, pageSize);
  return { slice: items.slice((page - 1) * pageSize, page * pageSize), ...range };
}

/** A bounded link window preserves first/last access without hundreds of controls. */
export function paginationLinks(currentPage: number, totalPages: number): Array<number | null> {
  positiveInteger(totalPages, "Total pages");
  positiveInteger(currentPage, "Page");
  if (currentPage > totalPages) throw new RangeError("Page is outside this collection");
  const pages = new Set([1, totalPages]);
  for (let page = Math.max(1, currentPage - 2); page <= Math.min(totalPages, currentPage + 2); page++)
    pages.add(page);
  const ordered = [...pages].sort((a, b) => a - b);
  const links: Array<number | null> = [];
  for (const [index, page] of ordered.entries()) {
    const previous = ordered[index - 1];
    if (previous !== undefined && page - previous > 1) {
      if (page - previous === 2) links.push(previous + 1);
      else links.push(null);
    }
    links.push(page);
  }
  return links;
}
