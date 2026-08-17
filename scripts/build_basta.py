#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
TEXT_P = f"{{{TEXT_NS}}}p"
TEXT_LINE_BREAK = f"{{{TEXT_NS}}}line-break"


def numeric_stem(path: Path) -> int | None:
    try:
        return int(path.stem)
    except ValueError:
        return None


def read_config(repo_root: Path) -> dict:
    path = repo_root / "src/data/basta/config.json"
    if not path.exists():
        return {"urlOffset": 4, "firstBookPage": 5}
    return json.loads(path.read_text(encoding="utf-8"))


def yaml_block(key: str, value: str) -> str:
    lines = value.rstrip("\n").splitlines()
    if not lines:
        return ""
    indented = "\n".join(f"  {line}" for line in lines)
    return f"{key}: |-\n{indented}\n"


def find_original_image(directory: Path, book_page: int) -> Path | None:
    for stem in (f"{book_page:03d}", str(book_page)):
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            path = directory / f"{stem}{ext}"
            if path.exists():
                return path
    return None


def replace_simple_tokens(root: ET.Element, replacements: dict[str, str]) -> None:
    for element in root.iter():
        if element.text:
            for old, new in replacements.items():
                element.text = element.text.replace(old, new)
        if element.tail:
            for old, new in replacements.items():
                element.tail = element.tail.replace(old, new)


def replace_text_paragraph(root: ET.Element, text: str) -> None:
    paragraph = None
    for candidate in root.iter(TEXT_P):
        if "{{TEXT}}" in "".join(candidate.itertext()):
            paragraph = candidate
            break

    if paragraph is None:
        raise RuntimeError(
            "ODG template does not contain {{TEXT}} in a text paragraph."
        )

    for child in list(paragraph):
        paragraph.remove(child)

    lines = text.rstrip("\n").splitlines()
    if not lines:
        paragraph.text = ""
        return

    paragraph.text = lines[0]
    for line in lines[1:]:
        br = ET.SubElement(paragraph, TEXT_LINE_BREAK)
        br.tail = line


def build_odg(
    template_path: Path,
    output_path: Path,
    text: str,
    book_page: int,
    route_page: int,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="basta-odg-") as temp_dir:
        temp = Path(temp_dir)

        with zipfile.ZipFile(template_path, "r") as archive:
            archive.extractall(temp)

        content_path = temp / "content.xml"
        if not content_path.exists():
            raise RuntimeError(f"{template_path} does not contain content.xml")

        tree = ET.parse(content_path)
        root = tree.getroot()

        replace_text_paragraph(root, text)
        replace_simple_tokens(
            root,
            {
                "{{BOOK_PAGE}}": str(book_page),
                "{{URL_PAGE}}": str(route_page),
                "{{PAGE}}": str(book_page),
            },
        )

        tree.write(content_path, encoding="UTF-8", xml_declaration=True)

        mimetype_path = temp / "mimetype"

        with zipfile.ZipFile(output_path, "w") as out:
            if mimetype_path.exists():
                out.write(
                    mimetype_path,
                    "mimetype",
                    compress_type=zipfile.ZIP_STORED,
                )

            for path in sorted(temp.rglob("*")):
                if path.is_dir() or path == mimetype_path:
                    continue
                out.write(
                    path,
                    path.relative_to(temp).as_posix(),
                    compress_type=zipfile.ZIP_DEFLATED,
                )


