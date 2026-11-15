#!/usr/bin/env python3
"""Reconcile ONLY unpublished feature-branch lyric identities and review records.

Existing main identities are immutable. Import-only provisional IDs may be
discarded until merge, so remove the deleted imports instead of retiring them.
"""
import csv
import json
import re
import subprocess
from pathlib import Path

BASE = Path("src/data/lyrics")
LOCK = Path("src/data/recitation/identity-lock.json")
REVIEW = Path("audit/manual-md-review-tracker.csv")
ROUNDS = Path("audit/lyric-md-rounds.csv")

# Verified against individual recent feature-branch commits.
deleted = {
    "abid-ko-dawa-aur.md": "31f4244f1b4109bac882b01590d3a6920e5a37c0",
    "abid-na-kabhi-ranj.md": "3aa15fe141ce2d5ec61b37eed6532036effb178b",
    "ay-ahle-aza.md": "31f4244f1b4109bac882b01590d3a6920e5a37c0",
}
merged = "ana-ibne-makkah.md"
renamed_from = "bayaan-karta-hun-darbar-e-shaam-ka-manzar.md"
renamed_to = "ana-ibn-e-makka-o-mina.md"
new_id = Path(renamed_to).stem
removed_names = set(deleted) | {merged, renamed_from}

def full(name):
    return str(BASE / name)

def git_show_main(rel):
    return subprocess.check_output(
        ["git", "show", "origin/main:" + str(rel)], text=True
    )

original_lock = json.loads(LOCK.read_text("utf-8"))
main_lock = json.loads(git_show_main(LOCK))
main_entries = {entry["id"]: entry for entry in main_lock["lyrics"]}
locked_by_path = {item["path"]: item for item in original_lock["lyrics"]}
active_files = {p.name for p in BASE.glob("*.md")}
stale = set(locked_by_path) - active_files
missing = active_files - set(locked_by_path)

assert stale == removed_names, ("Unexpected removed/moved lyric IDs:", sorted(stale))
assert missing == {renamed_to}, ("Unexpected unlocked new poems:", sorted(missing))
assert not removed_names.intersection({item["path"] for item in main_lock["lyrics"]})
assert new_id not in {item["id"] for item in original_lock["lyrics"]}
assert renamed_to in active_files and renamed_from not in active_files
assert len(locked_by_path) == len(original_lock["lyrics"]), "Duplicate lock paths"
assert len({item["id"] for item in original_lock["lyrics"]}) == len(original_lock["lyrics"]), "Duplicate lock IDs"
for name in removed_names:
    assert locked_by_path[name]["id"] not in main_entries, "Cannot remove main ID"

# Assign an entirely new ID for the renamed, not-yet-published poem. Its
# original ID is not retired; it is deleted from the provisional registry.
new_md = BASE / renamed_to
source = new_md.read_text("utf-8")
front = re.match(r"\A---\r?\n([\s\S]*?)\r?\n---\r?\n", source)
assert front, "Renamed Markdown has invalid frontmatter"
old_declared = re.search(r"(?m)^recitationId:\s*(.+)$", front.group(1))
assert old_declared is None, "Review unexpected explicit recitationId before changing it"
assert re.search(r"(?m)^published:\s*true\s*$", front.group(1))
new_header = front.group(1).replace(
    "published: true", 'recitationId: "' + new_id + '"\npublished: true', 1
)
assert new_header != front.group(1)
new_md.write_text("---\n" + new_header + "\n---\n" + source[front.end():], "utf-8")

new_lock = dict(original_lock)
new_entries = [
    entry for entry in original_lock["lyrics"]
    if entry["path"] not in removed_names
]
new_entries.append({"id": new_id, "path": renamed_to})
# Keep the existing lock's relative ordering; insert just the new record.
added = new_entries.pop()
insert_at = next((i for i, v in enumerate(new_entries)
                  if v["id"] > added["id"]), len(new_entries))
new_entries.insert(insert_at, added)
new_lock["lyrics"] = new_entries

assert all(next((x for x in new_entries if x["id"] == identity), None) == value
           for identity, value in main_entries.items()), "Main identity was changed"
assert len(new_entries) == len(active_files), "Lock file count differs from active lyric count"
assert {entry["path"] for entry in new_entries} == active_files, "Lock contains stale paths"
assert len({entry["id"] for entry in new_entries}) == len(new_entries), "Duplicate ID"
assert not any(entry.get("retired") for entry in new_entries
               if entry["id"] not in main_entries), "Provisional retirement remains"
assert new_lock["basta"] == main_lock["basta"], "Basta identity lock differs from main"
LOCK.write_text(json.dumps(new_lock, ensure_ascii=False, indent=2) + "\n", "utf-8")

def open_csv(path):
    original = path.read_text("utf-8")
    bom = original.startswith("\ufeff")
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        columns = reader.fieldnames
        assert columns and "path" in columns and "notes" in columns, (path, columns)
        records = [dict(r) for r in reader]
    assert len({r["path"] for r in records}) == len(records), f"Duplicate tracker path in {path}"
    return columns, records, bom

