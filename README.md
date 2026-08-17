# Kalam Archive

**Kalam Archive** is a searchable collection of Urdu nohas, salams, manqabats, and related devotional literature.

The purpose of the archive is to preserve this material in a **simple, organized, and easily accessible format**, with searchable text and, where available, Roman Urdu transliteration and original source images.

**Website:** https://kalamarchive.com

## About the archive

The main lyrics archive presents Urdu kalam in a format designed for both reading and searching. Entries may include:

- Urdu lyrics
- Roman Urdu transliteration
- original lyric-sheet images
- titles in Urdu and Roman Urdu
- full-text search

The repository also contains a digital edition of **_Basta_ by Professor Syed Sibt-i-Jaafar Zaidi**, including:

- original scanned book pages
- cleaned Urdu text
- Roman Urdu transliteration
- a searchable, hyperlinked book index
- page-by-page reading
- continuous Urdu and Roman editions

The aim is preservation rather than modernization: source wording, stanza structure, punctuation, page numbering, and other meaningful features are retained as far as practical.

## اس ذخیرے کے بارے میں

یہ ویب سائٹ اردو نوحوں، سلاموں، منقبتوں اور متعلقہ کلام کا ایک قابلِ تلاش ذخیرہ ہے۔ اس کا مقصد اس کلام کو ایک سادہ، منظم اور آسانی سے قابلِ رسائی صورت میں محفوظ کرنا ہے۔

جہاں ممکن ہو وہاں اردو متن کے ساتھ رومن اردو، اصل صفحات یا تصاویر، اور قابلِ تلاش متن بھی فراہم کیا جاتا ہے۔

## Technology

Kalam Archive is a static site built with:

- [Astro](https://astro.build/)
- [Pagefind](https://pagefind.app/) for full-text search
- Noto Nastaliq Urdu for Urdu typography

The project requires **Node.js 22.12 or newer**.

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/GhayurH/lyrics-site.git
cd lyrics-site
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the production site and Pagefind search index:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Astro's development server normally runs at `http://localhost:4321/`.

## Repository structure

The main content is organized under `src/data/`, while site pages and components live under `src/pages/` and `src/components/`.

```text
src/
├── components/
├── data/
│   ├── lyrics/
│   └── basta/
│       ├── pages/       # cleaned Urdu book text
│       ├── roman/       # Roman Urdu transliteration
│       └── index.json   # structured Basta index
├── layouts/
├── pages/
└── styles/

public/
├── images/
└── files/
```

Static assets such as original scans and lyric images are stored under `public/`.

## Corrections and additions

Corrections are welcome, especially for transcription errors, missing text, incorrect transliteration, or cataloguing/index errors.

To report a correction, suggest a lyric, or ask a question, contact the site owner:

**lyricsadmin@gmail.com**

---

Preserving Urdu devotional literature in searchable digital form.
