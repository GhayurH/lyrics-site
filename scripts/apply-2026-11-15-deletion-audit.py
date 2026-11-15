#!/usr/bin/env python3
"""Reconcile approved manual deletion decisions while preserving live identities."""
import csv
import json
import subprocess
from pathlib import Path

root = Path("src/data/lyrics")
lock_path = Path("src/data/recitation/identity-lock.json")
rounds_path = Path("audit/lyric-md-rounds.csv")
review_path = Path("audit/manual-md-review-tracker.csv")
audit_path = Path("audit/import-merge-readiness.md")
removed_imports = {
    "ay-chand-karbala-ke.md": "Basta page 138",
    "ay-jannatul-baqia.md": "Basta pages 420-421",
    "jab-imam-aayenge.md": None,
    "jab-imam-ayenge.md": None,
    "jissay-nisbat-nahi-aal-e-nabi-se.md": "Basta page 380",
    "jo-zair-e-kissa-parwaan-charhe-zainab-aisi-hasti-hai.md": "Basta page 391",
    "kon-kehta-hai-mujhe-shan-e-sikandar-de-de.md": "Basta page 363",
    "muhammad-e-baqir.md": "Basta page 381",
    "waqt-e-zahoor.md": None,
    "zainab-aisi-hasti-hai.md": "Basta page 391",
}
old_main = "zahoor-ka-waqt-aa-gaya-hai.md"
def full(n):
    return "src/data/lyrics/" + n

def main_version(path):
    return subprocess.check_output(
        ["git", "show", "origin/main:" + str(path)], text=True
    )

lock = json.loads(lock_path.read_text("utf-8"))
main = json.loads(main_version(lock_path))
assert lock["version"] == main["version"] == 1
assert lock["basta"] == main["basta"], "Existing Basta identities changed unexpectedly"
by_path = {x["path"]: x for x in lock["lyrics"]}
assert len(by_path) == len(lock["lyrics"])
assert len({x["id"] for x in lock["lyrics"]}) == len(lock["lyrics"])
main_by_id = {x["id"]: x for x in main["lyrics"]}
main_paths = {x["path"] for x in main["lyrics"]}
active = {p.name for p in root.glob("*.md")}
assert active - set(by_path) == set(), "New file not in registry"
assert set(by_path) - active == set(removed_imports) | {old_main}, "Unexpected missing files"
assert old_main in main_paths
assert not set(removed_imports) & main_paths, "Cannot purge pre-existing main IDs"
for name in removed_imports:
    assert by_path[name]["id"] not in main_by_id
assert by_path[old_main]["id"] in main_by_id

lock["lyrics"] = [
    {**e, "retired": True} if e["path"] == old_main else e
    for e in lock["lyrics"] if e["path"] not in removed_imports
]
assert len(lock["lyrics"]) == len(active) + 1
assert {e["path"] for e in lock["lyrics"] if not e.get("retired")} == active
assert len({e["id"] for e in lock["lyrics"]}) == len(lock["lyrics"])
for id_, original in main_by_id.items():
    found = next((e for e in lock["lyrics"] if e["id"] == id_), None)
    assert found == ({**original, "retired": True} if original["path"] == old_main
                     else original), "Published identity altered: " + id_
assert sum(bool(x.get("retired")) for x in lock["lyrics"]) == 1
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", "utf-8")

def csv_read(path):
    src = path.read_text("utf-8")
    bom = src.startswith("\ufeff")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rdr = csv.DictReader(f)
        cols = rdr.fieldnames
        assert cols and "path" in cols and "notes" in cols, str(path)
        rows = list(rdr)
    assert len(rows) == len({row["path"] for row in rows}), "Duplicate paths in " + str(path)
    return cols, rows, bom

