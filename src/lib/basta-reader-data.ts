// File role: Server-only Basta reader loader: joins Urdu/Roman collections once and produces streamable page chunks around the physical index gap.
import { getCollection } from "astro:content";
import settings from "../data/basta/settings.json";
import {
  chunkBastaPages,
  type BastaReaderChunk,
  type BastaReaderPageData,
} from "./basta";

export interface BastaReaderDataset {
  beforeChunks: BastaReaderChunk[];
  afterChunks: BastaReaderChunk[];
  allChunks: BastaReaderChunk[];
}

export async function loadBastaReaderDataset(): Promise<BastaReaderDataset> {
  const { indexStartPage, indexEndPage } = settings;
  const bookPages = (
    await getCollection("basta", ({ data }) => data.published)
  ).sort((a, b) => a.data.page - b.data.page);
  const romanPages = await getCollection("bastaRoman", ({ data }) => data.published);
  const romanByPage = new Map(romanPages.map((entry) => [entry.data.page, entry]));

  const visibleEntries = bookPages.filter(
    (entry) => entry.data.page < indexStartPage || entry.data.page > indexEndPage,
  );
  const lastVisiblePage = visibleEntries.at(-1)?.data.page;

  const pages: BastaReaderPageData[] = visibleEntries.map((entry) => {
    const romanText = (romanByPage.get(entry.data.page)?.body ?? "").trim();
    return {
      page: entry.data.page,
      originalImage: entry.data.originalImage,
      imageOnly: entry.data.imageOnly,
      urduText: (entry.body ?? "").trim(),
      romanText,
      hasRoman: romanText.length > 0,
      showBreak: entry.data.page !== lastVisiblePage,
    };
  });

  const beforeChunks = chunkBastaPages(
    pages.filter((page) => page.page < indexStartPage),
    "before",
  );
  const afterChunks = chunkBastaPages(
    pages.filter((page) => page.page > indexEndPage),
    "after",
  );

  return { beforeChunks, afterChunks, allChunks: [...beforeChunks, ...afterChunks] };
}
