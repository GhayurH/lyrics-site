"""Unpack the verified clean-lyrics handoff into unpublished website Markdown.

Never overwrite existing poems. Skipped/colliding files remain in the import
branch until individually resolved. The receipt is used for verified cleanup.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
INBOX = ROOT / "handoff/inbox"
INDEX = INBOX / "index.json"
DEST = ROOT / "src/data/lyrics"
SOURCE_SUFFIX = re.compile(
    r"-(?:tajpoints|tajpoint|nohayonline|nohawriteups|ziyaraat)-[0-9a-f]{20}$"
)
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
SOURCE_ID = re.compile(r"(?m)^# source_id:\s*(\S+)\s*$")


def checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def slug_for(import_file: str, content: str) -> str:
    if not import_file.endswith(".md"):
        raise ValueError(f"Invalid import filename: {import_file}")
    stem = import_file[:-3]
    stem = SOURCE_SUFFIX.sub("", stem)
    if re.search(r"(?:^|-)page-[0-9]+(?:-|$)", stem):
        raise ValueError("Potential partial-page edition needs lyric review")
    if re.fullmatch(r"(?:[0-9]{1,4}|p[0-9]{3}|kalam|noha|lyrics)", stem):
        header = FRONTMATTER.match(content)
        if not header:
            raise ValueError("Missing original title for generic filename")
        meta = yaml.safe_load(header.group(1))
        candidate = meta.get("alternateTitle") or meta.get("title") or ""
        if re.search(r"[\u0600-\u06ff]", candidate) or not re.search(r"[a-zA-Z]{3,}", candidate):
            raise ValueError("Generic filename has no sourced Roman title")
        stem = candidate.lower()
    stem = re.sub(r"[^a-z0-9-]+", "-", stem.lower()).strip("-")
    if len(stem) > 160:
        stem = stem[:160].rsplit("-", 1)[0]
    if not stem:
        raise ValueError(f"Missing usable slug for {import_file}")
    return stem


def transform(content: str, import_file: str) -> str:
    match = FRONTMATTER.match(content)
    if match is None:
        raise ValueError("Missing frontmatter delimiters")
    meta = yaml.safe_load(match.group(1))
    if not isinstance(meta, dict):
        raise ValueError("Invalid frontmatter")
    lang = meta.get("language")
    expected = {
        "Urdu": ("ur", "rtl"),
        "Roman Urdu": ("ur", "ltr"),
        "English": ("en", "ltr"),
    }
    if lang not in expected or (meta.get("lang"), meta.get("direction")) != expected[lang]:
        raise ValueError(f"Unsupported language/script pairing: {lang}")
    if not meta.get("title") or meta.get("kalamType") in (None, "", "Other"):
        raise ValueError("Missing title or classified kalam type")
    if meta.get("published") is not False:
        raise ValueError("Only unpublished staging poems may be transferred")

    tags = list(meta.get("tags") or [])
    if not meta.get("cover") and "noImage" not in tags:
        tags.append("noImage")
    if lang != "Roman Urdu" and not meta.get("romanLyrics") and "noRoman" not in tags:
        tags.append("noRoman")
    if lang != "Urdu" and "noUrdu" not in tags:
        tags.append("noUrdu")
    # The importer has no separate Punjabi track. Do not claim this tag
    # when the source explicitly identifies itself as Punjabi.
    identifying = (" ".join((str(meta.get("title") or ""), str(meta.get("alternateTitle") or ""), import_file)))
    if not re.search(r"(?i)punjabi|panjabi|پنجابی", identifying):
        if "noPanjabi" not in tags:
            tags.append("noPanjabi")
    tags = list(dict.fromkeys(tags))

    header = match.group(1)
    if re.search(r"(?m)^tags:\s*.*$", header):
        header = re.sub(
            r"(?m)^tags:\s*.*$",
            lambda _: "tags: " + json.dumps(tags, ensure_ascii=False),
            header, count=1,
        )
    else:
        header += "\ntags: " + json.dumps(tags, ensure_ascii=False)
    return "---\n" + header + "\n---\n" + content[match.end():]


def main() -> None:
    if not INDEX.exists():
        raise SystemExit("No transfer index; refusing to run")
    idx = json.loads(INDEX.read_text(encoding="utf-8"))
    if idx["format"] != "kalamarchive-certain-handoff-v1":
        raise ValueError("Unexpected transfer format")
    items = []
    seen = set()
    for chunk in idx["chunks"]:
        path = INBOX / chunk["file"]
        data = path.read_bytes()
        if checksum(data) != chunk["sha256"]:
            raise ValueError(f"Corrupted transfer shard: {path.name}")
        rows = [json.loads(row) for row in data.decode("utf-8").splitlines()]
        if len(rows) != chunk["count"]:
            raise ValueError(f"Incorrect shard count: {path.name}")
        for item in rows:
            name = item["import_file"]
            if name in seen:
                raise ValueError(f"Duplicate transfer source: {name}")
            seen.add(name)
            content = item["content"]
            if checksum(content.encode("utf-8")) != item["sha256"]:
                raise ValueError(f"Source checksum mismatch: {name}")
            actual_ids = set(SOURCE_ID.findall(content))
            if not set(item["source_ids"]) <= actual_ids:
                raise ValueError(f"Source provenance mismatch: {name}")
            items.append(item)
    if len(items) != idx["total"]:
        raise ValueError("Missing transfer items")

    written, skipped = [], []
    reserved = set()
    for item in items:
        try:
            slug = slug_for(item["import_file"], item["content"])
            target = DEST / (slug + ".md")
            if target.exists() or slug in reserved:
                skipped.append({
                    "import_file": item["import_file"],
                    "reason": "Existing website slug or handoff collision",
                })
                continue
            rendered = transform(item["content"], item["import_file"])
            target.write_text(rendered, encoding="utf-8")
            reserved.add(slug)
            written.append({
                "import_file": item["import_file"],
                "website_file": target.relative_to(ROOT).as_posix(),
                "source_ids": item["source_ids"],
                "sha256": checksum(rendered.encode("utf-8")),
            })
        except (ValueError, KeyError, TypeError) as exc:
            skipped.append({"import_file": item["import_file"], "reason": str(exc)})

    receipt = {
        "format": "kalamarchive-certain-receipt-v1",
        "offered": len(items),
        "written": len(written),
        "skipped": len(skipped),
        "entries": written,
        "skips": skipped,
    }
    (ROOT / "handoff/receipt.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(INBOX)
    print(f"Imported {len(written)} unpublished poems, skipped {len(skipped)} for review")


if __name__ == "__main__":
    main()
