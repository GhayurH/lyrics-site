#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
from pathlib import Path


URDU_DIR = Path("src/data/basta/pages")
ROMAN_DIR = Path("src/data/basta/roman")

BREAK_RE = re.compile(r"^\s*---\s*\*{3}\s*---\s*$")

URDU_DIGITS = str.maketrans({
    "0": "۰",
    "1": "۱",
    "2": "۲",
    "3": "۳",
    "4": "۴",
    "5": "۵",
    "6": "۶",
    "7": "۷",
    "8": "۸",
    "9": "۹",
})

JARI_URDU_RE = re.compile(
    r"""
    ^\s*
    (?:[*_~`>#-]+\s*)*
    .*?
    (?:[-–—:：؛،,.۔]\s*)?
    (?:جاری|جارى)
    \s*
    [)\]}]?
    \s*
    (?:[*_~`]+)?
    \s*$
    """,
    re.VERBOSE,
)

JARI_ROMAN_RE = re.compile(
    r"""
    ^\s*
    (?:[*_~`>#-]+\s*)*
    [(\[{]?\s*
    (?:jari|jaari|jārī|jāri)
    \s*[:;,.\-–—]*\s*
    [)\]}]?
    (?:\s*[*_~`]+)?
    \s*$
    """,
    re.VERBOSE | re.IGNORECASE,
)


def split_frontmatter(text: str) -> tuple[str, str]:
    """
    Return (frontmatter, body).

    YAML frontmatter is deliberately left untouched.
    """
    lines = text.splitlines(keepends=True)

    if not lines or lines[0].strip() != "---":
        return "", text

    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "".join(lines[: i + 1]), "".join(lines[i + 1 :])

    return "", text


def remove_leading_jari(body: str, language: str) -> tuple[str, int]:
    """
    Remove جاری / جارى or jari marker lines near the beginning of a page.

    Only the first six non-empty body lines are considered, so genuine
    occurrences later in lyrics are not touched.
    """
    matcher = JARI_URDU_RE if language == "urdu" else JARI_ROMAN_RE

    lines = body.splitlines(keepends=True)

    nonempty_seen = 0
    removed = 0
    output: list[str] = []

    for line in lines:
        if line.strip():
            nonempty_seen += 1

        if nonempty_seen <= 6 and matcher.match(line.rstrip("\r\n")):
            removed += 1
            continue

        output.append(line)

    return "".join(output), removed


def paragraph(lines: list[str], start: int) -> tuple[int, int] | None:
    """Return inclusive bounds of the next non-empty paragraph."""
    n = len(lines)

    while start < n and not lines[start].strip():
        start += 1

    if start >= n:
        return None

    end = start

    while end + 1 < n and lines[end + 1].strip():
        end += 1

    return start, end


def move_breaks_before_headings(body: str):
    """
    Move a ---***--- separator that appears AFTER a heading block
    to BEFORE that heading block.

    Example:

        Author Name

        ---***---

        lyric line 1
        lyric line 2

    becomes:

        ---***---

        Author Name

        lyric line 1
        lyric line 2

    A heading block may contain up to 4 consecutive one-line paragraphs,
    e.g. category -> type -> title -> author.
    """
    lines = body.splitlines()
    moved = 0
    i = 0

    while i < len(lines):
        if not BREAK_RE.match(lines[i]):
            i += 1
            continue

        # The paragraph AFTER the break should look like lyric content,
        # i.e. contain at least 2 non-empty lines.
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1

        if j >= len(lines):
            i += 1
            continue

        next_para_end = j
        while (
            next_para_end < len(lines)
            and lines[next_para_end].strip()
            and not BREAK_RE.match(lines[next_para_end])
        ):
            next_para_end += 1

        next_para = lines[j:next_para_end]

        if len(next_para) < 2:
            i += 1
            continue

        # Look backwards for up to 4 consecutive one-line paragraphs.
        heading_starts = []
        cursor = i - 1

        for _ in range(4):
            # Skip blank lines before the separator/current heading.
            while cursor >= 0 and not lines[cursor].strip():
                cursor -= 1

            if cursor < 0 or BREAK_RE.match(lines[cursor]):
                break

            para_end = cursor
            para_start = cursor

            while (
                para_start - 1 >= 0
                and lines[para_start - 1].strip()
                and not BREAK_RE.match(lines[para_start - 1])
            ):
                para_start -= 1

            para = lines[para_start:para_end + 1]

            # Only one-line paragraphs are treated as headings.
            if len(para) != 1:
                break

            heading_starts.append(para_start)
            cursor = para_start - 1

        if not heading_starts:
            i += 1
            continue

        # Earliest heading in the heading block.
        heading_start = min(heading_starts)

        # Remove the separator from its old location.
        break_line = lines.pop(i)

        # Remove blank lines immediately before its old location.
        while i - 1 >= heading_start and not lines[i - 1].strip():
            lines.pop(i - 1)
            i -= 1

        # Insert separator immediately before the entire heading block,
        # with one blank line after it.
        lines.insert(heading_start, break_line)
        lines.insert(heading_start + 1, "")

        moved += 1

        # Continue after the moved block.
        i = heading_start + 2

    return "\n".join(lines), moved


