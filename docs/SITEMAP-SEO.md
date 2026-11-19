# Sitemap verification and HTML indexing

## What the sitemap contains

Astro generates `dist/sitemap-index.xml` and its child `sitemap-N.xml`
files during `astro build`. Published lyric routes, Basta printed pages,
verified Basta kalam routes, and categories are all static HTML routes. Only
published Markdown items are rendered by the collection loaders.

As of 19 November 2026, the main branch contains **3,349 lyric Markdown
files** and **454 Basta page files**. File totals are not Google indexing
totals; the build audit checks the actual published counts.

Search Console showed `sitemap-index.xml` last read on November 14 with
593 discovered URLs, and a separately submitted `sitemap-0.xml` last read
on October 27 with 601 URLs. These are Google's previously processed
sitemap counts, not a measurement of the current build. They cannot be
used to conclude the deployed sitemap contains only 593 URLs.

## Checks

`npm run build` automatically executes `scripts/verify-sitemap.mjs` after
Astro renders the HTML but before Pagefind builds its index. The verifier:

- Reads the sitemap index and every child sitemap.
- Rejects malformed children, duplicate URLs, off-site links, query strings,
  and fragments.
- Compares every generated HTML route with every sitemap URL in both
  directions, catching missing pages and stale/unbuilt URLs.
- Compares the number of lyric and printed Basta routes against the
  published Markdown files, so missing pages cannot hide behind the sitemap.

To rerun without rebuilding:

```sh
npm run sitemap:verify
```

After deploying **the same commit** used to build the local `dist/` folder,
compare the *live* sitemap with the local built inventory:

```sh
npm run sitemap:verify:live
```

This deliberately fails if the production sitemap is stale or omits a
published route from that build. Rebuild from the deployed commit before
interpreting a live mismatch.

## Search text and SEO metadata

Standalone lyrics and verified individual Basta kalams now mark their
visible verses with `data-pagefind-body` rather than adding another hidden
copy of the same poem. Pagefind metadata and alias filters remain separate.
Printed Basta pages intentionally retain their *unclaimed-fragment-only*
Pagefind source, because indexing all displayed verses would recreate
duplicate local-search results for independently indexed Basta kalams.

The HTML title and description now include available Urdu and Roman titles,
and the base layout provides Open Graph metadata. This does not promise
Google indexing or imply that the poems are duplicates.

## Search Console

Submit only `https://kalamarchive.com/sitemap-index.xml`. Google may take
time to reprocess its children, and successful sitemap processing does not
guarantee indexing. Investigate exclusions separately from route coverage.

## Live comparison limitation observed on 19 November 2026

An independent GitHub Actions request for the deployed
`https://kalamarchive.com/sitemap-index.xml` returned HTTP 403 with
`cf-mitigated: challenge`, from Cloudflare, even with a browser-like
user agent. This prevented an independent XML count from that runner.
It does **not** show that Googlebot is blocked: Search Console had
successfully processed the sitemap index, and its URL inspections
reported successful Googlebot page fetches.

If the live comparison returns 403, inspect Cloudflare Security Events
for the `/sitemap-index.xml` request and check whether verified Googlebot
is being challenged. Do not disable site-wide bot security on the basis
of blocked GitHub Actions requests alone.

The local build-time sitemap verification succeeded: **4,359** generated
URLs, including **3,349** published standalone lyrics and **454** printed
Basta pages, with every generated HTML route represented.
