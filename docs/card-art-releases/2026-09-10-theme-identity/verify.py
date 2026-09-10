import pathlib,json,hashlib,re
r=pathlib.Path(__file__).resolve().parent;root=r.parents[2]
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
jobs=json.loads((r/'prompts.json').read_text())['jobs'];ids={j['id'] for j in jobs};m=json.loads((r/'manifest.json').read_text());q=json.loads((r/'visual-qa.json').read_text());base=json.loads((r/'baseline.json').read_text())
assert len(ids)==len(jobs)==124 and 'DARK_ELF' not in ids
assert m['expected']==m['generated']==len(ids)
assert {a['id'] for a in m['assets']}==ids==set(q)
assert len({a['sha256'] for a in m['assets']})==len(ids)
changed=set()
for a in m['assets']:
 assert hash(r/a['file'])==a['sha256']
 assert hash(pathlib.Path(a['source']))==a['sha256']
 assert hash(r/'before'/f"{a['id']}.webp")==base[f"client/public/art/cards/{a['id']}.webp"]
 assert [o['width'] for o in a['outputs']]==[832,384,192]
 for o in a['outputs']:
  assert hash(root/o['file'])==o['sha256'];assert o['sha256']!=base[o['file']];changed.add(o['file'])
for file,h in base.items():
 if file not in changed:assert hash(root/file)==h,file
for f in r.glob('*.md'):
 for ref in re.findall(r'!?\[[^]]*\]\(([^)]+)\)',f.read_text()):
  if not ref.startswith(('http:','https:')):assert (r/ref).exists(),(f.name,ref)
result={'cards':len(ids),'images':len(changed),'originalPngHashesVerified':len(ids),'visuallyChecked':len(q),'untouchedImagesVerified':len(base)-len(changed),'darkElfUnchanged':True}
(r/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result))
