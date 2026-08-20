#!/usr/bin/env python3
"""
Scan Basta Urdu and Roman Markdown files for likely transcription/encoding errors
and write a CSV report.

Default directories (relative to --root):
  src/data/basta/pages   # Urdu
  src/data/basta/roman   # Roman Urdu

Checks:
  - Unicode replacement character: �
  - Common mojibake/encoding-corruption fragments
  - "unclear / illegible / unknown" markers such as:
      غیر واضح, واضح نہیں, مبہم, ناقابلِ قرأت
      ghair wazeh, wazeh nahin, unclear, illegible, unknown, etc.
  - ASCII/Latin words in Urdu Markdown bodies

Frontmatter is ignored, so paths/booleans/etc. there do not create false positives.

Usage:
  python3 basta_error_report.py
  python3 basta_error_report.py --root ~/Projects/lyrics-site
  python3 basta_error_report.py --output /tmp/basta-errors.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from pathlib import Path
from typing import Iterable


# Any of these in correctly decoded Urdu/Roman text are suspicious.
MOJIBAKE_RE = re.compile(
    r"(?:"
    r"ï¿½|"
    r"â€™|â€œ|â€|â€“|â€”|â€¦|"
    r"Ã.|Â.|"
    r"Ø.|Ù."
    r")"
)

# Deliberately broad because these are editorial/OCR uncertainty markers.
# "واضح" on its own is not flagged; only uncertainty/error phrases are.
URDU_ERROR_RE = re.compile(
    r"(?:"
    r"جزوی\s*طور\s*پر\s*غیر\s*واضح|"
    r"غیر\s*واضح|"
    r"واضح\s*نہیں|"
    r"مبہم|"
    r"نامعلوم|"
    r"نامکمل|"
    r"ناقابل[ِ\s-]*(?:قرأت|قراءت|قرأت|خواندگی)|"
    r"پڑھ(?:ا|ی|ے)?\s*نہیں\s*(?:جا\s*)?سک(?:ا|ی|ے)?"
    r")",
    re.IGNORECASE,
)

# Roman text has appeared with several spellings/hyphenations, so tolerate them.
ROMAN_ERROR_RE = re.compile(
    r"(?:"
    r"juzwi\s+taur\s+par\s+ghair[-\s]?wazeh|"
    r"ghair[-\s]?wazeh|"
    r"wazeh\s+nah(?:i|ee)n|"
    r"na[-\s]?qabil[-\s]?e[-\s]?(?:qiraat|parhna|khwandagi)|"
    r"\bunclear\b|"
    r"\billegible\b|"
    r"\bunknown\b|"
    r"\bincomplete\b|"
    r"\bnot\s+clear\b|"
    r"\bcannot\s+read\b|"
    r"\bunreadable\b"
    r")",
    re.IGNORECASE,
)

# Latin/ASCII words in Urdu text. Apostrophes inside a word are retained.
LATIN_WORD_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")

# Other obviously suspicious placeholders.
PLACEHOLDER_RE = re.compile(
    r"(?:"
    r"\?{2,}|"
    r"\b(?:TODO|FIXME|TBD)\b"
    r")",
    re.IGNORECASE,
)


def split_frontmatter(text: str) -> tuple[str, int]:
    """
    Return (body, body_start_line_number).

    body_start_line_number is 1-based and lets CSV line numbers refer to the
    actual Markdown file rather than the stripped body.
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    if not text.startswith("---\n"):
        return text, 1

    end = text.find("\n---\n", 4)
    if end == -1:
        return text, 1

    body_start = end + len("\n---\n")
    line_offset = text[:body_start].count("\n")
    return text[body_start:], line_offset + 1


def page_from_markdown(text: str, fallback: str) -> str:
    match = re.search(r"(?m)^page:\s*(\d+)\s*$", text)
    return match.group(1) if match else fallback


def compact_snippet(line: str, limit: int = 220) -> str:
    value = line.strip().replace("\t", " ")
    value = re.sub(r"\s+", " ", value)
    if len(value) <= limit:
        return value
    return value[: limit - 1] + "…"


def unique_matches(regex: re.Pattern[str], line: str) -> str:
    found: list[str] = []
    seen: set[str] = set()
    for match in regex.finditer(line):
        value = match.group(0)
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            found.append(value)
    return " | ".join(found)


