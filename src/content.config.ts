import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const lyrics = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/lyrics",
  }),

  schema: z.object({
    title: z.string(),
    alternateTitle: z.string().optional(),

    // Displayed in filters
    language: z.enum([
      "Urdu",
      "Roman Urdu",
      "Arabic",
      "Persian",
      "English",
    ]),

    // HTML language code
    lang: z.enum(["ur", "ar", "fa", "en"]),

    direction: z.enum(["rtl", "ltr"]),

    poet: z.string().optional(),
    reciter: z.string().optional(),
    occasion: z.string().optional(),
    year: z.number().int().optional(),

    tags: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),

    cover: z.string().optional(),
    coverAlt: z.string().default(""),

    published: z.boolean().default(true),
    romanLyrics: z.string().optional(),
  }),
});

export const collections = {
  lyrics,
};
