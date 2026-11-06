#!/usr/bin/env python3
"""One-shot, conservative NoHayOnline stanza repair, on the import branch only."""
import collections
import pathlib
import re
import statistics
import yaml

ROOT = pathlib.Path("src/data/lyrics")
NUMBER = re.compile(r"^\s*([0-9۰-۹٠-٩]+)\s*$")
FM = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n(.*)\Z", re.S)
ROMAN_FIELD = re.compile(r"(?ms)^romanLyrics:.*?(?=^[A-Za-z][A-Za-z0-9_-]*:|^# |\Z)")
FRAGMENT = re.compile(r"(?:\.{3,}|…|۔۔۔)\s*$")
MANUAL = set("""
aa-alamdaar-haye-alamdaar aa-jao-asghar aa-jao-ke-sughra aa-mere-asghar
aa-palat-aa-ay aa-rahi-hai-yehi aa-sunawan-shan-teno-mustafa-de-veer-da
aa-teere-garan-le aabrue-la-ilaha aagaya-bazar-ali aagaya-bazare-shaam
aagaya-maahe-aza aagaya-mahe-moharam aagaya-qafla
aagayi-shaam-ki-nagri aagayi-shame-ghariban aagayi-zainab
aaghaz-ho-raha-hai aahista-chalo aaiye-maula aaj-baghdad-may
aaj-bhi-aati-hai aaj-bhi-sab-se-numaya-hai-alam-abbas-ka
aaj-chup-hogayi aaj-daswaan-naib-khair-ul-bashar-paida-howa
""".split())
DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
counts = collections.Counter()
review = []
examples = []

def parse(text):
    intro, blocks, nums = [], [], []
    current = intro
    for line in text.splitlines():
        clean = line.strip()
        n = NUMBER.fullmatch(clean)
        if n:
            nums.append(int(n.group(1)))
            current = []
            blocks.append(current)
        elif clean:
            current.append(clean)
    return intro, blocks, nums

def serialized(intro, blocks, urdu):
    out = []
    if intro:
        out.append("\n".join(intro))
    for idx, block in enumerate(blocks, 1):
        if not block:
            raise ValueError("empty stanza")
        num = str(idx).translate(DIGITS) if urdu else str(idx)
        out.append(num + "\n" + "\n".join(block))
    return "\n\n".join(out).rstrip() + "\n"

def has_clean_numbers(nums):
    return bool(nums) and nums == list(range(1, len(nums)+1))

def ellipsis_segments(text):
    lines = [s.strip() for s in text.splitlines() if s.strip() and not NUMBER.fullmatch(s.strip())]
    cut = [i for i,s in enumerate(lines) if FRAGMENT.search(s)]
    if len(cut) < 3:
        return None
    stems = [FRAGMENT.sub("",lines[i]).strip().casefold() for i in cut]
    stemfreq = collections.Counter(stems)
    dominant, count = stemfreq.most_common(1)[0]
    if count < 3 or count < len(cut)*0.75 or not dominant:
        return None
    pieces, piece = [], []
    for s in lines:
        if FRAGMENT.search(s) and FRAGMENT.sub("",s).strip().casefold() == dominant:
            pieces.append(piece)
            piece = []
        else:
            piece.append(s)
    pieces.append(piece)
    while pieces and not pieces[-1]:
        pieces.pop()
    # The opening must precede the first abbreviated refrain. Later sections
    # must have consistent lengths; otherwise the original line order is kept.
    if len(pieces) < 5 or any(not g for g in pieces): return None
    sizes=[len(x) for x in pieces[1:]]
    modal=collections.Counter(sizes).most_common(1)[0][0]
    if not 2 <= modal <= 6: return None
    if sum(abs(x-modal)<=1 for x in sizes) < len(sizes)*0.85: return None
    if not 2 <= len(pieces[0]) <= modal+2: return None
    return pieces

def find_refrain_at_ends(blocks):
    positions = [i for i,b in enumerate(blocks) if b and FRAGMENT.search(b[-1])]
    if len(positions)<3 or len(positions)<max(3, len(blocks)*0.6): return set()
    stems=collections.Counter(FRAGMENT.sub("",blocks[i][-1]).strip().casefold() for i in positions)
    common, c=stems.most_common(1)[0]
    if not common or c<3 or c<len(positions)*0.8: return set()
    return {i for i in positions if FRAGMENT.sub("",blocks[i][-1]).strip().casefold()==common and len(blocks[i])>=2}

def safe_roman_field(front, new):
    m = ROMAN_FIELD.search(front)
    if not m: raise ValueError("cannot preserve roman field")
    replacement = "romanLyrics: |-\n" + "\n".join("  "+line if line else "" for line in new.rstrip("\n").split("\n")) + "\n"
    return front[:m.start()]+replacement+front[m.end():]

