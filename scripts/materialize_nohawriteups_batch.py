#!/usr/bin/env python3
"""Only materialize source drafts explicitly selected in review-decisions-1."""
import csv, json, re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
manifest=ROOT/"audit/nohawriteups-review-decisions-1-prepared.json"
tracker=ROOT/"audit/nohawriteups-review-decisions-1-status.csv"
allowed={"unpublished_source_draft","consolidated_existing","duplicate_source","no_lyrics","pending_reextract"}
fields=("source_id","original_disposition","status","target_path","source_url","source_sha256","notes")

def main():
    obj=json.loads(manifest.read_text(encoding="utf-8"))
    items=obj.get("sources",[])
    if obj.get("schema_version")!=1 or len(items)!=125:
        raise ValueError("Expected exactly 125 reviewed sources")
    counts=Counter(); ids=set(); paths=set(); pending=[]; rows=[]
    for x in items:
        sid=x.get("source_id",""); status=x.get("status",""); p=x.get("target_path","")
        if not re.fullmatch(r"nohawriteups:[0-9a-f]{20}",sid) or sid in ids or status not in allowed:
            raise ValueError("Invalid source identity/status: "+sid)
        ids.add(sid); counts[status]+=1
        text=x.get("markdown")
        if status=="unpublished_source_draft":
            if not p.startswith("src/data/lyrics/") or not p.endswith(".md") or ".." in Path(p).parts or p in paths:
                raise ValueError("Invalid or duplicate Markdown path: "+p)
            if not isinstance(text,str) or not text.startswith("---\n") or "published: false" not in text or "published: true" in text or "# source_id: "+sid not in text:
                raise ValueError("Unpublished source/provenance check failed: "+sid)
            full=ROOT/p
            if full.exists():
                raise ValueError("Refusing overwrite: "+p)
            paths.add(p); pending.append((full,text))
        elif text is not None:
            raise ValueError("Non-draft may not contain Markdown: "+sid)
        rows.append({key:str(x.get(key,"") or "") for key in fields})
    expected={"unpublished_source_draft":70,"consolidated_existing":12,"duplicate_source":9,"no_lyrics":32,"pending_reextract":2}
    if counts!=expected: raise ValueError("Disposition count mismatch: "+repr(counts))
    for path,text in pending:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(text,encoding="utf-8")
    with tracker.open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(sorted(rows,key=lambda x:x["source_id"]))
    print("Staged",len(pending),"unpublished MDs; other outcomes:",{k:v for k,v in counts.items() if k!="unpublished_source_draft"})

if __name__=="__main__":main()