def write_csv(path, columns, records, bom):
    with path.open("w", encoding="utf-8-sig" if bom else "utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(sorted(records, key=lambda row: row["path"]))

def note(row, text):
    previous = row.get("notes", "").strip()
    if text not in previous:
        row["notes"] = (previous + " | " if previous else "") + text

def record_for(rows, path, columns, source_kind=None):
    found = next((r for r in rows if r["path"] == path), None)
    if found is not None:
        return found
    # Only create a tombstone if a prior manual-review record was absent.
    new = {key: "" for key in columns}
    new["path"] = path
    if "scope" in new: new["scope"] = "standalone_lyrics"
    if "origin" in new: new["origin"] = "imported"
    if "source" in new and source_kind: new["source"] = source_kind
    rows.append(new)
    return new

review_cols, review_rows, review_bom = open_csv(REVIEW)
assert "duplicate_pass" in review_cols, "Review tracker lacks duplicate-pass field"
for name, commit in deleted.items():
    row = record_for(review_rows, full(name), review_cols, "nohayonline")
    row["duplicate_pass"] = "removed_duplicate"
    note(row, "Deleted as duplicate in " + commit[:12] +
         "; unmerged provisional Recitation Set ID purged, not retired (2026-11-15).")

merged_row = record_for(review_rows, full(merged), review_cols, "nohayonline")
merged_row["duplicate_pass"] = "consolidated"
note(merged_row, "Consolidated into " + full(renamed_to) +
     "; old unmerged provisional Recitation Set ID deleted, not retired.")

old_path, new_path = full(renamed_from), full(renamed_to)
old_review = next((row for row in review_rows if row["path"] == old_path), None)
new_review = next((row for row in review_rows if row["path"] == new_path), None)
assert not (old_review and new_review), "Review tracker contains both old and new rename paths"
if old_review:
    old_review["path"] = new_path
    row = old_review
else:
    row = record_for(review_rows, new_path, review_cols, "nohayonline")
note(row, "Renamed from " + old_path + " in 27185a770647; " +
     "brand-new provisional recitationId=" + new_id +
     "; previous provisional identity purged, not retired; also contains consolidated " + merged + ".")
write_csv(REVIEW, review_cols, review_rows, review_bom)

round_cols, round_rows, round_bom = open_csv(ROUNDS)
assert {"round", "status", "source_sites", "source_ids", "added_from"}.issubset(round_cols)
round_map = {r["path"]: r for r in round_rows}
for name, commit in deleted.items():
    assert full(name) in round_map, "Missing round-one tombstone: " + name
    row = round_map[full(name)]
    assert row["round"] == "round_1", name
    row["status"] = "removed_duplicate"
    note(row, "Deleted in " + commit[:12] + "; provisional identity purged before merge.")
assert full(merged) in round_map
row = round_map[full(merged)]
row["status"] = "consolidated"
row["notes"] = row.get("notes", "").replace(full(renamed_from), full(renamed_to))
note(row, "Old provisional recitation ID purged; survivor " + full(renamed_to) + ".")
assert full(renamed_from) in round_map
assert full(renamed_to) not in round_map, "New rename path already has a round-ledger row"
before = round_map[full(renamed_from)]
assert before["round"] == "round_1"
before["status"] = "renamed"
note(before, "Renamed to " + full(renamed_to) +
     "; old provisional identity purged before merge.")
new_row = dict(before)
new_row["path"] = full(renamed_to)
new_row["status"] = "present"
new_row["notes"] = "Renamed from " + full(renamed_from) + \
    "; new provisional recitationId=" + new_id + \
    "; contains merged lyrics/provenance from " + merged + "."
round_rows.append(new_row)
write_csv(ROUNDS, round_cols, round_rows, round_bom)

# Validate the changes represent precisely the expected files and decisions.
review_check = open_csv(REVIEW)[1]
round_check = open_csv(ROUNDS)[1]
assert len(review_check) == len(review_rows)
assert len(round_check) == len(round_rows)
review_map = {row["path"]: row for row in review_check}
assert new_path in review_map and old_path not in review_map
assert all(review_map[full(name)]["duplicate_pass"] == "removed_duplicate"
           for name in deleted)
assert review_map[full(merged)]["duplicate_pass"] == "consolidated"
assert next(row for row in round_check if row["path"] == new_path)["status"] == "present"
assert all(next(row for row in round_check if row["path"] == full(name))["status"] == "removed_duplicate"
           for name in deleted)
print(json.dumps({
    "deleted_provisional_ids": sorted(locked_by_path[n]["id"] for n in removed_names),
    "new_id_for_renamed_lyric": new_id,
    "main_ids_unchanged": len(main_entries),
    "active_lyrics": len(active_files),
    "locked_lyrics": len(new_entries),
    "manual_tracker_records": len(review_check),
    "round_ledger_records": len(round_check),
}, ensure_ascii=False, indent=2))
