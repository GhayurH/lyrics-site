// File role: Content collection contract: validates standalone lyrics and single-file bilingual Basta pages before Astro builds routes.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// A single editorial declaration for stanza length and six-line structure.
const stanzaPattern = z.union([
  z.number().int().min(1).max(12),
  z.enum(["4+2", "2+2+2"]),
]);

const lyrics = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/lyrics",
  }),

  schema: z.object({
    title: z.string(),
    alternateTitle: z.string().optional(),
    // Keep this permanent ID when renaming or relocating a lyric Markdown file.
    recitationId: z.string().regex(/^[\p{L}\p{N}_/-]{1,160}$/u).optional(),
    language: z.enum([
      "Urdu",
      "Arabic",
      "Persian",
      "English",
      "Balti",
      "Panjabi",
      "Saraiki",
    ]),
    // Script-specific codes label original language, never its Roman edition.
    // Unqualified pa/bft remain valid for Latin-script originals awaiting review.
    lang: z.enum(["ur", "ar", "fa", "en", "pa", "pa-Arab", "skr", "skr-Arab", "bft", "bft-Arab"]),
    direction: z.enum(["rtl", "ltr"]),
    poet: z.string().optional(),
    // A source may have multiple independently searchable reciters.
    reciter: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).nonempty()]).optional(),
    occasion: z.string().optional(),
    year: z.number().int().optional(),

    // Optional situational/context classification, e.g. "Sham-e-Ghariban",
    // "Shahadat Hazrat Abbas", etc. Roman form is useful for Latin-script UI.
    haal: z.string().optional(),
    romanHaal: z.string().optional(),

    // Multiple types are independent memberships (not a combined third type).
    kalamType: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).nonempty()]),

    tags: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),
    published: z.boolean().default(true),
    // Printed Basta page and the cross-reference wording (use both together).
    bastaPage: z.number().int().positive().optional(),
    bastaNote: z.enum(["original-selection", "additional-stanzas"]).optional(),
    romanLyrics: z.string().optional(),
    // Optional shared stanza length/layout, e.g. 2, 4, "4+2", "2+2+2".
    stanzaPattern: stanzaPattern.optional(),
    // Printed Urdu includes intentionally longer choral responses than Roman.
    stanzaLineExceptions: z.array(z.number().int().positive()).optional(),
  }),
});

const basta = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/basta/pages",
    retainBody: true,
  }),

  schema: z.object({
    // Actual printed book page. Page 56 is /basta/56/.
    page: z.number().int().positive(),
    originalImage: z.string(),
    imageOnly: z.boolean().default(false),
    contentKind: z.enum(["editorial-note", "english-appendix"]).optional(),
    romanExpected: z.boolean().optional(),
    continuationNote: z.string().optional(),
    // Only original transcriptions have this block; its absence is intentional.
    romanLyrics: z.string().optional(),
    // Page default. Individual ---***--- fragments may override by 1-based order.
    stanzaPattern: stanzaPattern.optional(),
    stanzaPatterns: z.record(z.string().regex(/^[1-9][0-9]*$/), stanzaPattern).optional(),
    published: z.boolean().default(true),
  }),
});

export const collections = {
  lyrics,
  basta,
};
