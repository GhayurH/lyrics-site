#!/usr/bin/env python3
"""Build Basta's page-by-page, continuous Urdu, and optional Roman editions.

There is deliberately NO page-number offset:
    056.txt -> /basta/56/
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from pathlib import Path

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def numeric_stem(path: Path) -> int | None:
    try:
        return int(path.stem)
    except ValueError:
        return None


def numeric_text_files(directory: Path) -> list[Path]:
    pages = [p for p in directory.glob("*.txt") if numeric_stem(p) is not None]
    pages.sort(key=lambda p: int(p.stem))
    return pages


def find_image(directory: Path, page: int) -> Path | None:
    for stem in (f"{page:03d}", str(page)):
        for extension in IMAGE_EXTENSIONS:
            path = directory / f"{stem}{extension}"
            if path.exists():
                return path
    return None


def write_urdu_page(output: Path, page: int, image_url: str, text: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "---\n"
        f"page: {page}\n"
        f'originalImage: "{image_url}"\n'
        "published: true\n"
        "---\n"
        f"{text.rstrip()}\n",
        encoding="utf-8",
    )


def write_roman_page(output: Path, page: int, text: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "---\n"
        f"page: {page}\n"
        "published: true\n"
        "---\n"
        f"{text.rstrip()}\n",
        encoding="utf-8",
    )


def build_urdu(repo: Path, ready_dir: Path, original_images: Path) -> int:
    md_dir = repo / "src/data/basta/pages"
    image_dir = repo / "public/images/basta/original"
    md_dir.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)

    pages = numeric_text_files(ready_dir)
    if not pages:
        raise RuntimeError(f"No numeric .txt files found in {ready_dir}")

    built = 0
    for text_path in pages:
        page = int(text_path.stem)
        stem = f"{page:03d}"
        source_image = find_image(original_images, page)

        if source_image is None:
            raise RuntimeError(
                f"Missing original image for page {page}; expected e.g. {stem}.jpg"
            )

        image_dest = image_dir / f"{stem}{source_image.suffix.lower()}"
        shutil.copy2(source_image, image_dest)

        text = text_path.read_text(encoding="utf-8").strip()
        write_urdu_page(
            md_dir / f"{stem}.md",
            page,
            f"/images/basta/original/{image_dest.name}",
            text,
        )

        print(f"Urdu: {page} -> /basta/{page}/")
        built += 1

    return built


def build_roman(repo: Path, roman_dir: Path) -> int:
    output_dir = repo / "src/data/basta/roman"
    output_dir.mkdir(parents=True, exist_ok=True)

    pages = numeric_text_files(roman_dir)
    if not pages:
        print(f"No numeric Roman .txt files found in {roman_dir}; nothing changed.")
        return 0

    built = 0
    for text_path in pages:
        page = int(text_path.stem)
        stem = f"{page:03d}"
        text = text_path.read_text(encoding="utf-8").strip()
        write_roman_page(output_dir / f"{stem}.md", page, text)
        print(f"Roman: page {page}")
        built += 1

    return built


def build_index(tsv_path: Path, output_json: Path) -> int:
    entries = []
    current_section = ""

    with tsv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        required = {"section", "title", "page"}

        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise RuntimeError("Index TSV needs columns: section, title, page")

        for row_number, row in enumerate(reader, start=2):
            section = (row.get("section") or "").strip()
            if section:
                current_section = section

            title = (row.get("title") or "").strip()
            page_raw = (row.get("page") or "").strip()

            if not title and not page_raw:
                continue
            if not title:
                raise RuntimeError(f"Index row {row_number}: missing title")

            try:
                page = int(page_raw)
            except ValueError as exc:
                raise RuntimeError(
                    f"Index row {row_number}: invalid page {page_raw!r}"
                ) from exc

            if page < 1:
                raise RuntimeError(f"Index row {row_number}: page must be positive")

            entries.append({
                "section": current_section,
                "title": title,
                "page": page,
            })

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return len(entries)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument(
        "--ready-dir",
        type=Path,
        required=True,
        help="Finished Urdu text files named by actual book page, e.g. 056.txt",
    )
    parser.add_argument(
        "--original-images",
        type=Path,
        required=True,
        help="Original page images named by actual book page, e.g. 056.jpg",
    )
    parser.add_argument(
        "--roman-dir",
        type=Path,
        help="Optional future Roman Urdu text directory",
    )
    parser.add_argument(
        "--index-tsv",
        type=Path,
        help="Optional TSV with columns: section, title, page",
    )
    args = parser.parse_args()

    repo = args.repo_root.expanduser().resolve()
    ready_dir = args.ready_dir.expanduser().resolve()
    original_images = args.original_images.expanduser().resolve()

    urdu_count = build_urdu(repo, ready_dir, original_images)
    roman_count = 0

    if args.roman_dir:
        roman_count = build_roman(repo, args.roman_dir.expanduser().resolve())

    if args.index_tsv:
        index_count = build_index(
            args.index_tsv.expanduser().resolve(),
            repo / "src/data/basta/index.json",
        )
        print(f"Index: {index_count} entries")

    print(f"Built {urdu_count} Urdu/page-by-page pages.")
    if args.roman_dir:
        print(f"Built {roman_count} Roman pages.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
