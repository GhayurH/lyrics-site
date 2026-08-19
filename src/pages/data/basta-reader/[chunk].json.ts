// File role: Pre-rendered continuous-reader chunk endpoint; each static JSON file contains a small contiguous set of Basta pages.
import type { APIRoute, GetStaticPaths } from "astro";
import type { BastaReaderChunk } from "../../../lib/basta";
import { loadBastaReaderDataset } from "../../../lib/basta-reader-data";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const { allChunks } = await loadBastaReaderDataset();
  return allChunks.map((chunk) => ({
    params: { chunk: chunk.id },
    props: { chunk },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const chunk = props.chunk as BastaReaderChunk;
  return new Response(JSON.stringify(chunk), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
