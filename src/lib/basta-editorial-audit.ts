// Non-destructive editorial diagnostics. Absence of a Roman edition can be intentional.
import { splitBastaSource, type BastaKalamIndex, type BastaSourcePage } from "./basta-kalam-units.ts";

export interface BastaEditorialFindings {
  duplicateIndexEntries: string[];
  absentRomanTranscriptions: number[];
  mismatchedPageBoundaries: number[];
  missingRomanTitles: string[];
  nonMonotonicSectionNumbers: string[];
}
export function auditBastaEditorial(index: BastaKalamIndex[], pages: BastaSourcePage[]): BastaEditorialFindings {
  const seen = new Set<string>();
  const duplicateIndexEntries: string[] = [], missingRomanTitles: string[] = [];
  const nonMonotonicSectionNumbers: string[] = [];
  const lastNumber = new Map<string,number>();
  for (const entry of index) {
    if (!Number.isSafeInteger(entry.number)) continue;
    const section = entry.sectionRoman || entry.section || "Uncategorized";
    const key = section + ":" + entry.number;
    if (seen.has(key)) duplicateIndexEntries.push(key);
    seen.add(key);
    if (entry.sectionRoman !== "Mazameen" && !entry.romanName?.trim())
      missingRomanTitles.push(key);
    const previous = lastNumber.get(section);
    if (previous !== undefined && entry.number! <= previous)
      nonMonotonicSectionNumbers.push(key);
    lastNumber.set(section,entry.number!);
  }
  const mismatchedPageBoundaries: number[] = [], absentRomanTranscriptions: number[] = [];
  for (const page of pages) {
    if (!page.roman?.trim()) {
      absentRomanTranscriptions.push(page.page);
      continue;
    }
    if (splitBastaSource(page.urdu).length !== splitBastaSource(page.roman).length)
      mismatchedPageBoundaries.push(page.page);
  }
  return { duplicateIndexEntries, absentRomanTranscriptions, mismatchedPageBoundaries,
    missingRomanTitles, nonMonotonicSectionNumbers };
}
