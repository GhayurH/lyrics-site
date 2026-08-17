#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/basta_ocr.sh /path/to/basta.pdf /path/to/Basta-work
#
# Optional environment variables:
#   FIRST_BOOK_PAGE=5
#   OCR_DPI=400
#   WEB_DPI=180
#   PSM=3
#   LANGS=urd+ara+eng

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 BOOK.pdf WORK_DIR" >&2
  exit 2
fi

PDF="$(readlink -f "$1")"
WORK="$(readlink -m "$2")"

FIRST_BOOK_PAGE="${FIRST_BOOK_PAGE:-5}"
OCR_DPI="${OCR_DPI:-400}"
WEB_DPI="${WEB_DPI:-180}"
PSM="${PSM:-3}"
LANGS="${LANGS:-urd+ara+eng}"

command -v pdfinfo >/dev/null ||
  { echo "Missing pdfinfo (install poppler-utils)." >&2; exit 1; }

command -v pdftocairo >/dev/null ||
  { echo "Missing pdftocairo (install poppler-utils)." >&2; exit 1; }

command -v tesseract >/dev/null ||
  { echo "Missing tesseract." >&2; exit 1; }

for lang in urd ara eng; do
  if ! tesseract --list-langs 2>/dev/null | grep -qx "$lang"; then
    echo "Missing Tesseract language: $lang" >&2
    exit 1
  fi
done

LAST_PDF_PAGE="$(
  pdfinfo "$PDF" |
    awk '/^Pages:/ {print $2; exit}'
)"

mkdir -p \
  "$WORK/ocr-images-raw" \
  "$WORK/original-jpg-raw" \
  "$WORK/ocr-images" \
  "$WORK/original-jpg" \
  "$WORK/ocr" \
  "$WORK/cleaned"

echo "Rendering OCR images at ${OCR_DPI} DPI..."
pdftocairo \
  -f "$FIRST_BOOK_PAGE" \
  -l "$LAST_PDF_PAGE" \
  -r "$OCR_DPI" \
  -gray \
  -png \
  "$PDF" \
  "$WORK/ocr-images-raw/page"

echo "Rendering web images at ${WEB_DPI} DPI..."
pdftocairo \
  -f "$FIRST_BOOK_PAGE" \
  -l "$LAST_PDF_PAGE" \
  -r "$WEB_DPI" \
  -jpeg \
  -jpegopt quality=88,progressive=y \
  "$PDF" \
  "$WORK/original-jpg-raw/page"

normalize_names() {
  local src_dir="$1"
  local dest_dir="$2"
  local ext="$3"

  shopt -s nullglob

  for path in "$src_dir"/page-*."$ext"; do
    name="${path##*/}"
    n="${name#page-}"
    n="${n%.$ext}"
    n="$((10#$n))"
    printf -v padded "%03d" "$n"
    mv -f "$path" "$dest_dir/$padded.$ext"
  done
}

normalize_names "$WORK/ocr-images-raw" "$WORK/ocr-images" "png"
normalize_names "$WORK/original-jpg-raw" "$WORK/original-jpg" "jpg"

rmdir "$WORK/ocr-images-raw" 2>/dev/null || true
rmdir "$WORK/original-jpg-raw" 2>/dev/null || true

echo "Running Tesseract (${LANGS}, PSM ${PSM})..."

shopt -s nullglob

for image in "$WORK/ocr-images"/*.png; do
  page="${image##*/}"
  page="${page%.png}"
  output_base="$WORK/ocr/$page"

  if [[ -f "$output_base.txt" ]]; then
    echo "Skipping existing OCR: $page"
    continue
  fi

  echo "OCR page $page"

  tesseract \
    "$image" \
    "$output_base" \
    -l "$LANGS" \
    --oem 1 \
    --psm "$PSM" \
    -c preserve_interword_spaces=1 \
    txt
done

# Your edits in cleaned/ are never overwritten.
for text in "$WORK/ocr"/*.txt; do
  cp -n "$text" "$WORK/cleaned/" || true
done

cat <<EOF

Done.

Raw OCR:
  $WORK/ocr/

Files to clean manually:
  $WORK/cleaned/

Web-ready original scans:
  $WORK/original-jpg/

Filenames are PRINTED BOOK PAGE numbers.
Book page 56 -> /basta/52/ because the URL offset is 4.

EOF
