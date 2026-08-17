# Lyric metadata

Normal lyric Markdown supports these optional catalogue fields:

```yaml
category: "Noha"
kalamType: "Rukhsat"
poet: "Example poet"
reciter: "Example reciter"
occasion: "Muharram"
tags:
  - "Imam Hussain"
  - "Karbala"
```

## Category fallback for existing files

Existing lyrics do not need to be edited before the site builds.

If `category` is missing, the site checks existing tags for common category
names and spelling variants, including:

- Noha / Nauha
- Salam / Salaam
- Manqabat
- Marsiya
- Soz
- Qasida / Qaseeda
- Munajat
- Dua

If none matches, the lyric appears under **Uncategorized**.

If `kalamType` is missing, the UI falls back to the resolved category. This
keeps search usable immediately while still allowing finer classification as
the catalogue is cleaned up.

## Recommended convention

Use `category` for the broad shelf visitors browse: `Noha`, `Salam`,
`Manqabat`, etc.

Use `kalamType` for a finer formal or practical classification when useful,
for example `Rukhsat`, `Shahadat`, or another classification you decide to
standardize.

Use `tags` for people, events, subjects, places, themes, and other
cross-cutting metadata.

Poet, reciter, occasion, category, kalam type, language, and tags become
clickable search filters on lyric pages.

## Metadata audit

Run:

```bash
npm run audit:metadata
```

The audit reports, per published lyric:

- unresolved / inferred categories
- missing `kalamType`
- missing tags
- missing poet
- missing Roman Urdu transliteration
- missing alternate/Roman title

It is informational by default and exits successfully, so it can be run while
the archive is still being catalogued.

For a CI-style failure when warning-level issues remain:

```bash
npm run audit:metadata -- --strict
```

For machine-readable output:

```bash
npm run audit:metadata -- --json
```