def export_odg_png(odg_path: Path, target_png: Path) -> None:
    libreoffice = shutil.which("libreoffice")
    if not libreoffice:
        raise RuntimeError("libreoffice is not installed or is not on PATH.")

    target_png.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="basta-lo-export-") as temp_dir:
        temp = Path(temp_dir)
        profile = temp / "profile"
        export_dir = temp / "export"
        profile.mkdir()
        export_dir.mkdir()

        subprocess.run(
            [
                libreoffice,
                f"-env:UserInstallation={profile.as_uri()}",
                "--headless",
                "--convert-to",
                "png",
                "--outdir",
                str(export_dir),
                str(odg_path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        generated = export_dir / f"{odg_path.stem}.png"
        if not generated.exists():
            pngs = list(export_dir.glob("*.png"))
            if len(pngs) != 1:
                raise RuntimeError(
                    f"LibreOffice did not create a PNG for {odg_path}"
                )
            generated = pngs[0]

        shutil.copy2(generated, target_png)


def write_markdown(
    output_path: Path,
    route_page: int,
    book_page: int,
    original_image_url: str,
    urdu_text: str,
    urdu_image_url: str | None,
    roman_text: str | None,
    roman_image_url: str | None,
) -> None:
    lines = [
        "---",
        f"page: {route_page}",
        f"bookPage: {book_page}",
        f"pdfPage: {book_page}",
        f'originalImage: "{original_image_url}"',
    ]

    if urdu_image_url:
        lines.append(f'urduImage: "{urdu_image_url}"')
    if roman_image_url:
        lines.append(f'romanImage: "{roman_image_url}"')
    if roman_text:
        lines.append(yaml_block("romanText", roman_text).rstrip("\n"))

    lines.extend(["published: true", "---", urdu_text.rstrip(), ""])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def build_index(tsv_path: Path, output_json: Path, url_offset: int) -> int:
    entries = []
    current_section = ""

    with tsv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        required = {"section", "title", "book_page"}

        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise RuntimeError(
                "Index TSV needs columns: section, title, book_page"
            )

        for row_number, row in enumerate(reader, start=2):
            section = (row.get("section") or "").strip()
            if section:
                current_section = section

            title = (row.get("title") or "").strip()
            page_raw = (row.get("book_page") or "").strip()

            if not title and not page_raw:
                continue
            if not title:
                raise RuntimeError(f"Index row {row_number}: missing title")

            try:
                book_page = int(page_raw)
            except ValueError as exc:
                raise RuntimeError(
                    f"Index row {row_number}: invalid book_page {page_raw!r}"
                ) from exc

            route_page = book_page - url_offset
            if route_page < 1:
                raise RuntimeError(
                    f"Index row {row_number}: book page {book_page} maps before /basta/1/"
                )

            entries.append(
                {
                    "section": current_section,
                    "title": title,
                    "bookPage": book_page,
                    "routePage": route_page,
                }
            )

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return len(entries)


def main() -> int:
    parser = argparse.ArgumentParser()

    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--cleaned-dir", type=Path, required=True)
    parser.add_argument("--original-images", type=Path, required=True)
    parser.add_argument("--odg-template", type=Path)
    parser.add_argument("--roman-cleaned-dir", type=Path)
    parser.add_argument("--roman-odg-template", type=Path)
    parser.add_argument("--index-tsv", type=Path)
    parser.add_argument("--export-png", action="store_true")
    parser.add_argument("--url-offset", type=int)

    args = parser.parse_args()

    repo = args.repo_root.expanduser().resolve()
    cleaned_dir = args.cleaned_dir.expanduser().resolve()
    originals = args.original_images.expanduser().resolve()

    config = read_config(repo)
    url_offset = (
        args.url_offset
        if args.url_offset is not None
        else int(config.get("urlOffset", 4))
    )
    first_book_page = int(config.get("firstBookPage", 5))

    markdown_dir = repo / "src/data/basta/pages"
    public_original = repo / "public/images/basta/original"
    public_urdu = repo / "public/images/basta/urdu"
    public_roman = repo / "public/images/basta/roman"
    odg_urdu_dir = repo / "basta-source/odg/urdu"
    odg_roman_dir = repo / "basta-source/odg/roman"

    for directory in (
        markdown_dir,
        public_original,
        public_urdu,
        public_roman,
        odg_urdu_dir,
        odg_roman_dir,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    cleaned_pages = [
        path for path in cleaned_dir.glob("*.txt")
        if numeric_stem(path) is not None
    ]
    cleaned_pages.sort(key=lambda path: int(path.stem))

    if not cleaned_pages:
        raise RuntimeError(f"No numeric .txt files found in {cleaned_dir}")

    built = 0

    for text_path in cleaned_pages:
        book_page = int(text_path.stem)
        if book_page < first_book_page:
            continue

        route_page = book_page - url_offset
        if route_page < 1:
            continue

        route_stem = f"{route_page:03d}"
        book_stem = f"{book_page:03d}"

        urdu_text = text_path.read_text(encoding="utf-8").strip()

        original = find_original_image(originals, book_page)
        if original is None:
            raise RuntimeError(
                f"Missing original image for book page {book_page}"
            )

        original_dest = (
            public_original /
            f"{book_stem}{original.suffix.lower()}"
        )
        shutil.copy2(original, original_dest)
        original_url = f"/images/basta/original/{original_dest.name}"

        urdu_image_url = None

        if args.odg_template:
            template = args.odg_template.expanduser().resolve()
            odg_path = odg_urdu_dir / f"{route_stem}.odg"

            build_odg(
                template,
                odg_path,
                urdu_text,
                book_page,
                route_page,
            )

            if args.export_png:
                png_path = public_urdu / f"{route_stem}.png"
                export_odg_png(odg_path, png_path)
                urdu_image_url = f"/images/basta/urdu/{route_stem}.png"

        roman_text = None
        roman_image_url = None

        if args.roman_cleaned_dir:
            roman_dir = args.roman_cleaned_dir.expanduser().resolve()
            roman_path = roman_dir / f"{book_stem}.txt"

            if roman_path.exists():
                roman_text = roman_path.read_text(
                    encoding="utf-8"
                ).strip()

                if args.roman_odg_template:
                    roman_template = (
                        args.roman_odg_template.expanduser().resolve()
                    )
                    roman_odg = odg_roman_dir / f"{route_stem}.odg"

                    build_odg(
                        roman_template,
                        roman_odg,
                        roman_text,
                        book_page,
                        route_page,
                    )

                    if args.export_png:
                        roman_png = public_roman / f"{route_stem}.png"
                        export_odg_png(roman_odg, roman_png)
                        roman_image_url = (
                            f"/images/basta/roman/{route_stem}.png"
                        )

        write_markdown(
            markdown_dir / f"{route_stem}.md",
            route_page,
            book_page,
            original_url,
            urdu_text,
            urdu_image_url,
            roman_text,
            roman_image_url,
        )

        built += 1
        print(f"book {book_page} -> /basta/{route_page}/")

    if args.index_tsv:
        count = build_index(
            args.index_tsv.expanduser().resolve(),
            repo / "src/data/basta/index.json",
            url_offset,
        )
        print(f"Built {count} index entries.")

    print(f"Built {built} Basta pages.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
