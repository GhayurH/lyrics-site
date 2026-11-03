// File role: Server-only Basta reader loader: consumes each page's optional Roman literal and produces streamable chunks around the printed index.
import { getCollection } from "astro:content";
import settings from "../data/basta/settings.json";
import { getBastaStanzaStyleForPage } from "./basta-categories";
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
  const visibleEntries = bookPages.filter(
    (entry) => entry.data.page < indexStartPage || entry.data.page > indexEndPage,
  );
  const lastVisiblePage = visibleEntries.at(-1)?.data.page;

  const pages: BastaReaderPageData[] = visibleEntries.map((entry) => {
    const romanText = (entry.data.romanLyrics ?? "").trim();
    return {
      page: entry.data.page,
      originalImage: entry.data.originalImage,
      imageOnly: entry.data.imageOnly,
      urduText: (entry.body ?? "").trim(),
      romanText,
      stanzaStyle: getBastaStanzaStyleForPage(entry.data.page),
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
