# Basta integration for Kalam Archive

This bundle targets the current `GhayurH/lyrics-site` Astro layout.

## URL mapping

- printed/PDF page 5 → `/basta/1/`
- printed/PDF page 56 → `/basta/52/`
- printed/PDF page N → `/basta/(N - 4)/`

The offset is in `src/data/basta/config.json`.

## Install

```bash
sudo apt update
sudo apt install   tesseract-ocr   tesseract-ocr-urd   tesseract-ocr-ara   tesseract-ocr-eng   poppler-utils   libreoffice-draw
```

Verify:

```bash
tesseract --list-langs | grep -E '^(urd|ara|eng)$'
```

## OCR

```bash
chmod +x scripts/basta_ocr.sh scripts/build_basta.py

scripts/basta_ocr.sh   "/path/to/basta-by-professor-syed-sibt-jaffer-zaidi.pdf"   "$HOME/Basta-work"
```

The files you manually clean are in:

```text
~/Basta-work/cleaned/
```

They are named by the PRINTED BOOK PAGE:

```text
005.txt
006.txt
...
056.txt
```

The main Tesseract pass is:

```bash
tesseract page.png output   -l urd+ara+eng   --oem 1   --psm 3   -c preserve_interword_spaces=1   txt
```

For a badly segmented page, try:

```bash
tesseract 056.png 056-psm6   -l urd+ara+eng   --oem 1   --psm 6   -c preserve_interword_spaces=1   txt
```

## ODG template

Use one of your normal ODG pages as the template.

Put these literal placeholders in it:

```text
{{TEXT}}
{{BOOK_PAGE}}
```

`{{TEXT}}` must be in its own paragraph/text box.

Optional tokens:

```text
{{PAGE}}
{{URL_PAGE}}
```

The script only replaces those fields, preserving the template's existing
page size, borders, fonts and styling.

## Build MD + ODG + PNG

```bash
python3 scripts/build_basta.py   --repo-root "$HOME/Projects/lyrics-site"   --cleaned-dir "$HOME/Basta-work/cleaned"   --original-images "$HOME/Basta-work/original-jpg"   --odg-template "$HOME/Basta-work/basta-urdu-template.odg"   --export-png
```

For printed page 56:

```text
src/data/basta/pages/052.md
basta-source/odg/urdu/052.odg
public/images/basta/original/056.jpg
public/images/basta/urdu/052.png
```

and the page is `/basta/52/`.

## Clickable index

Clean the book's printed index into `scripts/basta-index.tsv`:

```tsv
section	title	book_page
اشاریہ	<entry text>	27
	<next entry in same section>	29
قطعات	<entry text>	85
```

Blank `section` cells continue the previous section.

Then run:

```bash
python3 scripts/build_basta.py   --repo-root "$HOME/Projects/lyrics-site"   --cleaned-dir "$HOME/Basta-work/cleaned"   --original-images "$HOME/Basta-work/original-jpg"   --odg-template "$HOME/Basta-work/basta-urdu-template.odg"   --index-tsv scripts/basta-index.tsv   --export-png
```

This writes `src/data/basta/index.json`, served at `/basta/index/`.

## Roman Urdu later

Add files like:

```text
~/Basta-work/roman-cleaned/005.txt
~/Basta-work/roman-cleaned/006.txt
```

Then add:

```bash
--roman-cleaned-dir "$HOME/Basta-work/roman-cleaned" --roman-odg-template "$HOME/Basta-work/basta-roman-template.odg"
```

The same URL then gains the Roman text and Roman image automatically.

## Test

```bash
npm run build
npm run preview
```

Check:

```text
/basta/
/basta/1/
/basta/52/
/basta/index/
```

The site-wide header now has a `Basta` entry.
