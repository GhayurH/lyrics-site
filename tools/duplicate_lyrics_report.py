#!/usr/bin/env python3
"""Read-only content-duplicate audit for standalone Markdown lyrics. stdlib only."""
import argparse
import collections
import datetime
import difflib
import html
import itertools
import json
import pathlib
import re
import subprocess
import unicodedata

DATA = pathlib.Path('src/data/lyrics')
LANGS = ('roman', 'urdu')
MARKS = re.compile(r'[\u064b-\u065f\u0670\u06d6-\u06ed\u200c\u200d\u0640]')
DIGITS = re.compile(r'^[\s\d\u06f0-\u06f9\u0660-\u0669\-–—.()]+$')
URDU_MAP = str.maketrans({'ك':'ک', 'ي':'ی','ى':'ی','ئ':'ی','ے':'ی','ۓ':'ی', 'ؤ':'و','أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ء':'', 'ں':'ن', 'ۀ':'ہ','ة':'ہ','ۃ':'ہ'})

def normalize(s, lang):
    s = MARKS.sub('', s)
    if lang == 'roman':
        s = ''.join(ch for ch in unicodedata.normalize('NFKD', s.casefold()) if not unicodedata.combining(ch))
        s = s.translate(str.maketrans({'‘':"'",'’':"'",'ʻ':"'",'ʿ':"'"}))
        s = re.sub(r'[^a-z0-9]+', ' ', s)
    else:
        s = s.translate(URDU_MAP)
        s = re.sub(r'[^\u0621-\u06ff]+', ' ', s)
    return ' '.join(s.split())

def content_lines(s, lang, title=''):
    t = normalize(title,lang)
    seen = set()
    out = []
    for raw in s.splitlines():
        x = raw.strip()
        if not x or DIGITS.fullmatch(x) or x.startswith(('<!--','```','# ','## ','### ')):
            continue
        n = normalize(x,lang)
        if not n or n == t or n in seen:
            continue
        if lang == 'roman' and (len(n.split()) < 4 or len(n) < 18):
            continue
        if lang == 'urdu' and (len(n.split()) < 3 or len(n) < 13):
            continue
        seen.add(n)
        out.append((n,x))
    return out

def parse_md(path):
    s=path.read_text(encoding='utf-8-sig')
    parts=s.splitlines()
    if not parts or parts[0].strip()!='---':
        return {'title': path.stem, 'roman':'','urdu':s, 'warning':'missing YAML frontmatter'}
    ix=next((i for i in range(1,len(parts)) if parts[i].strip()=='---'),None)
    if ix is None:
        return {'title':path.stem,'roman':'','urdu':s,'warning':'unclosed YAML frontmatter'}
    fm=parts[1:ix]
    meta={}
    roman=[]
    in_roman=False
    for line in fm:
        if in_roman:
            if line.startswith(('  ','\t')) or not line.strip():
                roman.append(line[2:] if line.startswith('  ') else line.lstrip('\t'))
                continue
            in_roman=False
        m=re.match(r'^([A-Za-z][\w-]*):\s*(.*)$',line)
        if not m: continue
        key,val=m.groups()
        if key=='romanLyrics':
            if val.startswith('|') or val.startswith('>') or not val:
                in_roman=True
            else:
                roman.append(val.strip('"\''))
        else:
            meta[key]=val.strip('"\'')
    return {'title':meta.get('alternateTitle') or meta.get('title') or path.stem,
            'urduTitle':meta.get('title') or path.stem,
            'roman':'\n'.join(roman), 'urdu':'\n'.join(parts[ix+1:]), 'warning':''}

def shingles(lines, lang):
    out=set()
    for n,_ in lines:
        words=n.split()
        if len(words)>=5:
            for i in range(len(words)-2):
                tri=' '.join(words[i:i+3])
                if len(tri)>=13: out.add(tri)
    return out