def issue_rows(
    file_path: Path,
    relative_path: Path,
    language: str,
) -> Iterable[dict[str, str | int]]:
    raw = file_path.read_text(encoding="utf-8", errors="replace")
    page = page_from_markdown(raw, file_path.stem)
    body, first_body_line = split_frontmatter(raw)

    for zero_index, line in enumerate(body.splitlines()):
        line_number = first_body_line + zero_index
        snippet = compact_snippet(line)

        # Skip totally empty lines early.
        if not line:
            continue

        if "\ufffd" in line:
            yield {
                "file": str(relative_path),
                "language": language,
                "page": page,
                "line": line_number,
                "issue_type": "replacement_character",
                "matched_text": "�",
                "snippet": snippet,
            }

        mojibake = unique_matches(MOJIBAKE_RE, line)
        if mojibake:
            yield {
                "file": str(relative_path),
                "language": language,
                "page": page,
                "line": line_number,
                "issue_type": "possible_mojibake",
                "matched_text": mojibake,
                "snippet": snippet,
            }

        error_re = URDU_ERROR_RE if language == "Urdu" else ROMAN_ERROR_RE
        error_markers = unique_matches(error_re, line)
        if error_markers:
            yield {
                "file": str(relative_path),
                "language": language,
                "page": page,
                "line": line_number,
                "issue_type": "unclear_or_error_marker",
                "matched_text": error_markers,
                "snippet": snippet,
            }

        placeholders = unique_matches(PLACEHOLDER_RE, line)
        if placeholders:
            yield {
                "file": str(relative_path),
                "language": language,
                "page": page,
                "line": line_number,
                "issue_type": "placeholder",
                "matched_text": placeholders,
                "snippet": snippet,
            }

        if language == "Urdu":
            latin_words = unique_matches(LATIN_WORD_RE, line)
            if latin_words:
                yield {
                    "file": str(relative_path),
                    "language": language,
                    "page": page,
                    "line": line_number,
                    "issue_type": "latin_text_in_urdu",
                    "matched_text": latin_words,
                    "snippet": snippet,
                }


def scan_directory(
    project_root: Path,
    directory: Path,
    language: str,
) -> list[dict[str, str | int]]:
    rows: list[dict[str, str | int]] = []

    if not directory.exists():
        print(f"WARNING: directory not found: {directory}")
        return rows

    for file_path in sorted(directory.glob("*.md")):
        try:
            relative_path = file_path.relative_to(project_root)
        except ValueError:
            relative_path = file_path

        rows.extend(issue_rows(file_path, relative_path, language))

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a CSV report of likely errors in Basta Urdu/Roman Markdown."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="lyrics-site project root (default: current directory)",
    )
    parser.add_argument(
        "--urdu-dir",
        type=Path,
        default=Path("src/data/basta/pages"),
        help="Urdu Markdown directory relative to --root",
    )
    parser.add_argument(
        "--roman-dir",
        type=Path,
        default=Path("src/data/basta/roman"),
        help="Roman Markdown directory relative to --root",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("basta-error-report.csv"),
        help="CSV output path (default: basta-error-report.csv)",
    )
    args = parser.parse_args()

    root = args.root.expanduser().resolve()
    urdu_dir = args.urdu_dir.expanduser()
    roman_dir = args.roman_dir.expanduser()

    if not urdu_dir.is_absolute():
        urdu_dir = root / urdu_dir
    if not roman_dir.is_absolute():
        roman_dir = root / roman_dir

    output = args.output.expanduser()
    if not output.is_absolute():
        output = root / output

    rows = []
    rows.extend(scan_directory(root, urdu_dir, "Urdu"))
    rows.extend(scan_directory(root, roman_dir, "Roman"))

    # Stable/actionable ordering: page, language, line, issue type.
    def sort_key(row: dict[str, str | int]):
        page_text = str(row["page"])
        try:
            page = int(page_text)
        except ValueError:
            page = 10**9
        return (
            page,
            0 if row["language"] == "Urdu" else 1,
            int(row["line"]),
            str(row["issue_type"]),
        )

    rows.sort(key=sort_key)

    output.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "file",
        "language",
        "page",
        "line",
        "issue_type",
        "matched_text",
        "snippet",
    ]

    # utf-8-sig makes Urdu open cleanly in Excel/LibreOffice as well as text tools.
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(str(row["issue_type"]) for row in rows)
    affected_files = {str(row["file"]) for row in rows}

    print(f"Wrote: {output}")
    print(f"Affected files: {len(affected_files)}")
    print(f"Total issues: {len(rows)}")
    for issue_type, count in sorted(counts.items()):
        print(f"  {issue_type}: {count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
