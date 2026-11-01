// Private organizer credentials and live positions never enter reusable templates.
import { emptyRecitationSet, validateRecitationSet, type RecitationSet } from "../lib/recitation-set";
export interface ProgrammeTemplate { id: string; name: string; set: RecitationSet }
const KEY = "kalam:recitation-templates-v1";
function starter(id: string,name: string,occasion: string): ProgrammeTemplate {
  return { id,name,set:{...emptyRecitationSet(),title:name,occasion,description:""} };
}
export const STARTER_TEMPLATES: ProgrammeTemplate[] = [
  starter("starter:majlis","Majlis","Majlis"),
  starter("starter:jashn","Jashn","Jashn"),
  starter("starter:general","General programme",""),
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
