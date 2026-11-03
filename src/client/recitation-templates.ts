// Private organizer credentials and live positions never enter reusable templates.
import { emptyRecitationSet, validateRecitationSet, type RecitationSet } from "../lib/recitation-set.ts";
import type { CatalogItem } from "./recitation-catalog";
export interface ProgrammeTemplate { id: string; name: string; set: RecitationSet; suggestedTypes?: string[] }
const KEY = "kalam:recitation-templates-v1";
function starter(id: string,name: string,occasion: string,types: string[]): ProgrammeTemplate {
  return { id,name,suggestedTypes:types,
    set:{...emptyRecitationSet(),title:name,occasion,
      description:"Suggested sections (choose appropriate kalams): " + types.join(" → ") +
        ". Confirm programme order, readings, and assigned reciters before publication."} };
}
export const STARTER_TEMPLATES: ProgrammeTemplate[] = [
  starter("starter:majlis","Majlis","Majlis",["Salam","Marsiya","Noha"]),
  starter("starter:jashn","Jashn","Jashn",["Manqabat","Qita","Rubaiyat"]),
  starter("starter:general","General programme","",["Salam","Manqabat","Noha"]),
];
export function readTemplates(): ProgrammeTemplate[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY)||"[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is ProgrammeTemplate => typeof t?.id === "string" &&
      /^saved:[a-f0-9-]{36}$/.test(t.id) && typeof t.name === "string" &&
      t.name.length <= 120 && t.set?.version === 1 && Array.isArray(t.set.items)).slice(0,20);
  } catch { return []; }
}
export function findTemplate(id: string): ProgrammeTemplate | undefined {
  return [...STARTER_TEMPLATES,...readTemplates()].find((item) => item.id === id);
}
export function saveTemplate(name: string, source: RecitationSet): void {
  if (name.length < 1 || name.length > 120) throw Error("Name must be 1–120 characters");
  const set = structuredClone(source);
  delete set.live; delete set.permanent;
  if (!set.title.trim()) set.title = name;
  if (set.items.length) validateRecitationSet(set);
  localStorage.setItem(KEY,JSON.stringify([{id:"saved:"+crypto.randomUUID(),name,set},...readTemplates()].slice(0,20)));
}
export function removeTemplate(id: string): void {
  localStorage.setItem(KEY,JSON.stringify(readTemplates().filter((t)=>t.id!==id)));
}

/** Materialize an independent, unpublished programme from a reusable template.
 * Private publication capabilities, live pointers and permanent-retention flags
 * never carry over. Samples are deliberate choices from verified sources.
 */
export function materializeTemplate(
  template: ProgrammeTemplate, withSamples: boolean, catalog: Iterable<CatalogItem>,
): RecitationSet {
  const set = structuredClone(template.set);
  set.items = set.items.map(item => ({ ...item, uid: crypto.randomUUID() }));
  delete set.live;
  delete set.permanent;
  if (!withSamples) return set;
  const entries = Array.from(catalog);
  const selected = new Set<string>();
  for (const type of template.suggestedTypes || []) {
    const entry = entries.find(item =>
      item.ready && item.type === type && !selected.has(item.kind + ":" + item.id));
    if (!entry) continue;
    selected.add(entry.kind + ":" + entry.id);
    set.items.push({
      uid: crypto.randomUUID(), kind: entry.kind, id: entry.id, sourceTitle: entry.title,
      note: "Example selection for " + type + "; review before publishing",
    });
  }
  return set;
}