def cleanup_body(body: str, language: str) -> tuple[str, dict[str, int]]:
    stats = {
        "english_to_urdu_commas": 0,
        "spaces_before_commas": 0,
        "ascii_to_urdu_digits": 0,
        "jari_removed": 0,
        "breaks_moved": 0,
        "double_spaces": 0,
    }

    # ------------------------------------------------------------
    # Remove leading جاری / jari markers
    # ------------------------------------------------------------

    body, count = remove_leading_jari(body, language)
    stats["jari_removed"] += count

    # ------------------------------------------------------------
    # Remove spaces before commas in BOTH Urdu and Roman
    #
    # foo , bar
    # foo ، bar
    #
    # becomes:
    #
    # foo, bar
    # foo، bar
    # ------------------------------------------------------------

    matches = re.findall(r"[ \t]+(?=[,،])", body)
    stats["spaces_before_commas"] += len(matches)

    body = re.sub(r"[ \t]+(?=[,،])", "", body)

    # ------------------------------------------------------------
    # Urdu-only normalization
    # ------------------------------------------------------------

    if language == "urdu":

        # English comma -> Urdu comma
        stats["english_to_urdu_commas"] += body.count(",")
        body = body.replace(",", "،")

        # ASCII digits -> Urdu digits
        stats["ascii_to_urdu_digits"] += len(re.findall(r"[0-9]", body))
        body = body.translate(URDU_DIGITS)

    # ------------------------------------------------------------
    # Collapse 2+ spaces BETWEEN text only.
    #
    # Does not alter blank lines or YAML.
    # ------------------------------------------------------------

    double_space_re = re.compile(r"(?<=\S)[ \t]{2,}(?=\S)")

    stats["double_spaces"] += len(double_space_re.findall(body))
    body = double_space_re.sub(" ", body)

    # ------------------------------------------------------------
    # Move visual breaks from BEFORE headings to AFTER headings.
    # ------------------------------------------------------------

    body, count = move_breaks_before_headings(body)
    stats["breaks_moved"] += count

    return body, stats


def process_file(
    path: Path,
    language: str,
    write: bool,
) -> tuple[bool, dict[str, int]]:
    original = path.read_text(encoding="utf-8")

    frontmatter, body = split_frontmatter(original)
    cleaned_body, stats = cleanup_body(body, language)

    cleaned = frontmatter + cleaned_body
    changed = cleaned != original

    if changed and write:
        path.write_text(cleaned, encoding="utf-8")

    return changed, stats


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize Urdu and Roman Basta Markdown files."
    )

    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually modify files. Without this flag, performs a dry run.",
    )

    args = parser.parse_args()

    roots = [
        ("urdu", URDU_DIR),
        ("roman", ROMAN_DIR),
    ]

    total_files = 0
    urdu_files = 0
    roman_files = 0
    changed_files = 0

    totals = {
        "english_to_urdu_commas": 0,
        "spaces_before_commas": 0,
        "ascii_to_urdu_digits": 0,
        "jari_removed": 0,
        "breaks_moved": 0,
        "double_spaces": 0,
    }

    for language, root in roots:
        if not root.exists():
            raise SystemExit(f"Directory does not exist: {root}")

        files = sorted(root.rglob("*.md"))

        if language == "urdu":
            urdu_files += len(files)
        else:
            roman_files += len(files)

        for path in files:
            total_files += 1

            changed, stats = process_file(
                path=path,
                language=language,
                write=args.write,
            )

            if changed:
                changed_files += 1

            for key in totals:
                totals[key] += stats[key]

    mode = "WRITE" if args.write else "DRY RUN"

    print()
    print(f"Mode: {mode}")
    print()
    print(
        f"Scanned: {total_files} files "
        f"({urdu_files} Urdu, {roman_files} Roman)"
    )
    print(f"Changed: {changed_files} files")
    print(
        f"  English -> Urdu commas: "
        f"{totals['english_to_urdu_commas']}"
    )
    print(
        f"  Spaces before commas removed: "
        f"{totals['spaces_before_commas']}"
    )
    print(
        f"  ASCII -> Urdu digits: "
        f"{totals['ascii_to_urdu_digits']}"
    )
    print(
        f"  Leading jari/جاری lines removed: "
        f"{totals['jari_removed']}"
    )
    print(
        f"  Breaks moved after headings: "
        f"{totals['breaks_moved']}"
    )
    print(
        f"  Double-space runs collapsed: "
        f"{totals['double_spaces']}"
    )

    if not args.write:
        print()
        print("No files written. Run again with --write to apply changes.")


if __name__ == "__main__":
    main()