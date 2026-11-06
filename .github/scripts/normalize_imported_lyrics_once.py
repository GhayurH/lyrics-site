"""One-off editorial normalization of unpublished sourced lyric imports.

Keep published lyric editions and printed Basta sources untouched.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src/data/lyrics"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
TAG_LINE = re.compile(r"(?m)^tags:[ \t]*\[[^\n]*\][ \t]*$")
SOURCE_ID = re.compile(r"(?m)^# source_id: \S+", re.M)
LANGUAGE_TAGS = {"noUrdu", "noRoman", "noPanjabi"}
ENDING_PERIOD = re.compile(r"(?P<dot>[.\u06d4])(?P<quotes>[\"'\u201d\u2019\u00bb]*)(?P<spaces>[ \t]*)$")
STANZA = re.compile(r"^[0-9\u06f0-\u06f9\u0660-\u0669]+[.]?$")
ROMAN_BLOCK = re.compile(r"^romanLyrics:\s*[|>][-+0-9]*\s*$")


def trim_verse(line: str) -> tuple[str, bool]:
    eol = "\n" if line.endswith("\n") else ""
    plain = line[:-1] if eol else line
    stripped = plain.strip()
    if (not stripped or stripped.startswith(("#", "~~~"))
            or STANZA.fullmatch(stripped)
            or "https://" in stripped or "http://" in stripped):
        return line, False
    m = ENDING_PERIOD.search(plain)
    if not m:
        return line, False
    i = m.start("dot")
    # An ellipsis is expressive punctuation, not a verse-ending full stop.
    if i > 0 and plain[i - 1] in ".\u06d4":
        return line, False
    new_line = plain[:i].rstrip(" \t") + m.group("quotes") + eol
    return new_line, True


def normalize_roman_block(header: str) -> tuple[str, int]:
    lines = header.splitlines(keepends=True)
    within = False
    changes = 0
    for pos, line in enumerate(lines):
        if within and line.strip() and not line.startswith((" ", "\t")):
            within = False
        if ROMAN_BLOCK.fullmatch(line.rstrip("\n")):
            within = True
            continue
        if within and line.startswith((" ", "\t")):
            lines[pos], changed = trim_verse(line)
            changes += int(changed)
    return "".join(lines), changes


def normalize(content: str, path: Path) -> tuple[str, bool, int, int]:
    match = FRONTMATTER.match(content)
    if not match:
        return content, False, 0, 0
    header = match.group(1)
    if not SOURCE_ID.search(header):
        return content, False, 0, 0
    meta = yaml.safe_load(header)
    if not isinstance(meta, dict) or meta.get("published") is not False:
        return content, False, 0, 0
    tags = meta.get("tags", [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
        raise ValueError(f"Invalid tags list: {path.name}")
    language = meta.get("language")
    if language == "Urdu":
        language_tags = ["noRoman"] if not meta.get("romanLyrics") else []
    elif language == "Roman Urdu":
        language_tags = ["noUrdu"]
    elif language in {"English", "Arabic", "Persian"}:
        language_tags = []
    else:
        raise ValueError(f"Unexpected language {language!r}: {path.name}")

    desired = list(dict.fromkeys([tag for tag in tags if tag not in LANGUAGE_TAGS] + language_tags))
    updated_tags = desired != tags
    if updated_tags:
        if len(TAG_LINE.findall(header)) != 1:
            raise ValueError(f"Unexpected tags formatting: {path.name}")
        header = TAG_LINE.sub("tags: " + json.dumps(desired, ensure_ascii=False), header, count=1)
    header, roman_edits = normalize_roman_block(header)
    body_lines = content[match.end():].splitlines(keepends=True)
    new_body = []
    body_edits = 0
    for line in body_lines:
        out, edited = trim_verse(line)
        new_body.append(out)
        body_edits += int(edited)
    new_content = "---\n" + header + "\n---\n" + "".join(new_body)
    return new_content, True, int(updated_tags), roman_edits + body_edits


def main() -> None:
    check = sys.argv[1:] == ["--check"]
    if sys.argv[1:] not in ([], ["--check"]):
        raise SystemExit("Usage: normalize_imported_lyrics.py [--check]")
    totals = Counter()
    offenders = []
    for path in sorted(SOURCE.glob("*.md")):
        original = path.read_text(encoding="utf-8")
        changed, targeted, tags, lines = normalize(original, path)
        if not targeted:
            continue
        totals["drafts"] += 1
        totals["tags"] += tags
        totals["verse_lines"] += lines
        if changed != original:
            totals["files_changed"] += 1
            if check:
                offenders.append(path.name)
            else:
                path.write_text(changed, encoding="utf-8")
    print(json.dumps(dict(totals), indent=2))
    if totals["drafts"] < 3000:
        raise ValueError(f"Only {totals['drafts']} sourced unpublished drafts found")
    if offenders:
        raise ValueError(f"{len(offenders)} drafts still require normalization: {offenders[:8]}")


if __name__ == "__main__":
    main()
