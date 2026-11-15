#!/usr/bin/env python3
"""One-shot, source-preserving import metadata and stanza-marker preparation."""
import ast, collections, csv, json, re, subprocess, unicodedata
from pathlib import Path

root = Path("src/data/lyrics")
audit = Path("audit")
files = sorted(root.glob("**/*.md"))
originals = set(subprocess.check_output(["git", "ls-tree", "-r", "--name-only",
                                       "origin/main", "--", str(root)], text=True).splitlines())
counts = collections.Counter()
flags = collections.defaultdict(list)
metadata = collections.defaultdict(collections.Counter)
sources = collections.defaultdict(list)
aliases = collections.defaultdict(list)
rows = []
def compact(s): return " ".join(unicodedata.normalize("NFC", s).split())
def norm(s):
    return re.sub(r"[\u064b-\u065f\u0670\u0640]", "", compact(s).casefold().replace("ي","ی").replace("ى","ی").replace("ك","ک"))
def slug(s): return "".join(c for c in norm(s) if c.isalnum())
def scalar(header, name):
    m = re.search(r"^" + re.escape(name) + r":\s*(.*)$", header, re.M)
    if not m: return None
    s = m.group(1).strip()
    if s.startswith('"'):
        try: return json.loads(s)
        except ValueError: return s.strip('"')
    return s[1:-1].replace("''","'") if s.startswith("'") and s.endswith("'") else s
def array(s):
    if not (s.startswith("[") and s.endswith("]")): return None
    try: return [str(x) for x in ast.literal_eval(s)]
    except (ValueError, SyntaxError):
        return [x.strip().strip("\"'") for x in s[1:-1].split(",") if x.strip()]
variants = {
  "poet": {"rehan azmi":"Rehan Azmi","rehan aazmi":"Rehan Azmi",
           "rayhan azmi":"Rehan Azmi","ریحان عظمی":"Rehan Azmi",
           "ریحان اعظمی":"Rehan Azmi","ریحان اعظمى":"Rehan Azmi"},
  "reciter": {"nadeem sarwar":"Nadeem Sarwar","nadim sarwar":"Nadeem Sarwar",
              "ندیم سرور":"Nadeem Sarwar","ali shanawar":"Ali Shanawar",
              "ali shanawer":"Ali Shanawar","علی شناور":"Ali Shanawar"},
}
variants = {f:{norm(k):v for k,v in table.items()} for f,table in variants.items()}
baseline = collections.defaultdict(collections.Counter)
for file in files:
    if str(file) not in originals: continue
    m = re.match(r"\A---\n(.*?)\n---\n", file.read_text("utf8"), re.S)
    if not m: continue
    for field in ("poet","reciter","occasion","haal","romanHaal","kalamType"):
        if v := scalar(m.group(1), field): baseline[field][compact(v)] += 1
preferred = {}
for field, options in baseline.items():
    keys = collections.defaultdict(list)
    for value, count in options.items(): keys[slug(value)].append((count,value))
    for key, group in keys.items(): preferred[(field,key)] = sorted(group, key=lambda t:(-t[0],t[1]))[0][1]
def renumber(lines, script, path):
    total, out = 0, []
    digits = str.maketrans("0123456789","۰۱۲۳۴۵۶۷۸۹")
    for line in lines:
        bare = line.rstrip("\n")
        m = re.fullmatch(r"(\s*)([0-9٠-٩۰-۹]+)(\s*)", bare)
        if m:
            total += 1
            num = str(total) if script == "roman" else str(total).translate(digits)
            replacement = m[1] + num + m[3] + ("\n" if line.endswith("\n") else "")
            if replacement != line: counts["corrected_stanza_counters"] += 1
            out.append(replacement)
        else: out.append(line)
    if total == 0 and any(line.strip() for line in lines):
        flags[path].append("missing_numbered_" + script + "_stanzas")
    return out,total