def propose(docs,lang):
    inv=collections.defaultdict(list)
    shingles_inv=collections.defaultdict(list)
    for i,d in enumerate(docs):
        for n,_ in d['lines'][lang]: inv[n].append(i)
        for v in shingles(d['lines'][lang],lang): shingles_inv[v].append(i)
    candidates=collections.Counter()
    for posting in inv.values():
        if len(posting)<=25:
            for pair in itertools.combinations(posting,2): candidates[pair]+=3
    extra=collections.Counter()
    for posting in shingles_inv.values():
        if 1 < len(posting) <= 12:
            for pair in itertools.combinations(posting,2): extra[pair]+=1
    for pair,count in extra.items():
        if count>=9: candidates[pair]+=min(count,12)
    return set(candidates), {k:len(v) for k,v in inv.items()}

def match_lines(a,b,df):
    if not a or not b: return None
    bnames={n:j for j,(n,_) in enumerate(b)}
    matches=[]
    used=set()
    # Prefer exact lines, then one-to-one near identical matches.
    for i,(n,_) in enumerate(a):
        j=bnames.get(n)
        if j is not None:
            matches.append((i,j,1.0,n))
            used.add(j)
    unmatched_a=[i for i in range(len(a)) if i not in {m[0] for m in matches}]
    # Avoid fuzzy scanning every common line: only candidate pairs that already overlap.
    for i in unmatched_a:
        n=a[i][0]
        best=(0.0,None)
        ta=set(n.split())
        for j,(other,_) in enumerate(b):
            if j in used or not 0.65 < len(n)/max(1,len(other)) < 1.54: continue
            tb=set(other.split())
            if len(ta&tb)<2: continue
            ratio=difflib.SequenceMatcher(None,n,other,autojunk=False).ratio()
            if ratio >= .88 and ratio>best[0]:best=(ratio,j)
        if best[1] is not None:
            j=best[1]
            matches.append((i,j,round(best[0],3),n))
            used.add(j)
    # Filter generic chorus/boilerplate matches; still show in detailed preview.
    meaningful=[m for m in matches if df.get(m[3],1)<=16 and len(m[3])>=21]
    if len(meaningful)<3: return None
    small=min(len(a),len(b)); big=max(len(a),len(b))
    small_cov=len(meaningful)/small; big_cov=len(meaningful)/big
    if small_cov < .3 and len(meaningful) < 7: return None
    if len(meaningful)<4 and small_cov<.70: return None
    if small_cov>=.90 and big_cov>=.85 and len(meaningful)>=4: level='near-identical'
    elif small_cov>=.75 and len(meaningful)>=5: level='high-overlap'
    elif small_cov>=.55 and len(meaningful)>=4: level='partial-overlap'
    elif len(meaningful)>=6 and small_cov>=.3: level='review'
    else: return None
    return {'level':level,'matched':len(meaningful),'matches':[[i,j,sim] for i,j,sim,_ in matches],
            'small':round(small_cov,3),'big':round(big_cov,3),
            'totalA':len(a),'totalB':len(b), 'exact':sum(1 for m in meaningful if m[2]==1)}

def analyze(docs):
    pairs={}
    candidates_by_lang={}
    for lang in LANGS:
        candidates,df=propose(docs,lang)
        candidates_by_lang[lang]=len(candidates)
        for i,j in sorted(candidates):
            result=match_lines(docs[i]['lines'][lang],docs[j]['lines'][lang],df)
            if result:pairs.setdefault((i,j),{})[lang]=result
    levels=['near-identical','high-overlap','partial-overlap','review']
    out=[]
    for (i,j),rs in pairs.items():
        level=min((v['level'] for v in rs.values()),key=levels.index)
        out.append({'a':i,'b':j,'level':level,'langs':rs})
    out.sort(key=lambda x:(levels.index(x['level']),-len(x['langs']),-max(v['matched'] for v in x['langs'].values()), docs[x['a']]['path']))
    return out,candidates_by_lang