def csv_write(path, cols, rows, bom):
    with path.open("w", encoding="utf-8-sig" if bom else "utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda r: r["path"]))

def add_note(row, new):
    before = row.get("notes", "").strip()
    if new not in before:
        row["notes"] = before + (" | " if before else "") + new

cols, rounds, bom = csv_read(rounds_path)
assert {"round", "status"}.issubset(cols)
round_by_path = {r["path"]: r for r in rounds}
for filename, page in removed_imports.items():
    row = round_by_path[full(filename)]
    assert row["round"] == "round_1" and row["status"] == "present"
    row["status"] = "removed_duplicate"
    add_note(row, "Manual duplicate removal 2026-11-15; unpublished recitation ID purged" +
             ("; retained " + page if page else "") + ".")
row = round_by_path[full(old_main)]
assert row["round"] == "original" and row["status"] == "present"
row["status"] = "retired"
add_note(row, "Deleted original after Basta 388-389 comparison; main's permanent "
         "recitation identity preserved as retired (2026-11-15).")
csv_write(rounds_path, cols, rounds, bom)

cols, reviews, bom = csv_read(review_path)
assert "duplicate_pass" in cols
review_by_path = {r["path"]: r for r in reviews}
for filename, page in removed_imports.items():
    key = full(filename)
    if key not in review_by_path:
        row = {k: "" for k in cols}
        row.update(path=key)
        if "scope" in row: row["scope"] = "standalone_lyrics"
        if "origin" in row: row["origin"] = "imported"
        reviews.append(row)
        review_by_path[key] = row
    row = review_by_path[key]
    row["duplicate_pass"] = "removed_duplicate"
    add_note(row, "2026-11-15: manually deleted duplicate; unpublished provisional ID " +
             by_path[filename]["id"] + " purged, not retired." +
             (" Retained " + page + "." if page else ""))
key = full(old_main)
if key not in review_by_path:
    row = {k: "" for k in cols}
    row.update(path=key)
    if "scope" in row: row["scope"] = "standalone_lyrics"
    if "origin" in row: row["origin"] = "original"
    reviews.append(row)
    review_by_path[key] = row
row = review_by_path[key]
row["duplicate_pass"] = "retired_original"
add_note(row, "2026-11-15: deleted original standalone copy in favor of Basta 388-389; "
         "existing published main ID zahoor-ka-waqt-aa-gaya-hai remains retired.")
csv_write(review_path, cols, reviews, bom)

text = audit_path.read_text("utf-8")
changes = {
    "- Original @@main@@ lyric Markdown: **129** (preserve existing IDs and editorial authority).":
        "- Original @@main@@ lyric Markdown cohort: **129**; **128 active** and one removed original whose published ID stays retired.",
    "- Round-one active files: **3,305**; one duplicate was consolidated, three additional duplicates deleted, and a surviving poem renamed.":
        "- Round-one active files: **3,295**; one consolidated duplicate, thirteen other round-one files deleted across manual passes, and one surviving poem renamed.",
    "- Total active standalone lyric Markdown files: **3,434**.":
        "- Total active standalone lyric Markdown files: **3,423**.",
    "The original @@audit/manual-md-review-tracker.csv@@ also records these three deletions and the rename, preserving both pre- and post-rename review history;":
        "The original @@audit/manual-md-review-tracker.csv@@ records all thirteen round-one deletions, the retired original, and the rename, preserving prior review history;",
    "The lock now has **3,434 active lyric IDs**, exactly matching the current Markdown corpus. No @@main@@ IDs or Basta identities were changed.":
        "The lock now contains **3,423 active lyric IDs** plus **one retired published ID from @@main@@**. No surviving original @@main@@ IDs or Basta identities were changed.",
}
for original, updated in changes.items():
    original, updated = original.replace("@@", chr(96)), updated.replace("@@", chr(96))
    assert original in text, "Merge-audit section drift: " + original[:110]
    text = text.replace(original, updated)
section = "## Metadata and stanza preparation\n"
assert section in text
text = text.replace(section,
    "## Latest deletion and Basta review (2026-11-15)\n\n"
    "- Ten newly deleted round-one lyrics had their **unmerged provisional IDs purged**, "
    "including the custom ID @@muhammad-e-baqir-sibt-e-jafar@@.\n"
    "- @@zahoor-ka-waqt-aa-gaya-hai.md@@ was an existing @@main@@ lyric: "
    "its published ID is **retired rather than purged** after removing the "
    "standalone file in favor of Basta 388-389.\n"
    "- The user edited Basta pages **363, 380, 381, 388, 389, 391**. "
    "An independent catalog comparison found ten affected Basta kalams, all with "
    "**zero individually locked stanzas**, so no stanza IDs or Basta kalam IDs "
    "need changing. All Basta identity-lock records remain identical to @@main@@. "
    "The Basta index titles are synchronized to the edited Urdu/Roman pages, "
    "including the individually verified Muhammad-e-Baqir title on page 381; "
    "index section numbers and printed page assignments are unchanged.\n"
    "- Both existing CSV trackers retain all removed paths as historical "
    "review records and preserve provenance, prior review notes, and the "
    "distinction between original and round-one source files.\n\n" + section)
audit_path.write_text(text.replace("@@", chr(96)), "utf-8")

roundcheck = csv_read(rounds_path)[1]
reviewcheck = csv_read(review_path)[1]
assert len(roundcheck) == len(rounds) and len(reviewcheck) == len(reviews)
assert sum(r["round"] == "round_1" and r["status"] == "present" for r in roundcheck) == 3295
assert sum(r["round"] == "original" and r["status"] == "present" for r in roundcheck) == 128
assert all(review_by_path[full(n)]["duplicate_pass"] == "removed_duplicate"
           for n in removed_imports)
assert review_by_path[full(old_main)]["duplicate_pass"] == "retired_original"
print(json.dumps({
    "purged_provisional_ids": sorted(by_path[n]["id"] for n in removed_imports),
    "retired_published_id": by_path[old_main]["id"],
    "active_lyric_files": len(active),
    "locked_total_lyric_ids": len(lock["lyrics"]),
    "basta_ids_preserved": len(lock["basta"]),
    "active_round_one": 3295,
    "active_main_originals": 128,
    "review_tracker_rows": len(reviews),
    "round_register_rows": len(rounds),
}, indent=2))