for file in files:
    path = str(file)
    raw = file.read_text("utf8")
    m = re.match(r"\A---\n(.*?)\n---\n", raw, re.S)
    if not m:
        flags[path].append("invalid_frontmatter")
        continue
    header, body = m.group(1), raw[m.end():]
    source_ids = re.findall(r"^\s*#\s*source_id:\s*(\S+)", header, re.M)
    source_urls = re.findall(r"^\s*#\s*source_url:\s*(\S+)", header, re.M)
    for v in source_ids: sources[("source_id",v)].append(path)
    for v in source_urls: sources[("source_url",v)].append(path)
    for v in array(scalar(header,"aliases") or "[]") or []: aliases[slug(v)].append(path)
    language = scalar(header,"language") or ""
    mode = "roman" if language in ("Roman Urdu","English") else "urdu"
    if file.name == "abbas-alamdar-balti.md": mode = "urdu"
    lines = header.splitlines(keepends=True)
    revised = []
    roman_count = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.fullmatch(r"romanLyrics:\s*\|[-+]?\s*\n?",line):
            revised.append(line)
            i += 1
            edition = []
            while i < len(lines) and (lines[i].startswith("  ") or not lines[i].strip()):
                edition.append(lines[i][2:] if lines[i].startswith("  ") else lines[i])
                i += 1
            edition, roman_count = renumber(edition,"roman",path)
            revised.extend(("  " + l if l.strip() else l) for l in edition)
            continue
        if re.match(r"^(cover|coverAlt):",line):
            counts["deleted_image_fields"] += 1
            i += 1
            continue
        mfield = re.fullmatch(r"(poet|reciter|occasion|haal|romanHaal|kalamType|published|language|lang|tags):([ \t]*)(.*?)(\n?)",line)
        if mfield:
            field, space, value_raw, end = mfield.groups()
            value = scalar(line,field)
            replacement = value
            if field == "published": replacement = "true"
            elif field == "language" and file.name == "abbas-alamdar-balti.md": replacement = "Balti"
            elif field == "lang" and file.name == "abbas-alamdar-balti.md": replacement = "bft"
            elif field == "tags":
                tags = array(value_raw.strip())
                if tags is None:
                    if "noImage" in value_raw: flags[path].append("unparsed_noImage_tag")
                else:
                    filtered = list(dict.fromkeys(compact(x) for x in tags if norm(x) != "noimage"))
                    counts["removed_noImage_tags"] += len(tags)-len(filtered)
                    replacement = json.dumps(filtered,ensure_ascii=False)
            elif field in ("poet","reciter","occasion","haal","romanHaal","kalamType") and value:
                replacement = variants.get(field,{}).get(norm(value),preferred.get((field,slug(value)),compact(value)))
                metadata[field][replacement] += 1
            if replacement is not None and replacement != value:
                pretty = json.dumps(replacement,ensure_ascii=False) if field in ("poet","reciter","occasion","haal","romanHaal","kalamType","language") else replacement
                line = field + ":" + (space or " ") + pretty + end
                counts["updated_" + field] += 1
        revised.append(line)
        i += 1
    newheader = "".join(revised)
    if not re.search(r"^published:\s*true\s*$",newheader,re.M):
        newheader = newheader.rstrip("\n") + "\npublished: true\n"
        counts["added_published"] += 1
    bodylines, count = renumber(body.splitlines(keepends=True), mode, path)
    if count and roman_count and count != roman_count:
        flags[path].append(f"stanza_counts_differ:{count}_body/{roman_count}_roman")
    updated = "---\n" + newheader.rstrip("\n") + "\n---\n" + "".join(bodylines).rstrip("\n") + "\n"
    if updated != raw:
        file.write_text(updated,encoding="utf8")
        counts["md_files_changed"] += 1
    cohort = "original" if path in originals else "round_1"
    counts[cohort] += 1
    rows.append([path,cohort,"present",
                 ";".join(sorted(set(s.split(":")[0] for s in source_ids))),
                 ";".join(source_ids),
                 "main" if cohort == "original" else "feat/import-overlap-reconciliation-2026-11-05",
                 ""])
for (kind,key), entries in sources.items():
    unique = sorted(set(entries))
    if len(unique)>1:
        counts["shared_" + kind + "_groups"] += 1
        for path in unique: flags[path].append("shared_" + kind + ":" + key)
for key, entries in aliases.items():
    unique = sorted(set(entries))
    if len(unique)>1:
        counts["duplicate_alias_groups"] += 1
        for path in unique: flags[path].append("shared_alias:" + key)
existing = {slug(p.stem):str(p) for p in files}
for key, entries in aliases.items():
    if key in existing:
        for path in entries:
            if path != existing[key]:
                flags[path].append("alias_matches_filename:" + existing[key])
                counts["alias_route_collision"] += 1
with (audit/"lyric-md-rounds.csv").open("w",encoding="utf8",newline="") as out:
    writer = csv.writer(out)
    writer.writerow(["path","round","status","source_sites","source_ids","added_from","notes"])
    for row in rows:
        row[-1] = ";".join(dict.fromkeys(flags[row[0]]))
        writer.writerow(row)
queue=[]
for field, values in metadata.items():
    grouped=collections.defaultdict(list)
    for value,n in values.items(): grouped[slug(value)].append((value,n))
    for group in grouped.values():
        if len(group)>1: queue.append((field,sum(n for _,n in group),"; ".join(f"{v} ({n})" for v,n in group)))
with (audit/"metadata-review.csv").open("w",encoding="utf8",newline="") as out:
    writer=csv.writer(out)
    writer.writerow(["field","occurrences","possible_duplicate_spellings"])
    writer.writerows(sorted(queue))
with (audit/"import-merge-readiness.md").open("w",encoding="utf8") as out:
    out.write("# Import merge readiness\n\n")
    out.write("Main remains authoritative for site code and original poem identities.\n")
    out.write("Original poems and round-one additions are recorded in lyric-md-rounds.csv.")
    out.write(" Future round-two Markdown should be added to the same CSV as round_2.\n\n")
    out.write("## Preparation counts\n\n")
    for k,v in sorted(counts.items()): out.write(f"- {k}: {v}\n")
    out.write(f"- flagged_files: {sum(bool(x) for x in flags.values())}\n")
    out.write(f"- exact_metadata_variant_groups: {len(queue)}\n\n")
    out.write("## Remaining source/number checks (not automatically resolved)\n\n")
    for path, entries in sorted(flags.items()):
        if entries: out.write("- " + path + ": " + "; ".join(dict.fromkeys(entries)) + "\n")
print(json.dumps(dict(counts),ensure_ascii=False,indent=2))
print("Files flagged for manual review:",sum(bool(x) for x in flags.values()))
