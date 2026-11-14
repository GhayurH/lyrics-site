#!/usr/bin/env python3
"""Verify the immutable initial NohaWriteups handoff against the sole source tracker.

The 125-entry first batch has already been materialized. This historical helper
must never regenerate lyric files or create a second status CSV.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "audit/nohawriteups-review-decisions-1-prepared.json"
TRACKER = ROOT / "audit/nohawriteups-review-status.csv"


def main():
    original = json.loads(MANIFEST.read_text(encoding="utf-8"))
    items = original.get("sources", [])
    if original.get("schema_version") != 1 or len(items) != 125:
        raise ValueError("Initial source handoff changed unexpectedly")

    with TRACKER.open(newline="", encoding="utf-8") as file:
        tracker_rows = list(csv.DictReader(file))
    by_id = {row["source_id"]: row for row in tracker_rows}
    if len(by_id) != len(tracker_rows):
        raise ValueError("Duplicate source IDs in the sole tracker")

    missing = [item["source_id"] for item in items if item["source_id"] not in by_id]
    if missing:
        raise ValueError("Initial handoff missing from cumulative tracker: " + repr(missing))

    missing_files = []
    for item in items:
        row = by_id[item["source_id"]]
        path = row.get("target_path", "")
        if row.get("status") in {"unpublished_source_draft", "consolidated_new_draft"}:
            if not path or not (ROOT / path).is_file():
                missing_files.append((item["source_id"], path))
    if missing_files:
        raise ValueError("Staged poems not found: " + repr(missing_files))

    print(f"Verified {len(items)} initial sources against {len(tracker_rows)} total source identities; no files modified.")


if __name__ == "__main__":
    main()
