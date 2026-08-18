# Lyric metadata

Normal lyric Markdown has one browse classification, `kalamType`, plus optional
cross-cutting metadata such as `haal`.

```yaml
kalamType: "Marsiya"
haal: "شہادت حضرت عباس"
romanHaal: "Shahadat Hazrat Abbas"
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

## Haal

`haal` is an optional situational/context classification. It is separate from
Kalam Type: several Marsiyas, Nohas, Salams, etc. can share the same Haal.

Use:

```yaml
haal: "شام غریباں"
romanHaal: "Sham-e-Ghariban"
```

`romanHaal` is optional. When present it is used as the display/filter label in
the Latin-script search UI; otherwise the Urdu `haal` value is used.

Haal is supported for both normal lyrics and Basta. In Basta, the generated
index is future-proof: each section automatically gets a Haal column if any
entry in that section contains Haal, and remains a three-column
Serial / Name / Page table otherwise.

## Tags and other metadata

Use `tags` for people, events, subjects, places, themes, and other
cross-cutting metadata. Do not duplicate `kalamType` as a tag once a file has
been cleaned up unless the tag is useful independently.

Poet, reciter, occasion, Haal, Kalam Type, language, and tags become clickable
search filters on lyric pages.
