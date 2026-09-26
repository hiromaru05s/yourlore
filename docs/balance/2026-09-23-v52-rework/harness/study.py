import json,os,subprocess,time
from pathlib import Path
root=Path.cwd();children={};attempts={}
def complete(folder,i):
 try:return json.loads((folder/f'worker-{i}.log').read_text().splitlines()[-1]).get('complete',False)
 except (ValueError,OSError,IndexError):return False
jobs=[]
for g in ['packages','baseline','coverage','combos','tactical']:
 for i in range(8):jobs.append((g,i,root/'plans'/f'{g}-{i}.jsonl',root/'raw'/g,'resume-worker.mjs'))
for i in range(4):jobs.append(('supplement',i,root/'supplement/plans'/f'games-{i}.jsonl',root/'supplement/raw','sensitivity-worker.mjs'))
jobs.append(('focused',0,root/'focused/gambler-plan.jsonl',root/'focused/raw','resume-worker.mjs'))
queue=[j for j in jobs if not complete(j[3],j[1])]
while queue or children:
 for task,p in list(children.items()):
  if p.poll() is None:continue
  del children[task];g,i,plan,folder,worker=task
  if not complete(folder,i):
   attempts[task]=attempts.get(task,0)+1
   if attempts[task]>2:raise RuntimeError(('repeated failure',g,i,p.returncode))
   queue.append(task)
  else:print('Completed',g,i,flush=True)
 limit=10 if os.getloadavg()[0]<26 else 6
 while queue and len(children)<limit:
  task=queue.pop(0);g,i,plan,folder,worker=task;folder.mkdir(parents=True,exist_ok=True)
  with (folder/f'worker-{i}.log').open('a') as f:children[task]=subprocess.Popen(['node','--max-old-space-size=160',str(root/'harness'/worker),str(plan),str(folder/f'games-{i}.jsonl')],stdout=f,stderr=subprocess.STDOUT)
  print('Started',g,i,'workers',len(children),flush=True)
 time.sleep(3)
for cmd in [['python3','harness/verify-study.py'],['python3','harness/analyze-deep.py','.'],['python3','harness/analyze-supplement.py']]:
 print('Running',cmd,flush=True);subprocess.run(cmd,check=True)
print('COMPLETE: games verified and statistics saved',flush=True)