HTML_HEAD='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Main lyric content duplicate review</title><style>
:root{font-family:system-ui,-apple-system,sans-serif;color:#202733;background:#f6f8fb}*{box-sizing:border-box}body{margin:0}header{background:#15263d;color:white;padding:22px max(22px,calc((100% - 1380px)/2))}h1{margin:0 0 8px;font-size:25px}header p{margin:5px 0;opacity:.87;font-size:13px}main{max-width:1380px;margin:auto;padding:20px}.stats{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 16px}.stat{background:white;border:1px solid #dce3ee;padding:12px 17px;border-radius:8px;min-width:150px}.stat strong{font-size:21px;display:block}.stat span{font-size:12px;color:#64748b}.toolbar{position:sticky;top:0;background:#f6f8fb;padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;z-index:2}input,select{font:inherit;border:1px solid #cbd5e1;border-radius:6px;padding:9px;background:white}input{min-width:270px;flex:1}button{border:1px solid #cbd5e1;background:white;border-radius:6px;padding:8px 12px;cursor:pointer}.entry{background:white;border:1px solid #dce3ee;border-radius:9px;margin:10px 0;padding:13px}.heading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.heading h3{font-size:15px;margin:0;flex:1;min-width:220px}.pill{font-size:11px;padding:3px 7px;border-radius:100px;background:#e2e8f0}.near-identical{background:#fee2e2;color:#991b1b}.high-overlap{background:#ffedd5;color:#9a3412}.partial-overlap{background:#fef3c7;color:#92400e}.review{background:#e0e7ff;color:#3730a3}.small{font-size:12px;color:#64748b}.detail{display:none;margin-top:13px;border-top:1px solid #e5e7eb;padding-top:12px}.entry.open .detail{display:block}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pane{min-width:0;border:1px solid #e2e8f0;border-radius:7px;padding:12px;background:#fcfdff}.pane h4{margin:0 0 7px;overflow-wrap:anywhere;font-size:13px}.pane a{font-size:12px}.verse{padding:2px 6px;margin:2px 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.6}.verse.hit{background:#d9f7e6;border-left:3px solid #30a56c}.verse.near{background:#f7f0d4;border-left:3px solid #d4a83b}.verse.empty{opacity:.55}.ur{direction:rtl;text-align:right;font-family:'Noto Nastaliq Urdu','Noto Naskh Arabic',serif;line-height:2.1}.langhead{border-top:1px solid #dce3ee;margin:18px 0 6px;padding-top:8px;font-weight:700}.notes{font-size:13px;color:#526175}.hidden{display:none}@media(max-width:850px){.cols{grid-template-columns:1fr}.toolbar{position:static}}@media print{.toolbar{display:none}.detail{display:block!important}}
</style></head><body><header><h1>Main lyric content duplicate review</h1><p id="snapshot"></p><p>Read-only automated candidates. Line counts exclude repeated lines, stanza numbers, headings, and extremely short text. This is not a deletion list; check every pair manually.</p></header><main><div class="stats" id="stats"></div><div class="toolbar"><input type="search" id="q" placeholder="Filter by filename, title, or path…"><select id="level"><option value="all">All confidence levels</option><option value="near-identical">Near-identical</option><option value="high-overlap">High overlap</option><option value="partial-overlap">Partial overlap</option><option value="review">Review</option></select><select id="language"><option value="all">Roman / Urdu</option><option value="both">Both languages</option><option value="roman">Roman matches</option><option value="urdu">Urdu matches</option></select><button id="expand">Expand visible</button><button id="collapse">Collapse all</button><span class="small" id="shown"></span></div><div id="results"></div></main><script id="audit-data" type="application/json">'''
HTML_TAIL='''</script><script>
const audit=JSON.parse(document.getElementById('audit-data').textContent);const docs=audit.docs, pairs=audit.pairs;const $=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const levels={'near-identical':'Near-identical','high-overlap':'High overlap','partial-overlap':'Partial overlap','review':'Review'};
$('snapshot').textContent=`Main commit ${audit.sha} · ${audit.date} · ${docs.length.toLocaleString()} files · ${pairs.length.toLocaleString()} candidate pairs · ${audit.warnings.length} parser warnings`;
let stats={};pairs.forEach(p=>stats[p.level]=(stats[p.level]||0)+1);$('stats').innerHTML=`<div class="stat"><strong>${docs.length}</strong><span>MDs scanned</span></div><div class="stat"><strong>${pairs.length}</strong><span>Candidate pairs</span></div>`+Object.keys(levels).map(l=>`<div class="stat"><strong>${stats[l]||0}</strong><span>${levels[l]}</span></div>`).join('')+`<div class="stat"><strong>${audit.warnings.length}</strong><span>Parser warnings</span></div>`;
const link=d=>`https://github.com/GhayurH/lyrics-site/blob/${audit.sha}/${d.path}`;const lbl=p=>Object.entries(p.langs).map(([l,r])=>`${l.toUpperCase()}: ${r.matched} matched · ${Math.round(r.small*100)}% smaller / ${Math.round(r.big*100)}% larger`).join(' · ');
function panes(p,lang){const r=p.langs[lang];if(!r)return '';const a=docs[p.a],b=docs[p.b];const mA=new Map(r.matches.map(m=>[m[0],m[2]])),mB=new Map(r.matches.map(m=>[m[1],m[2]]));const pane=(d,m,side)=>`<div class="pane"><h4>${esc(d.path)}</h4><a href="${link(d)}" target="_blank" rel="noopener">Open source on GitHub</a><div>${d.lines[lang].map((v,i)=>`<div class="verse ${lang==='urdu'?'ur':''} ${m.has(i)?(m.get(i)>.999?'hit':'near'):'empty'}" title="${m.has(i)?'Matched line':''}">${esc(v)}</div>`).join('')}</div></div>`;return `<div class="langhead">${lang.toUpperCase()} comparison · ${lbl({langs:{[lang]:r}})} · green = exact after normalization; yellow = close variant</div><div class="cols">${pane(a,mA,'a')}${pane(b,mB,'b')}</div>`}
function entry(p,idx){let a=docs[p.a],b=docs[p.b],id=`pair-${idx}`;return `<article class="entry" id="${id}"><div class="heading"><span class="pill ${p.level}">${levels[p.level]}</span><h3>${esc(a.title)} / ${esc(b.title)}</h3><button onclick="document.getElementById('${id}').classList.toggle('open')">Show / hide verses</button></div><div class="small">${esc(a.path)} ↔ ${esc(b.path)}</div><div class="small">${lbl(p)}</div><div class="detail">${panes(p,'roman')}${panes(p,'urdu')}</div></article>`}
function update(){const q=$('q').value.toLowerCase(),level=$('level').value,lang=$('language').value;const chosen=pairs.map((p,i)=>[p,i]).filter(([p])=>{let a=docs[p.a],b=docs[p.b];return(!q||[a.path,a.title,b.path,b.title].some(s=>s.toLowerCase().includes(q)))&&(level==='all'||p.level===level)&&(lang==='all'||(lang==='both'?p.langs.roman&&p.langs.urdu:!!p.langs[lang]))});$('shown').textContent=`${chosen.length} shown`;const frag=document.createDocumentFragment();chosen.forEach(([p,i])=>{let template=document.createElement('template');template.innerHTML=entry(p,i);frag.appendChild(template.content)});$('results').replaceChildren(frag)}['q','level','language'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',update));$('expand').addEventListener('click',()=>document.querySelectorAll('.entry').forEach(e=>e.classList.add('open')));$('collapse').addEventListener('click',()=>document.querySelectorAll('.entry').forEach(e=>e.classList.remove('open')));update();
</script></body></html>'''

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',default='audit/main-content-duplicate-review.html')
    ap.add_argument('--sha',default='')
    args=ap.parse_args()
    paths=sorted(DATA.glob('*.md'))
    if not paths: raise SystemExit('No lyric Markdown files found')
    docs=[];warnings=[]
    for p in paths:
        x=parse_md(p)
        if x['warning']:warnings.append(f'{p}: {x["warning"]}')
        docs.append({'path':str(p),'title':x['title'],'lines':{lang:content_lines(x[lang],lang,x['urduTitle'] if lang=='urdu' else x['title']) for lang in LANGS}})
    pairs,candidates=analyze(docs)
    sha=args.sha or subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    data={'sha':sha,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
          'docs':[{'path':d['path'],'title':d['title'],'lines':{l:[raw for _,raw in d['lines'][l]] for l in LANGS}} for d in docs],
          'pairs':pairs,'warnings':warnings,'candidateCounts':candidates}
    result=HTML_HEAD+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+HTML_TAIL
    out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(result,encoding='utf-8')
    print(json.dumps({'files':len(docs),'pairs':len(pairs),'levels':dict(collections.Counter(p['level'] for p in pairs)), 'languageCandidateCounts':candidates,'warnings':warnings[:15], 'report':str(out),'bytes':out.stat().st_size},ensure_ascii=False))

if __name__=='__main__':main()