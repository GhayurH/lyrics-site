"""One-time source-verified NoHayOnline Shayar -> poet frontmatter enrichment."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
INBOX = ROOT / "handoff/nohayonline-poets"
LYRICS = ROOT / "src/data/lyrics"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
SOURCE = re.compile(r"(?m)^# source_id:\s*(nohayonline:[0-9a-f]{20})\s*$")
POET_FIELD = re.compile(r"(?m)^poet:[^\n]*$")
INSERT_AFTER = re.compile(r"(?m)^kalamType:[^\n]*$")
SPACES = re.compile(r"\s+")


def canonical(value: str) -> str:
    return SPACES.sub(" ", value).strip().casefold()


def load_map() -> dict[str, str]:
    manifest = json.loads((INBOX / "index.json").read_text(encoding="utf-8"))
    if manifest.get("format") != "nohayonline-poet-handoff-v1":
        raise ValueError("Unrecognized source handoff")
    lookup = {}
    total = 0
    for chunk in manifest["chunks"]:
        name = chunk["file"]
        if not re.fullmatch(r"part-[0-9]{4}\.jsonl", name):
            raise ValueError(f"Unexpected shard path: {name}")
        raw = (INBOX / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != chunk["sha256"]:
            raise ValueError(f"Source data checksum mismatch: {name}")
        rows = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line]
        if len(rows) != chunk["count"]:
            raise ValueError(f"Incorrect row count: {name}")
        for row in rows:
            sid = row["source_id"]
            poet = row["poet"]
            if (not re.fullmatch(r"nohayonline:[0-9a-f]{20}", sid)
                    or not isinstance(poet, str) or not poet.strip()
                    or sid in lookup):
                raise ValueError(f"Invalid or duplicate source credit: {sid}")
            lookup[sid] = poet.strip()
        total += len(rows)
    if total != manifest["records"] or total != len(lookup):
        raise ValueError("Source credit count mismatch")
    return lookup


def apply(content: str, lookup: dict[str, str], stats: Counter,
          conflicts: list[dict], filename: str) -> str:
    match = FRONTMATTER.match(content)
    if not match:
        return content
    header = match.group(1)
    ids = set(SOURCE.findall(header))
    if not ids:
        return content
    meta = yaml.safe_load(header)
    if not isinstance(meta, dict) or meta.get("published") is not False:
        stats["published_or_invalid_skipped"] += 1
        return content
    stats["drafts_with_nohayonline_source"] += 1
    poets = {lookup[i] for i in ids if i in lookup}
    if not poets:
        stats["no_archived_shayar_found"] += 1
        return content
    if len({canonical(p) for p in poets}) != 1:
        stats["multiple_shayar_conflict"] += 1
        conflicts.append({"file":filename, "source_ids":sorted(ids), "poets":sorted(poets)})
        return content
    poet = sorted(poets, key=len, reverse=True)[0]
    previous = meta.get("poet")
    if previous is not None and not isinstance(previous, str):
        stats["existing_poet_invalid"] += 1
        return content
    if previous and canonical(previous) == canonical(poet):
        stats["already_correct"] += 1
        return content
    if previous:
        # Only replace a demonstrably abbreviated author name; protect
        # complete existing attributions from any automatic overwrite.
        p = canonical(previous)
        full = canonical(poet)
        if len(previous.split()) != 1 or not full.startswith(p + " "):
            stats["different_existing_poet_review"] += 1
            conflicts.append({"file":filename,"existing":previous,"source_poet":poet})
            return content
        stats["expanded_abbreviated_poet"] += 1
    else:
        stats["new_poet"] += 1
    encoded = json.dumps(poet, ensure_ascii=False)
    if previous:
        if len(POET_FIELD.findall(header)) != 1:
            raise ValueError(f"Unexpected poet formatting: {filename}")
        new_header = POET_FIELD.sub("poet: " + encoded, header, count=1)
    else:
        if len(INSERT_AFTER.findall(header)) != 1:
            raise ValueError(f"Missing kalamType metadata: {filename}")
        new_header = INSERT_AFTER.sub(lambda m: m.group(0) + "\npoet: " + encoded, header, count=1)
    return "---\n" + new_header + "\n---\n" + content[match.end():]


def main():
    if sys.argv[1:] not in ([], ["--check"]):
        raise SystemExit("Usage: enrich_nohayonline_poets_once.py [--check]")
    check = sys.argv[1:] == ["--check"]
    lookup = load_map()
    stats = Counter()
    conflicts = []
    dirty = []
    for path in sorted(LYRICS.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        updated = apply(raw, lookup, stats, conflicts, path.name)
        if updated == raw:
            continue
        stats["files_updated"] += 1
        if check:
            dirty.append(path.name)
        else:
            path.write_text(updated, encoding="utf-8")
    print(json.dumps({"source_shayar_entries":len(lookup),
                      "summary":dict(stats),
                      "review_count":len(conflicts),
                      "review_examples":conflicts[:18]},ensure_ascii=False,indent=2))
    if stats["drafts_with_nohayonline_source"] == 0:
        raise ValueError("No NoHayOnline imports found — refusing empty update")
    if dirty:
        raise ValueError(f"Poet enrichment still needed for {len(dirty)} files: {dirty[:8]}")


if __name__ == "__main__":
    main()
