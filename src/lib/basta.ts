// File role: Shared Basta data model used by index pages and components.
export interface BastaIndexEntry {
  section?: string;
  sectionRoman?: string;
  number?: number;
  name: string;
  haal?: string;
  page: number;
  romanName?: string;
  romanHaal?: string;
}
