#!/usr/bin/env python3
"""Finish language semantics, explicit metadata aliases and reviewed stanza blocks."""
import ast, collections, csv, json, re
from pathlib import Path

root = Path("src/data/lyrics")
audit = Path("audit")
skip_first = {
    "ali-ali-mola.md", "ali-ka-raaj.md", "ban-gaya-mimbar-e-palaan-ghadeer-e-khum-mein.md",
    "behan-ghareeb-hai.md", "fakhar-e-mustafa-hai-fatima.md", "hasan-aapka-hai.md",
    "jahan-hussain-wahan.md", "janam-ya-hussain.md", "maula-husain-jaan.md",
    "mera-imam-hussain.md", "mera-maula-ali.md", "nara-ali-da.md",
    "nara-e-haideri.md", "shabbir-ne-humko.md", "ya-ali-wavaila.md",
}
skip_two = {"ya-ali-wavaila.md"}
name_variants = {
    "poet": {
        "Rehan Aazmi":"Rehan Azmi", "Rehaan Azmi":"Rehan Azmi",
        "Rehan Azmi":"Rehan Azmi", "ریحان عظمی":"Rehan Azmi",
        "Allama Syed Zill-e-Saqlain Zaidi":"Allama Syed Zille Saqlain Zaidi",
        "Zille Raza Zaidi":"Zill-e-Raza Zaidi",
        "Sibt-e-Jafar":"Sibte Jafar",
        "N.Sarwar & J. Jaffri":"N. Sarwar & J. Jaffri",
        "N. Sarwar & J. Jaffri & A. Jee":"N. Sarwar, J. Jaffri & A. Jee",
        "N. Sarwar & J. Jaffri & A.Jee":"N. Sarwar, J. Jaffri & A. Jee",
    },
    "reciter": {
        "Sibt-e-Jafar":"Sibte Jafar",
        "Tableegh e Imamia":"Tableegh-e-Imamia",
    }
}
def lookup(value, field):
    compact = " ".join(value.split())
    return name_variants.get(field,{}).get(compact, compact)
def scalar(header, field):
    m = re.search(r"^" + field + r":\s*(.*)$", header, re.M)
    if not m:return None
    value=m.group(1).strip()
    if value.startswith('"'):
        try:return json.loads(value)
        except ValueError:pass
    return value.strip("'\"")
def split_blocks(text):
    return [block.strip("\n") for block in re.split(r"\n[ \t]*\n",text.strip("\n")) if block.strip()]
def key(text):
    return re.sub(r"\s+"," ",text.strip()).casefold()
def stanza_numbered(text):
    return bool(re.search(r"(?m)^[ \t]*[0-9٠-٩۰-۹]+[ \t]*$", text))
def numeric_sections(body,roman,name):
    if stanza_numbered(body) or stanza_numbered(roman):
        return body,roman,0,""
    bu,ro=split_blocks(body),split_blocks(roman)
    if not bu or not ro or len(bu)!=len(ro):
        return body,roman,0,"edition_paragraphs_unaligned"
    occurrences_u=collections.Counter(key(v) for v in bu)
    occurrences_r=collections.Counter(key(v) for v in ro)
    omit=set()
    if name in skip_first:omit.add(0)
    if name in skip_two:omit.add(1)
    for i in range(len(bu)):
        # A recurring choral response remains a refrain, not a numbered stanza.
        if occurrences_u[key(bu[i])]>1 or occurrences_r[key(ro[i])]>1:
            omit.add(i)
    if len(omit)==len(bu):
        return body,roman,0,"no_substantive_stanzas_after_refrain_review"
    nu,nr=0,0
    rewritten_u=[]
    rewritten_r=[]
    for i,(u,r) in enumerate(zip(bu,ro)):
        if i not in omit:
            nu+=1;nr+=1
            u=str(nu).translate(str.maketrans("0123456789","۰۱۲۳۴۵۶۷۸۹"))+"\n"+u
            r=str(nr)+"\n"+r
        rewritten_u.append(u)
        rewritten_r.append(r)
    return "\n\n".join(rewritten_u).rstrip("\n")+"\n", "\n\n".join(rewritten_r).rstrip("\n")+"\n",nu,""

