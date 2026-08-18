# Lyric metadata

Normal lyric Markdown now has **one** browse classification: `kalamType`.

```yaml
kalamType: "Noha"
poet: "Example poet"
reciter: "Example reciter"
occasion: "Muharram"
tags:
  - "Imam Hussain"
  - "Karbala"
```

## Kalam Type

Use `kalamType` for the main kind of kalam visitors browse, for example:

- Noha
- Salam
- Manqabat
- Marsiya
- Soz
- Qasida
- Munajat
- Dua

There is no separate Category concept in the UI or search anymore.

### Existing files

Existing lyrics do not need to be migrated immediately.

For compatibility, the site resolves Kalam Type in this order:

1. legacy `category`, if present
2. a recognised explicit `kalamType`
3. a recognised existing tag such as `Noha` or `Salam`
4. another explicit `kalamType`
5. `Uncategorized`

The old `category` field is therefore still accepted by the schema only as a
migration bridge. New or cleaned-up files should use `kalamType` and omit
`category`.

## Tags and other metadata

Use `tags` for people, events, subjects, places, themes, and other
cross-cutting metadata. Do not duplicate `kalamType` as a tag once a file has
been cleaned up unless the tag is useful independently.

Poet, reciter, occasion, Kalam Type, language, and tags become clickable search
filters on lyric pages.

## Metadata audit

Run:

```bash
npm run audit:metadata
```

The audit reports, per published lyric:

- unresolved Kalam Type
- legacy `category` fields that should be migrated
- Kalam Type inferred only from tags
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
