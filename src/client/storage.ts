// File role: Browser-local persistence primitives for theme-independent user state such as favorites, recents, and reader preferences.
export const STORAGE_KEYS = {
  favorites: "kalam:favorites",
  recent: "kalam:recent",
  readingPrefs: "kalam:reading-prefs",
  bastaPosition: "kalam:basta-position",
  bastaBookmarks: "kalam:basta-bookmarks",
  bastaSelections: "kalam:basta-selections",
} as const;

export function readStringList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeStringList(key: string, values: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {}
}

export function readRecord(key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function writeRecord(key: string, value: Record<string, unknown>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readFavoriteIds(): string[] {
  return readStringList(STORAGE_KEYS.favorites);
}

/** Toggle one lyric ID and return the new favorites list in display order. */
export function toggleFavorite(id: string): string[] {
  const favorites = readFavoriteIds();
  const index = favorites.indexOf(id);

  if (index === -1) favorites.unshift(id);
  else favorites.splice(index, 1);

  writeStringList(STORAGE_KEYS.favorites, favorites);
  return favorites;
}

export function clearFavorites(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.favorites);
  } catch {}
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.recent);
  } catch {}
}

/** Record a lyric as recently viewed while keeping the browser-local list bounded. */
export function recordRecentLyric(id: string, limit = 20): string[] {
  if (!id) return readStringList(STORAGE_KEYS.recent);

  const recent = readStringList(STORAGE_KEYS.recent).filter(
    (value) => value !== id,
  );
  recent.unshift(id);
  const bounded = recent.slice(0, limit);
  writeStringList(STORAGE_KEYS.recent, bounded);
  return bounded;
}

/** Last visited Basta page, retained locally without storing individual reading activity. */
export interface BastaPosition extends Record<string, unknown> { page: number; mode: "page" | "continuous"; offset?: number }
export function readBastaPosition(): BastaPosition | undefined {
  const value = readRecord(STORAGE_KEYS.bastaPosition);
  if (typeof value.page !== "number" || !Number.isSafeInteger(value.page) || value.page < 1 || value.page > 1000) return;
  if (value.mode !== "page" && value.mode !== "continuous") return;
  return {
    page: value.page, mode: value.mode,
    ...(typeof value.offset === "number" && Number.isFinite(value.offset) && value.offset >= 0 && value.offset <= 1
      ? { offset: value.offset } : {}),
  };
}
export function writeBastaPosition(position: BastaPosition): void {
  const current = readBastaPosition();
  if (current?.page === position.page && current.mode === position.mode &&
      Math.abs((current.offset ?? 0) - (position.offset ?? 0)) < 0.005) return;
  writeRecord(STORAGE_KEYS.bastaPosition, position);
  window.dispatchEvent(new Event("kalam:reading-progress"));
}