changed = collections.Counter()
issues = collections.defaultdict(list)
for path in sorted(root.glob("**/*.md")):
    text=path.read_text("utf8")
    match=re.match(r"\A---\n(.*?)\n---\n",text,re.S)
    if not match:
        issues[str(path)].append("frontmatter_not_found")
        continue
    head,body=match.group(1),text[match.end():]
    head_lines=head.split("\n")
    for i,line in enumerate(head_lines):
        if line.startswith("language:") and scalar(head,"language")=="Roman Urdu":
            if scalar(head,"lang") != "ur":
                issues[str(path)].append("roman_urdu_has_nonurdu_iso_code")
            elif scalar(head,"direction") != "ltr":
                issues[str(path)].append("roman_urdu_unexpected_direction")
            else:
                head_lines[i]="language: Urdu"
                changed["roman_urdu_script_label_to_urdu_language"]+=1
        if line.startswith("poet:") or line.startswith("reciter:"):
            field=line.split(":",1)[0]
            value=scalar(line,field)
            if value:
                adjusted=lookup(value,field)
                if adjusted!=value:
                    head_lines[i]=field+": "+json.dumps(adjusted,ensure_ascii=False)
                    changed["canonical_"+field]+=1
        if line.strip()=="# The API's writeup_roman contains incomplete Balti in Arabic script, not Roman Urdu; writeup_ur is empty.":
            pass
        if path.name=="abbas-alamdar-balti.md" and line.strip()=="# Balti is preserved in its original script; the schema has no Balti language option.":
            head_lines[i]="# Balti is preserved in its original script; language and BCP 47 code identify Balti."
            changed["balti_comment_updated"]+=1
        if line.strip()=="# source_id: personal_notebook:temp-import-odt-2026-11-08":
            head_lines[i]="# source_note: personal notebook ODT import on 2026-11-08; no unique source record ID"
            changed["nonunique_import_source_ids_replaced"]+=1
    head="\n".join(head_lines)
    roman_match=re.search(r"(?m)^romanLyrics:\s*\|[-+]?\n((?:  [^\n]*\n|\n)*)",head)
    if roman_match:
        roman_raw=roman_match.group(1)
        roman="".join(line[2:] if line.startswith("  ") else line for line in roman_raw.splitlines(keepends=True))
        if not stanza_numbered(body) and not stanza_numbered(roman):
            ub,rr,num,warning=numeric_sections(body,roman,path.name)
            if warning:issues[str(path)].append(warning)
            if num:
                changed["numbered_files"]+=1
                changed["numbered_stanzas"]+=num
                # YAML retains two-space literal indentation.
                roman_new="".join("  "+s if s.strip() else s for s in rr.splitlines(keepends=True))
                head=head[:roman_match.start(1)]+roman_new+head[roman_match.end(1):]
                body=ub
    updated="---\n"+head+"\n---\n"+body.rstrip("\n")+"\n"
    if updated!=text:
        path.write_text(updated,"utf8")
        changed["changed_files"]+=1

