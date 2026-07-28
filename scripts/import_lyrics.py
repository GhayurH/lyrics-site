#!/usr/bin/env python3
"""
Bulk-import a folder tree of lyrics into an Astro lyrics website.

Default behavior is SAFE: it writes to a separate preview directory.
Use --apply only after reviewing the preview and import-report.csv.

Supported text sources:
  - ODT and ODG (read directly from content.xml)
  - DOCX (read directly from word/document.xml)
  - DOC (converted temporarily with LibreOffice, when available)
  - TXT

Important behavior:
  - Every supported source in each lyric folder is inspected.
  - The best Urdu extraction and best Roman Urdu extraction are selected
    independently, so Urdu may come from ODG while Roman Urdu comes from ODT.
  - Standalone stanza numbers found after a stanza are moved before it.
  - Stanza numbers are mirrored into the other language when possible.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
TEXT_P = f"{{{TEXT_NS}}}p"
TEXT_H = f"{{{TEXT_NS}}}h"
TEXT_S = f"{{{TEXT_NS}}}s"
TEXT_TAB = f"{{{TEXT_NS}}}tab"
TEXT_LINE_BREAK = f"{{{TEXT_NS}}}line-break"
TEXT_C = f"{{{TEXT_NS}}}c"

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WORD_P = f"{{{WORD_NS}}}p"
WORD_T = f"{{{WORD_NS}}}t"
WORD_TAB = f"{{{WORD_NS}}}tab"
WORD_BR = f"{{{WORD_NS}}}br"
WORD_CR = f"{{{WORD_NS}}}cr"

SUPPORTED_TEXT_SUFFIXES = (".odt", ".odg", ".docx", ".doc", ".txt")

ARABIC_RANGES = (
    (0x0600, 0x06FF),
    (0x0750, 0x077F),
    (0x0870, 0x089F),
    (0x08A0, 0x08FF),
    (0xFB50, 0xFDFF),
    (0xFE70, 0xFEFF),
)

# Accept 1, ۱, ١, (1), 1., 1-, etc., but not years or long numbers.
NUMBER_RE = re.compile(r"^[\s\[\](){}._\-–—:]*([0-9۰-۹٠-٩]{1,3})[\s\[\](){}._\-–—:]*$")


@dataclass
class Stanza:
    lines: list[str]
    number: str | None = None

    def text_length(self) -> int:
        return sum(len(line) for line in self.lines)


@dataclass
class SourceExtraction:
    path: Path
    urdu: list[Stanza] = field(default_factory=list)
    roman: list[Stanza] = field(default_factory=list)
    error: str = ""


@dataclass
class ImportItem:
    category: str
    source_dir: Path
    title_roman: str
    slug: str
    png: Path | None
    text_sources: list[Path]
    urdu_source: Path | None
    roman_source: Path | None
    urdu_stanzas: list[Stanza]
    roman_stanzas: list[Stanza]
    status: str
    notes: str = ""

    @property
    def urdu(self) -> str:
        return render_stanzas(self.urdu_stanzas)

    @property
    def roman(self) -> str:
        return render_stanzas(self.roman_stanzas)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create Astro Markdown lyric entries from ODG/ODT/DOCX/DOC/TXT files and PNGs."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("/home/ghayur/Desktop/AZ/Git/Lyrics"),
        help="Root containing category folders such as Noha, Manqabat and Salam.",
    )
    parser.add_argument(
        "--site",
        type=Path,
        default=Path("/home/ghayur/Projects/lyrics-site"),
        help="Astro website root.",
    )
    parser.add_argument(
        "--preview-dir",
        type=Path,
        default=None,
        help="Dry-run output. Default: a sibling named lyrics-site-import-preview.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write directly into the Astro site's Markdown and public image folders.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing generated Markdown/image files.",
    )
    parser.add_argument(
        "--published",
        action="store_true",
        help="Set generated entries to published: true. Default is false.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "untitled"


def yaml_string(value: str) -> str:
    # A JSON string is also a valid YAML double-quoted scalar.
    return json.dumps(value, ensure_ascii=False)


def normalize_line(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\r", "")
    value = re.sub(r"[ \t]+", " ", value)
    return value.strip()


def is_arabic_char(char: str) -> bool:
    code = ord(char)
    return any(start <= code <= end for start, end in ARABIC_RANGES)


def classify_text(lines: Iterable[str]) -> str:
    arabic = 0
    latin = 0

    for line in lines:
        for char in line:
            if is_arabic_char(char):
                arabic += 1
            elif ("A" <= char <= "Z") or ("a" <= char <= "z"):
                latin += 1

    if arabic == 0 and latin == 0:
        return "neutral"
    return "urdu" if arabic >= latin else "roman"


def normalize_number(value: str) -> str | None:
    match = NUMBER_RE.fullmatch(value)
    if not match:
        return None

    digits: list[str] = []
    for char in match.group(1):
        try:
            digits.append(str(unicodedata.digit(char)))
        except (TypeError, ValueError):
            if char.isdigit():
                digits.append(char)

    if not digits:
        return None

    number = str(int("".join(digits)))
    return number


def extract_odf_element_text(element: ET.Element) -> str:
    parts: list[str] = []

    def walk(node: ET.Element) -> None:
        if node.text:
            parts.append(node.text)

        for child in node:
            if child.tag == TEXT_S:
                try:
                    count = int(child.attrib.get(TEXT_C, "1"))
                except ValueError:
                    count = 1
                parts.append(" " * max(1, count))
            elif child.tag == TEXT_TAB:
                parts.append("\t")
            elif child.tag == TEXT_LINE_BREAK:
                parts.append("\n")
            else:
                walk(child)

            if child.tail:
                parts.append(child.tail)

    walk(element)
    return "".join(parts)


def extract_odf_blocks(path: Path) -> list[list[str]]:
    try:
        with zipfile.ZipFile(path) as archive:
            xml_bytes = archive.read("content.xml")
    except (zipfile.BadZipFile, KeyError) as exc:
        raise RuntimeError(f"Could not read content.xml from {path.name}: {exc}") from exc

    root = ET.fromstring(xml_bytes)
    blocks: list[list[str]] = []

    # Treat every ODF paragraph/heading as one source block. Internal line breaks
    # remain part of that block, which works well for ODG text boxes and tables.
    for element in root.iter():
        if element.tag not in {TEXT_P, TEXT_H}:
            continue

        raw = extract_odf_element_text(element)
        lines = [normalize_line(line) for line in raw.splitlines()]
        lines = [line for line in lines if line]
        if lines:
            blocks.append(lines)

    return remove_consecutive_duplicate_blocks(blocks)


def extract_docx_paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []

    for node in paragraph.iter():
        if node.tag == WORD_T and node.text:
            parts.append(node.text)
        elif node.tag == WORD_TAB:
            parts.append("\t")
        elif node.tag in {WORD_BR, WORD_CR}:
            parts.append("\n")

    return "".join(parts)


def extract_docx_blocks(path: Path) -> list[list[str]]:
    try:
        with zipfile.ZipFile(path) as archive:
            xml_bytes = archive.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError) as exc:
        raise RuntimeError(f"Could not read word/document.xml from {path.name}: {exc}") from exc

    root = ET.fromstring(xml_bytes)
    blocks: list[list[str]] = []

    for paragraph in root.iter(WORD_P):
        raw = extract_docx_paragraph_text(paragraph)
        lines = [normalize_line(line) for line in raw.splitlines()]
        lines = [line for line in lines if line]
        if lines:
            blocks.append(lines)

    return remove_consecutive_duplicate_blocks(blocks)


def extract_txt_blocks(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    blocks: list[list[str]] = []
    current: list[str] = []

    for raw_line in text.splitlines():
        line = normalize_line(raw_line)
        if line:
            current.append(line)
        elif current:
            blocks.append(current)
            current = []

    if current:
        blocks.append(current)

    return remove_consecutive_duplicate_blocks(blocks)


def extract_doc_blocks(path: Path) -> list[list[str]]:
    libreoffice = shutil.which("libreoffice") or shutil.which("soffice")
    if not libreoffice:
        raise RuntimeError(
            "Legacy .doc file found, but LibreOffice/soffice is not available for temporary conversion."
        )

    with tempfile.TemporaryDirectory(prefix="lyrics-doc-") as temp_dir:
        output_dir = Path(temp_dir)
        command = [
            libreoffice,
            "--headless",
            "--convert-to",
            "txt:Text",
            "--outdir",
            str(output_dir),
            str(path),
        ]
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
            check=False,
        )

        converted = output_dir / f"{path.stem}.txt"
        if result.returncode != 0 or not converted.exists():
            details = (result.stderr or result.stdout).strip()
            raise RuntimeError(f"LibreOffice could not convert {path.name}: {details}")

        return extract_txt_blocks(converted)


def extract_blocks(path: Path) -> list[list[str]]:
    suffix = path.suffix.lower()
    if suffix in {".odt", ".odg"}:
        return extract_odf_blocks(path)
    if suffix == ".docx":
        return extract_docx_blocks(path)
    if suffix == ".doc":
        return extract_doc_blocks(path)
    if suffix == ".txt":
        return extract_txt_blocks(path)
    raise RuntimeError(f"Unsupported text source: {path.name}")


def remove_consecutive_duplicate_blocks(blocks: Iterable[list[str]]) -> list[list[str]]:
    result: list[list[str]] = []
    previous: tuple[str, ...] | None = None

    for block in blocks:
        normalized = tuple(line for line in block if line)
        if not normalized:
            continue
        if normalized == previous:
            continue
        result.append(list(normalized))
        previous = normalized

    return result


def split_block_languages(lines: list[str]) -> tuple[list[str], list[str]]:
    urdu: list[str] = []
    roman: list[str] = []
    last_language: str | None = None

    for line in lines:
        language = classify_text([line])

        if language == "neutral":
            language = last_language or classify_text(lines)
            if language == "neutral":
                language = "roman"

        if language == "urdu":
            urdu.append(line)
        else:
            roman.append(line)

        last_language = language

    return urdu, roman


def parse_blocks_into_languages(
    blocks: list[list[str]],
    *,
    numeric_blocks_label_previous: bool,
) -> tuple[list[Stanza], list[Stanza]]:
    """
    Convert source blocks into Urdu and Roman stanza lists.

    For ODG, a numeric-only block labels the stanza immediately before it,
    because Draw commonly returns visually leading number boxes after the text
    box they label. For ODT/DOCX/DOC/TXT, numeric-only blocks label the next
    stanza, matching normal document reading order. A number inside a text
    block is always attached to that same stanza and rendered before it.
    """

    grouped: list[dict[str, object]] = []
    pending_number: str | None = None

    for original in blocks:
        lines = [normalize_line(line) for line in original if normalize_line(line)]
        if not lines:
            continue

        if len(lines) == 1:
            standalone = normalize_number(lines[0])
            if standalone is not None:
                if (
                    numeric_blocks_label_previous
                    and grouped
                    and grouped[-1].get("number") is None
                ):
                    # ODG's XML order often places the number box after the
                    # stanza text box that it visually precedes.
                    grouped[-1]["number"] = standalone
                else:
                    # Normal document order: the number labels the next stanza.
                    pending_number = standalone
                continue

        leading_number = normalize_number(lines[0])
        trailing_number = normalize_number(lines[-1]) if len(lines) > 1 else None

        number = pending_number
        pending_number = None

        if leading_number is not None:
            number = leading_number
            lines = lines[1:]

        if lines and trailing_number is not None:
            # The number appears below the stanza in extraction order; move it
            # before the stanza in generated Markdown.
            number = trailing_number
            lines = lines[:-1]

        if not lines:
            if number is not None:
                pending_number = number
            continue

        urdu_lines, roman_lines = split_block_languages(lines)
        grouped.append({
            "number": number,
            "urdu": urdu_lines,
            "roman": roman_lines,
        })

    urdu_stanzas: list[Stanza] = []
    roman_stanzas: list[Stanza] = []

    for group in grouped:
        number = group["number"] if isinstance(group["number"], str) else None
        urdu_lines = group["urdu"] if isinstance(group["urdu"], list) else []
        roman_lines = group["roman"] if isinstance(group["roman"], list) else []

        if urdu_lines:
            urdu_stanzas.append(Stanza(lines=list(urdu_lines), number=number))
        if roman_lines:
            roman_stanzas.append(Stanza(lines=list(roman_lines), number=number))

    return urdu_stanzas, roman_stanzas


def extract_source(path: Path) -> SourceExtraction:
    try:
        blocks = extract_blocks(path)
        urdu, roman = parse_blocks_into_languages(
            blocks,
            numeric_blocks_label_previous=(path.suffix.lower() == ".odg"),
        )
        return SourceExtraction(path=path, urdu=urdu, roman=roman)
    except Exception as exc:
        return SourceExtraction(path=path, error=str(exc))


def language_score(stanzas: list[Stanza], path: Path, language: str) -> int:
    if not stanzas:
        return -1

    characters = sum(stanza.text_length() for stanza in stanzas)
    lines = sum(len(stanza.lines) for stanza in stanzas)
    numbered = sum(1 for stanza in stanzas if stanza.number is not None)

    suffix = path.suffix.lower()
    if language == "urdu":
        preference = {".odg": 8, ".odt": 6, ".docx": 4, ".doc": 3, ".txt": 2}.get(suffix, 0)
    else:
        preference = {".odt": 8, ".docx": 7, ".doc": 6, ".txt": 5, ".odg": 4}.get(suffix, 0)

    return characters * 10 + lines * 2 + numbered * 3 + preference


def clone_stanzas(stanzas: list[Stanza]) -> list[Stanza]:
    return [Stanza(lines=list(stanza.lines), number=stanza.number) for stanza in stanzas]


def select_best_language(
    extractions: list[SourceExtraction], language: str
) -> tuple[list[Stanza], Path | None]:
    candidates: list[tuple[int, Path, list[Stanza]]] = []

    for extraction in extractions:
        if extraction.error:
            continue
        stanzas = extraction.urdu if language == "urdu" else extraction.roman
        score = language_score(stanzas, extraction.path, language)
        if score >= 0:
            candidates.append((score, extraction.path, stanzas))

    if not candidates:
        return [], None

    candidates.sort(key=lambda item: (item[0], item[1].name.casefold()), reverse=True)
    _, path, stanzas = candidates[0]
    return clone_stanzas(stanzas), path


def numbered_positions(stanzas: list[Stanza]) -> list[tuple[int, str]]:
    return [
        (index, stanza.number)
        for index, stanza in enumerate(stanzas)
        if stanza.number is not None
    ]


def mirror_stanza_numbers(
    source: list[Stanza], target: list[Stanza]
) -> tuple[int, bool]:
    """
    Copy stanza numbers from source to target.

    First align stanzas by their distance from the end, which preserves an
    unnumbered opening refrain. If that cannot fill all numbers, fall back to
    placing the source number sequence on the last matching target stanzas.

    Returns (numbers_added, complete_alignment).
    """

    source_numbers = numbered_positions(source)
    if not source_numbers or not target:
        return 0, True

    added = 0
    mapped_source_indices: set[int] = set()

    # Align each numbered stanza by offset from the end.
    for source_index, number in source_numbers:
        offset_from_end = len(source) - source_index
        target_index = len(target) - offset_from_end
        if 0 <= target_index < len(target):
            if target[target_index].number is None:
                target[target_index].number = number
                added += 1
            mapped_source_indices.add(source_index)

    missing = [
        (source_index, number)
        for source_index, number in source_numbers
        if source_index not in mapped_source_indices
    ]

    if missing:
        available_targets = [
            index for index, stanza in enumerate(target) if stanza.number is None
        ]
        available_targets = available_targets[-len(missing):]

        for (_, number), target_index in zip(missing, available_targets):
            target[target_index].number = number
            added += 1

    target_numbers = {stanza.number for stanza in target if stanza.number is not None}
    source_number_values = {number for _, number in source_numbers}
    complete = source_number_values.issubset(target_numbers)
    return added, complete


def render_stanzas(stanzas: list[Stanza]) -> str:
    rendered: list[str] = []

    for stanza in stanzas:
        block: list[str] = []
        if stanza.number is not None:
            block.append(stanza.number)
        block.extend(stanza.lines)
        if block:
            rendered.append("\n".join(block))

    return "\n\n".join(rendered).strip()


def list_text_sources(folder: Path) -> list[Path]:
    candidates = [
        path
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_TEXT_SUFFIXES
    ]

    # Prefer exact basename matches only as a tie-break; inspect every source.
    folder_name = folder.name.casefold()
    return sorted(
        candidates,
        key=lambda path: (
            path.stem.casefold() != folder_name,
            SUPPORTED_TEXT_SUFFIXES.index(path.suffix.lower()),
            path.name.casefold(),
        ),
    )


def select_matching_file(folder: Path, suffixes: tuple[str, ...]) -> Path | None:
    candidates = sorted(
        (
            path
            for path in folder.iterdir()
            if path.is_file() and path.suffix.lower() in suffixes
        ),
        key=lambda path: path.name.casefold(),
    )

    if not candidates:
        return None

    folder_name = folder.name.casefold()
    exact = [path for path in candidates if path.stem.casefold() == folder_name]
    return exact[0] if exact else candidates[0]


def unique_slug(base: str, category: str, used: set[str]) -> str:
    if base not in used:
        used.add(base)
        return base

    candidate = f"{base}-{slugify(category)}"
    number = 2

    while candidate in used:
        candidate = f"{base}-{slugify(category)}-{number}"
        number += 1

    used.add(candidate)
    return candidate


def build_item(category: str, folder: Path, used_slugs: set[str]) -> ImportItem:
    title_roman = folder.name
    slug = unique_slug(slugify(title_roman), category, used_slugs)
    png = select_matching_file(folder, (".png",))
    text_sources = list_text_sources(folder)

    if png is None:
        return ImportItem(
            category=category,
            source_dir=folder,
            title_roman=title_roman,
            slug=slug,
            png=None,
            text_sources=text_sources,
            urdu_source=None,
            roman_source=None,
            urdu_stanzas=[],
            roman_stanzas=[],
            status="skipped",
            notes="No PNG found.",
        )

    if not text_sources:
        return ImportItem(
            category=category,
            source_dir=folder,
            title_roman=title_roman,
            slug=slug,
            png=png,
            text_sources=[],
            urdu_source=None,
            roman_source=None,
            urdu_stanzas=[],
            roman_stanzas=[],
            status="skipped",
            notes="No ODT, ODG, DOCX, DOC or TXT text source found.",
        )

    extractions = [extract_source(path) for path in text_sources]
    urdu_stanzas, urdu_source = select_best_language(extractions, "urdu")
    roman_stanzas, roman_source = select_best_language(extractions, "roman")

    notes: list[str] = []
    extraction_errors = [
        f"{extraction.path.name}: {extraction.error}"
        for extraction in extractions
        if extraction.error
    ]
    if extraction_errors:
        notes.append("Extraction warnings: " + " | ".join(extraction_errors))

    # Urdu is normally authoritative for stanza numbering in these files.
    if numbered_positions(urdu_stanzas):
        added, complete = mirror_stanza_numbers(urdu_stanzas, roman_stanzas)
        if added:
            notes.append(f"Copied {added} stanza number(s) from Urdu to Roman Urdu.")
        if not complete:
            notes.append("Could not align every Urdu stanza number with Roman Urdu; review numbering.")
    elif numbered_positions(roman_stanzas):
        added, complete = mirror_stanza_numbers(roman_stanzas, urdu_stanzas)
        if added:
            notes.append(f"Copied {added} stanza number(s) from Roman Urdu to Urdu.")
        if not complete:
            notes.append("Could not align every Roman stanza number with Urdu; review numbering.")

    if not urdu_stanzas and not roman_stanzas:
        status = "needs-review"
        notes.append("No extractable text found; text may be rasterized or outlined.")
    elif not urdu_stanzas:
        status = "needs-review"
        notes.append("Roman Urdu extracted, but no Urdu text was detected in any source.")
    elif not roman_stanzas:
        status = "needs-review"
        notes.append("Urdu extracted, but no Roman Urdu text was detected in any source.")
    else:
        status = "ready"

    return ImportItem(
        category=category,
        source_dir=folder,
        title_roman=title_roman,
        slug=slug,
        png=png,
        text_sources=text_sources,
        urdu_source=urdu_source,
        roman_source=roman_source,
        urdu_stanzas=urdu_stanzas,
        roman_stanzas=roman_stanzas,
        status=status,
        notes=" ".join(notes),
    )


def indent_block(value: str) -> str:
    if not value:
        return "  "
    return "\n".join(f"  {line}" if line else "  " for line in value.splitlines())


def first_lyric_line(stanzas: list[Stanza], fallback: str) -> str:
    for stanza in stanzas:
        for line in stanza.lines:
            if line.strip() and normalize_number(line) is None:
                return line.strip()
    return fallback


def make_markdown(item: ImportItem, published: bool) -> str:
    urdu_title = first_lyric_line(item.urdu_stanzas, item.title_roman)
    cover_path = f"/images/lyrics/{item.slug}.png"

    frontmatter = [
        "---",
        f"title: {yaml_string(urdu_title)}",
        f"alternateTitle: {yaml_string(item.title_roman)}",
        'language: "Urdu"',
        'lang: "ur"',
        'direction: "rtl"',
        "tags:",
        f"  - {yaml_string(item.category)}",
        "aliases:",
        f"  - {yaml_string(item.title_roman)}",
        f"cover: {yaml_string(cover_path)}",
        f"coverAlt: {yaml_string(f'Cover image for {item.title_roman}')}",
        f"published: {'true' if published else 'false'}",
    ]

    if item.roman:
        frontmatter.extend([
            "romanLyrics: |-",
            indent_block(item.roman),
        ])

    frontmatter.append("---")
    return "\n".join(frontmatter) + "\n\n" + item.urdu + "\n"


def write_item(
    item: ImportItem,
    markdown_dir: Path,
    image_dir: Path,
    published: bool,
    overwrite: bool,
) -> tuple[str, str]:
    markdown_path = markdown_dir / f"{item.slug}.md"
    image_path = image_dir / f"{item.slug}.png"

    markdown_dir.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)

    if (markdown_path.exists() or image_path.exists()) and not overwrite:
        return "existing-skip", (
            f"Output already exists: {markdown_path.name} or {image_path.name}"
        )

    markdown_path.write_text(
        make_markdown(item, published=published),
        encoding="utf-8",
    )
    assert item.png is not None
    shutil.copy2(item.png, image_path)
    return item.status, item.notes


def write_report(items: list[ImportItem], report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with report_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "category",
                "folder",
                "slug",
                "status",
                "notes",
                "png",
                "all_text_sources",
                "urdu_source",
                "roman_source",
                "urdu_stanzas",
                "roman_stanzas",
                "urdu_numbered_stanzas",
                "roman_numbered_stanzas",
            ],
        )
        writer.writeheader()

        for item in items:
            writer.writerow({
                "category": item.category,
                "folder": str(item.source_dir),
                "slug": item.slug,
                "status": item.status,
                "notes": item.notes,
                "png": str(item.png or ""),
                "all_text_sources": " | ".join(path.name for path in item.text_sources),
                "urdu_source": item.urdu_source.name if item.urdu_source else "",
                "roman_source": item.roman_source.name if item.roman_source else "",
                "urdu_stanzas": len(item.urdu_stanzas),
                "roman_stanzas": len(item.roman_stanzas),
                "urdu_numbered_stanzas": len(numbered_positions(item.urdu_stanzas)),
                "roman_numbered_stanzas": len(numbered_positions(item.roman_stanzas)),
            })


def main() -> int:
    args = parse_args()
    source = args.source.expanduser().resolve()
    site = args.site.expanduser().resolve()

    if not source.is_dir():
        print(f"ERROR: source directory does not exist: {source}", file=sys.stderr)
        return 2

    if not site.is_dir():
        print(f"ERROR: Astro site directory does not exist: {site}", file=sys.stderr)
        return 2

    if args.apply:
        markdown_dir = site / "src/data/lyrics"
        image_dir = site / "public/images/lyrics"
        report_path = site.parent / "lyrics-import-report.csv"
        mode = "APPLY"
    else:
        preview_dir = (
            args.preview_dir.expanduser().resolve()
            if args.preview_dir
            else site.parent / f"{site.name}-import-preview"
        )
        markdown_dir = preview_dir / "src/data/lyrics"
        image_dir = preview_dir / "public/images/lyrics"
        report_path = preview_dir / "import-report.csv"
        mode = "PREVIEW"

        if preview_dir.exists() and args.overwrite:
            shutil.rmtree(preview_dir)

    used_slugs: set[str] = set()
    items: list[ImportItem] = []

    category_dirs = sorted(
        (path for path in source.iterdir() if path.is_dir()),
        key=lambda path: path.name.casefold(),
    )

    for category_dir in category_dirs:
        lyric_dirs = sorted(
            (path for path in category_dir.iterdir() if path.is_dir()),
            key=lambda path: path.name.casefold(),
        )

        for folder in lyric_dirs:
            item = build_item(category_dir.name, folder, used_slugs)

            if item.status not in {"skipped", "error"}:
                final_status, final_notes = write_item(
                    item,
                    markdown_dir,
                    image_dir,
                    published=args.published,
                    overwrite=args.overwrite,
                )
                item.status = final_status
                item.notes = final_notes

            items.append(item)

    write_report(items, report_path)

    counts: dict[str, int] = {}
    for item in items:
        counts[item.status] = counts.get(item.status, 0) + 1

    print(f"\nMode: {mode}")
    print(f"Processed folders: {len(items)}")
    for status, count in sorted(counts.items()):
        print(f"  {status}: {count}")
    print(f"Markdown output: {markdown_dir}")
    print(f"Image output:    {image_dir}")
    print(f"Review report:   {report_path}")

    if not args.apply:
        print("\nNothing was written into the live Astro site.")
        print("Review the preview, then rerun with --apply.")
    elif not args.published:
        print("\nGenerated entries are unpublished. Review them and change published to true.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