for path in sorted(ROOT.glob("*.md")):
    raw=path.read_text(encoding="utf-8")
    if "# source_id: nohayonline:" not in raw: continue
    counts["sourced"]+=1
    if path.stem in MANUAL:
        counts["manual_protected"]+=1
        continue
    match=FM.fullmatch(raw)
    if not match:
        counts["invalid_frontmatter"]+=1
        review.append(f"{path.name}\tinvalid frontmatter")
        continue
    front, body=match.groups()
    try:
        data=yaml.safe_load(front)
        if not isinstance(data,dict): raise ValueError("invalid YAML")
    except Exception:
        counts["invalid_yaml"]+=1
        review.append(f"{path.name}\tinvalid YAML")
        continue
    if data.get("published") is not False or not isinstance(data.get("romanLyrics"),str):
        counts["out_of_scope"]+=1
        continue
    ri,rb,rnums=parse(data["romanLyrics"])
    ui,ub,unums=parse(body)
    if len(rb)!=len(ub) or not rb or not has_clean_numbers(rnums) or not has_clean_numbers(unums):
        counts["requires_manual_alignment"]+=1
        review.append(f"{path.name}\tmarkers mismatch roman={len(rb)} urdu={len(ub)}")
        continue

    reason=[]
    # A repeated abbreviated refrain is often the *actual* stanza separator,
    # while the imported numeric markers split the stanza in the wrong place.
    # Reconstruct only when both scripts independently agree on the number of
    # stanzas and on the approximate length of each stanza.
    rp=ellipsis_segments(data["romanLyrics"])
    up=ellipsis_segments(body)
    if rp and up and len(rp)==len(up) and all(abs(len(x)-len(y))<=2 for x,y in zip(rp,up)):
        ri,rb=rp[0],rp[1:]
        ui,ub=up[0],up[1:]
        reason.append("refrain_boundaries")
    else:
        if not ri and not ui and len(rb)>=3 and 2<=len(rb[0])<=6 and 2<=len(ub[0])<=6:
            ri,rb=rb[0],rb[1:]
            ui,ub=ub[0],ub[1:]
            reason.append("opening_stanza_unnumbered")
        elif len(ri)==len(ui)==1 and len(rb)>=3 and len(rb[0])>=3 and len(ub[0])>=3:
            # The 2nd line of the opening couplet was erroneously numbered as
            # the first line of stanza 1. Only move it if later verse lengths
            # agree in both scripts.
            rmode=collections.Counter(map(len,rb[1:])).most_common(1)[0][0]
            umode=collections.Counter(map(len,ub[1:])).most_common(1)[0][0]
            if (len(rb[0])==rmode+1 and len(ub[0])==umode+1
                and sum(len(b)==rmode for b in rb[1:])>=len(rb[1:])*0.7
                and sum(len(b)==umode for b in ub[1:])>=len(ub[1:])*0.7):
                ri.append(rb[0].pop(0))
                ui.append(ub[0].pop(0))
                reason.append("opening_couplet_completed")
        # Abbreviated refrains that are appended AFTER a complete stanza can
        # be dropped. Mid-stanza abbreviations need human adjudication.
        rf=find_refrain_at_ends(rb)
        uf=find_refrain_at_ends(ub)
        common=rf & uf
        if len(common)>=3 and len(common)>=min(len(rb),len(ub))*0.6:
            for idx in common:
                rb[idx].pop()
                ub[idx].pop()
            reason.append("duplicate_abbreviated_refrains")

    if not reason:
        counts["unchanged"]+=1
        if rp or up or len(ri)<=1:
            review.append(f"{path.name}\tuncertain stanza boundaries")
        continue
    if len(rb)!=len(ub) or any(not x for x in rb+ub):
        counts["rejected_invalid_result"]+=1
        review.append(f"{path.name}\tunsafe proposed edit")
        continue
    newroman=serialized(ri,rb,False)
    newurdu=serialized(ui,ub,True)
    # Verify no words changed unless an explicitly abbreviated refrain was removed.
    def verse_lines(s):
        return [x.strip() for x in s.splitlines() if x.strip() and not NUMBER.fullmatch(x.strip())]
    orig_r=verse_lines(data["romanLyrics"])
    orig_u=verse_lines(body)
    result_r=verse_lines(newroman)
    result_u=verse_lines(newurdu)
    for orig,new in ((orig_r,result_r),(orig_u,result_u)):
        if not reason or not any("refrain" in x for x in reason):
            if orig!=new: raise AssertionError(f"verse text was changed: {path}")
        else:
            cursor=0
            for line in new:
                while cursor<len(orig) and orig[cursor]!=line:
                    if not FRAGMENT.search(orig[cursor]):
                        raise AssertionError(f"unexpected verse deletion: {path}")
                    cursor+=1
                if cursor==len(orig):
                    raise AssertionError(f"unexpected added verse: {path}")
                cursor+=1
            if any(not FRAGMENT.search(x) for x in orig[cursor:]):
                raise AssertionError(f"unexpected trailing deletion: {path}")
    updated="---\n"+safe_roman_field(front,newroman)+"\n---\n"+newurdu.rstrip("\n")+"\n"
    if updated != raw:
        path.write_text(updated,encoding="utf-8")
        counts["changed"]+=1
        counts.update(reason)
        if len(examples)<100: examples.append(f"{path.name}\t{','.join(reason)}\troman={len(rb)} urdu={len(ub)}")
print("SUMMARY",dict(counts),flush=True)
print("EDITED EXAMPLES",len(examples),flush=True)
for line in examples[:80]: print("EDIT",line,flush=True)
print("REVIEW QUEUE",len(review),flush=True)
with open("nohayonline-stanza-review.txt","w",encoding="utf-8") as report:
    report.write("Audit of NoHayOnline stanza breaks (potential unresolved issues)\n")
    report.write(f"Summary: {dict(counts)}\n\n")
    report.write("\n".join(review))
    report.write("\n")
