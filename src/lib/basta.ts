// File role: Shared Basta data contracts and chunking helpers used by server routes, components, and the streaming reader client.
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

export interface BastaReaderPageData {
  page: number;
  originalImage: string;
  imageOnly: boolean;
  urduText: string;
  romanText: string;
  hasRoman: boolean;
  showBreak: boolean;
}

export interface BastaReaderChunk {
  id: string;
  startPage: number;
  endPage: number;
  pages: BastaReaderPageData[];
}

export const BASTA_READER_CHUNK_SIZE = 8;

export function chunkBastaPages(
  pages: BastaReaderPageData[],
  prefix: "before" | "after",
  size = BASTA_READER_CHUNK_SIZE,
): BastaReaderChunk[] {
  const chunks: BastaReaderChunk[] = [];

  for (let offset = 0; offset < pages.length; offset += size) {
    const slice = pages.slice(offset, offset + size);
    if (!slice.length) continue;
    chunks.push({
      id: `${prefix}-${Math.floor(offset / size)}`,
      startPage: slice[0].page,
      endPage: slice[slice.length - 1].page,
      pages: slice,
    });
  }

  return chunks;
}
