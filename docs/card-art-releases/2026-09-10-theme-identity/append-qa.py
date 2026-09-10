import json,sys,pathlib
r=pathlib.Path(__file__).resolve().parent;p=r/'visual-qa.json';q=json.loads(p.read_text()) if p.exists() else {}
for id,note in json.load(sys.stdin):q[id]={'finding':note,'status':'visually_checked'}
t=p.with_suffix('.tmp');t.write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n');t.replace(p);print(len(q))
