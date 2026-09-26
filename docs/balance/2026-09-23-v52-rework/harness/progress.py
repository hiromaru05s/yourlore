import json,time
from pathlib import Path
r=Path('.');out={};done=bad=0
for parent in [r/'raw',r/'supplement',r/'focused']:
 for f in parent.glob('*/worker-*.log'):
  rows=[]
  for line in f.read_text().splitlines():
   try:row=json.loads(line)
   except ValueError:continue
   if 'done' in row:rows.append(row)
  if not rows:continue
  x=rows[-1];group=f.parent.name if parent.name=='raw' else parent.name
  z=out.setdefault(group,{'done':0,'bad':0,'workersComplete':0,'workers':0});z['done']+=x['done'];z['bad']+=x['bad'];z['workers']+=1;z['workersComplete']+=bool(x.get('complete'));done+=x['done'];bad+=x['bad']
print(json.dumps({'recorded':done,'planned':819648,'percent':round(done/819648*100,1),'unfinished':bad,'groups':out},ensure_ascii=False))
