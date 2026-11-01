// Stable individual-kalam bookmark IDs, independent of printed-page position.
import { STORAGE_KEYS, readRecord, writeRecord } from "./storage";
export interface BastaKalamFavorite { id: string; title: string }
const isKalamId = (id: string): boolean => /^basta-[a-z0-9-]{1,120}$/.test(id);
export function readBastaKalamFavorites(): BastaKalamFavorite[] {
  return Object.entries(readRecord(STORAGE_KEYS.bastaKalamFavorites))
    .filter(([id,title]) => isKalamId(id) && typeof title === "string" && title.length <= 180)
    .slice(0,200).map(([id,title]) => ({ id,title:title as string }));
}
export function removeBastaKalamFavorite(id: string): void {
  const entries = readRecord(STORAGE_KEYS.bastaKalamFavorites);
  delete entries[id]; writeRecord(STORAGE_KEYS.bastaKalamFavorites, entries);
  window.dispatchEvent(new Event("kalam:basta-kalam-favorites-changed"));
}
export function initBastaKalamFavorites(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-basta-kalam-favorite]").forEach((button) => {
    const id = button.dataset.kalamId || "";
    if (!isKalamId(id)) return;
    const update = () => {
      const saved = readBastaKalamFavorites().some((item) => item.id === id);
      button.textContent = saved ? "Saved kalam" : "Save kalam";
      button.setAttribute("aria-pressed", String(saved));
    };
    button.addEventListener("click", () => {
      const entries = readRecord(STORAGE_KEYS.bastaKalamFavorites);
      if (Object.hasOwn(entries,id)) delete entries[id];
      else entries[id] = (button.dataset.kalamTitle || id).slice(0,180);
      writeRecord(STORAGE_KEYS.bastaKalamFavorites, entries);
      window.dispatchEvent(new Event("kalam:basta-kalam-favorites-changed"));
      update();
    });
    window.addEventListener("storage", update);
    update();
  });
}
