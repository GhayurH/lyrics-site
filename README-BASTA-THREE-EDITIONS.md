# Basta: three editions

Routes:

- `/basta/` — homepage with edition dropdown
- `/basta/56/` — page-by-page: original scan + Urdu plaintext
- `/basta/urdu/` — one continuous Urdu text
- `/basta/roman/` — one continuous Roman Urdu text
- `/basta/index/` — clickable book index

There is no URL offset. Page 56 is `/basta/56/`.

## Urdu workflow

Finished Urdu text files are named by the actual book page:

```text
ready/001.txt
ready/002.txt
...
ready/056.txt
```

Original scan images use the same page number:

```text
original-jpg/001.jpg
original-jpg/002.jpg
...
original-jpg/056.jpg
```

Build with:

```bash
cd ~/Projects/lyrics-site

python3 scripts/build_basta.py \
  --repo-root "$HOME/Projects/lyrics-site" \
  --ready-dir "$HOME/Basta-work/ready" \
  --original-images "$HOME/Basta-work/original-jpg"
```

The same Urdu MD files power both the page-by-page edition and `/basta/urdu/`.
There is no duplicated Urdu data.

## Text format

For prose, use normal paragraphs, not scan-column line wrapping.

For poetry, keep the stanza number on its own line:

```text
1
پہلی مصرع
دوسری مصرع
تیسری مصرع
چوتھی مصرع

2
پہلی مصرع
دوسری مصرع
تیسری مصرع
چوتھی مصرع
```

The scrolling Urdu edition displays the text exactly as entered. After each
page it automatically adds a centered plain page number and a horizontal rule.

## Roman later

When Roman Urdu is ready:

```text
roman-ready/001.txt
roman-ready/002.txt
...
roman-ready/056.txt
```

then run:

```bash
python3 scripts/build_basta.py \
  --repo-root "$HOME/Projects/lyrics-site" \
  --ready-dir "$HOME/Basta-work/ready" \
  --original-images "$HOME/Basta-work/original-jpg" \
  --roman-dir "$HOME/Basta-work/roman-ready"
```

Until Roman files exist, `/basta/roman/` simply says the edition has not been
added yet.

## Index

`scripts/basta-index.tsv` now uses the actual page directly:

```tsv
section\ttitle\tpage
اشاریہ\tعنوان\t56
\tدوسرا عنوان\t57
```

There is no `book_page`, `route_page`, or offset.

## Remove old offset config

The old file is no longer used:

```bash
rm -f src/data/basta/config.json
```

No ODG or generated Urdu-image logic remains in this version.

## Test

```bash
npm run build
npm run preview
```

Check:

```text
/basta/
/basta/56/
/basta/urdu/
/basta/roman/
/basta/index/
```