# Remove inherited script-specific language choice; direction plus edition
# presence is the authoritative Roman-only detection.
schema=Path("src/content.config.ts")
content=schema.read_text("utf8")
assert '      "Roman Urdu",\n' in content
schema.write_text(content.replace('      "Roman Urdu",\n',"",1),"utf8")
source_review=Path("src/lib/source-review.ts")
content=source_review.read_text("utf8")
old='    const isUrdu = fields.lang === "ur" || fields.language === "Urdu";'
new='    const isUrdu = fields.direction === "rtl" && (fields.lang === "ur" || fields.language === "Urdu");'
assert old in content
content=content.replace(old,new,1)
old='    } else if (fields.lang === "en") checkLines(path, body, bodyLine, "roman", issues);'
new='    } else if (fields.direction === "ltr" && (fields.lang === "ur" || fields.lang === "en")) checkLines(path, body, bodyLine, "roman", issues);'
assert old in content
source_review.write_text(content.replace(old,new,1),"utf8")
for file,old,new in [
    ("src/pages/lyrics/[id].astro",
     'const isRomanOnly = data.language === "Roman Urdu" && !data.romanLyrics;',
     'const isRomanOnly = data.lang === "ur" && data.direction === "ltr" && !data.romanLyrics;'),
    ("src/pages/data/recitation-lyrics/[id].json.ts",
     'const romanOnly = item.data.language === "Roman Urdu" && !item.data.romanLyrics;',
     'const romanOnly = item.data.lang === "ur" && item.data.direction === "ltr" && !item.data.romanLyrics;'),
]:
    path=Path(file)
    text=path.read_text("utf8")
    assert old in text,file
    path.write_text(text.replace(old,new,1),"utf8")
# Source-site provenance and warnings stay current within the same CSV for
# originals, round one and future round two; do not regenerate its cohorts.
register=audit/"lyric-md-rounds.csv"
with register.open("r",encoding="utf8",newline="") as handle:
    reader=csv.DictReader(handle)
    fields=list(reader.fieldnames)
    rows=list(reader)
for row in rows:
    path=row["path"]
    source=Path(path).read_text("utf8")
    ids=re.findall(r"(?m)^# source_id:\s*(\S+)",source)
    row["source_ids"]=";".join(ids)
    row["source_sites"]=";".join(sorted({s.split(":")[0] for s in ids}))
    prior=[v for v in row["notes"].split(";") if v]
    if stanza_numbered(source.split("\n---\n",1)[-1]):
        prior=[p for p in prior if "missing_numbered" not in p]
    prior=[p for p in prior if not p.startswith("shared_source_id:personal_notebook:")]
    # Search aliases overlap is not a route collision; filenames define routes.
    prior=[p for p in prior if not p.startswith("alias_matches_filename:")]
    prior.extend(issues.get(path,[]))
    row["notes"]=";".join(dict.fromkeys(prior))
with register.open("w",encoding="utf8",newline="") as handle:
    writer=csv.DictWriter(handle,fieldnames=fields,lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
# Remaining spelling clusters are advisory; exact identifications already
# normalized above. Full fuzzy merges require source/editorial verification.
meta=audit/"metadata-review.csv"
meta.write_text("field,occurrences,possible_duplicate_spellings\n",encoding="utf8")
readiness=audit/"import-merge-readiness.md"
with readiness.open("w",encoding="utf8") as handle:
    handle.write("# Import merge readiness\n\n")
    handle.write("The 129 main originals, 3,309 round-one additions, and future round-two files ")
    handle.write("share the single audit/lyric-md-rounds.csv register. Main remains authoritative for site code.\n\n")
    handle.write("## Current preparation\n\n")
    for label,n in sorted(changed.items()):handle.write(f"- {label}: {n}\n")
    outstanding={r["path"]:r["notes"] for r in rows if r["notes"]}
    handle.write(f"- files_flagged_for_followup: {len(outstanding)}\n")
    handle.write("\n## Follow-up review flags\n\n")
    handle.write("Identical search aliases are not URL collisions; only actual path slugs and permanent IDs define routing/recitation identity. ")
    handle.write("The remaining flags below require editorial review if they involve source boundaries or missing editions.\n\n")
    for p,note in sorted(outstanding.items()):handle.write("- "+p+": "+note+"\n")
print(json.dumps(dict(changed),indent=2,ensure_ascii=False))
print("Flagged in audit CSV:",sum(bool(row["notes"]) for row in rows))
