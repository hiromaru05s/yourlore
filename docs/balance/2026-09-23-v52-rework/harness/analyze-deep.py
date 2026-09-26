"""Clustered, paired analyses. All raw games remain separate from proposal games."""
import collections as co,gzip,glob,json,math,random,statistics as st,sys
from pathlib import Path
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.')
SNAPSHOT='--snapshot' in sys.argv
SUPERSEDED=set(json.loads((ROOT/'superseded-jobs.json').read_text())['ids']) if (ROOT/'superseded-jobs.json').exists() else set()
CAT=json.loads((ROOT/'catalog.json').read_text());CARDS=CAT['cards']
SCORE=lambda r,s=0:.5 if r['winner'] is None else float(r['winner']==s)
def ci(v,center=0):
 n=len(v)
 if not n:return dict(n=0,mean=None,lo=None,hi=None,p=None)
 m=st.mean(v);se=st.stdev(v)/math.sqrt(n) if n>1 else 0
 return dict(n=n,mean=m,lo=m-1.96*se,hi=m+1.96*se,p=math.erfc(abs(m-center)/(se*math.sqrt(2))) if se else (1 if m==center else 0))
def bh(rows):
 valid=sorted([x for x in rows if x.get('p') is not None],key=lambda x:x['p']);q=1
 for i in range(len(valid)-1,-1,-1):q=min(q,valid[i]['p']*len(valid)/(i+1));valid[i]['q']=q
def name(id):return CARDS.get(id,{}).get('nameJa',id)
def mean(v):return st.mean(v) if v else None
def label(id):
 c=CARDS[id];return dict(id=id,name=name(id),cost=c['cost'],type='quick' if c.get('quick') else c['t'],text=c.get('textJa',c['text']))
M=co.defaultdict(lambda:co.defaultdict(dict));S=co.defaultdict(lambda:co.defaultdict(dict));F=co.defaultdict(dict);B=co.defaultdict(lambda:co.defaultdict(dict));P=co.defaultdict(dict)
counts=co.Counter();bad=co.Counter();invalid=[];endings=co.defaultdict(co.Counter);turns=co.defaultdict(list);first=co.defaultdict(list)
planned=co.Counter();useStats=co.defaultdict(lambda:co.Counter());buildExtra=co.defaultdict(lambda:co.Counter());pairObs=co.defaultdict(lambda:[0,0,0,0]);singleObs=co.defaultdict(lambda:co.Counter());quest=co.defaultdict(lambda:co.Counter());obsN=0;maxHp=[]
for file in sorted((ROOT/'raw').glob('*/games-*.jsonl*')):
 group=file.parent.name
 for line in (gzip.open(file,'rt') if file.suffix=='.gz' else file.open()):
  try:r=json.loads(line)
  except json.JSONDecodeError:continue
  if r['id'] in SUPERSEDED:continue
  scope=r.get('scope',group);stage=r['stage'];k=scope+':'+stage;counts[k]+=1
  if stage in ['market','starter']:planned[scope,stage,r['card']]+=1
  if not r['finished']:
   bad[k]+=1;invalid.append({key:r.get(key) for key in ['id','stage','scope','card','combo','variant','rep','arm','starting','reason','turn','steps']});continue
  endings[k][r['end']]+=1;turns[k].append(r['turn']);first[k].append(SCORE(r,r['starting']))
  if stage=='market':
   p=r['sides'][0];id=r['card'];M[scope][id,r['rep']][r['starting']]={'score':SCORE(r),'bought':id in p['buys'],'used':p['uses'].get(id,0)>0,'firstUse':p['firstUses'].get(id),'stratum':r.get('stratum'),'tierTurns':p['tierTurns'],'spellCap':r['sides'][1]['spellCap']}
  if stage=='starter':
   p=r['sides'][0];S[scope][r['card'],r['rep']][r['arm'],r['starting']]={'score':SCORE(r),'used':p['uses'].get(r['card'],0)>0,'stratum':r.get('stratum')}
  if stage=='factor':F[r['combo'],r['rep']][r['arm'],r['starting']]={'score':SCORE(r),'turn':r['turn'],'support':r.get('support'),'uses':r['sides'][0]['uses']}
  if stage=='proposal':P[r['variant'],r['context'],r['rep']][r['arm'],r['starting']]={'score':SCORE(r),'turn':r['turn'],'turncap':r['end']=='turncap','hp':r['sides'][0]['maxHp'],'used':r['sides'][0]['uses'].get(r['target'],0)>0}
  if stage=='build':
   a,b=r['builds']
   for side,nm in enumerate([a,b]):
    opp=[a,b][1-side];B[scope][nm,opp,r['rep']][r['starting']]=SCORE(r,side);ex=buildExtra[scope,nm];p=r['sides'][side]
    ex['games']+=1;ex['turn']+=r['turn'];ex['turncap']+=r['end']=='turncap';ex['specialWins']+=r['end']=='special' and r['winner']==side;ex['maxHp']+=p['maxHp'];ex['mana']+=p['mana'];ex['damageReceivedByOpponent']+=p['damage']
    for tier in ['마족:2','마족:3','마족:4']:ex[tier]+=tier in p['tierTurns']
    for id,v in p['uses'].items():useStats[scope,nm][id]+=bool(v)
  if stage=='observe':
   obsN+=1
   for side,p in enumerate(r['sides']):
    w=SCORE(r,side);owned=set(r['decks'][side])|set(p['buys']);early=set(r['decks'][side])|{id for id,t in p['buys'].items() if t<=10};maxHp.append(p['maxHp'])
    for id in owned:
     x=singleObs[id];x['games']+=1;x['wins']+=w;x['used']+=p['uses'].get(id,0)>0;x['bought']+=id in p['buys']
    import itertools
    for a,b in itertools.combinations(sorted(owned),2):
     x=pairObs[a,b];x[0]+=1;x[1]+=w
     if a in early and b in early:x[2]+=1;x[3]+=w
    for id,c in CARDS.items():
     if c.get('quest') and p['uses'].get(id,0):quest[id]['activated']+=1;quest[id]['completed']+=bool(p['questCompleted'].get(id,0))

def market_rows(scope):
 out=[];vectors={}
 for id in CAT['market']:
  groups={rep:v for (cid,rep),v in M[scope].items() if cid==id and len(v)==2}
  if not groups:continue
  vec={rep:mean([z['score'] for z in v.values()]) for rep,v in groups.items()};vectors[id]=vec
  rows=[z for v in groups.values() for z in v.values()];x={**label(id),**ci(list(vec.values()),.5),'games':len(rows),'planned':planned[scope,'market',id],'boughtRate':mean([z['bought'] for z in rows]),'usedRate':mean([z['used'] for z in rows]),'firstUseTurn':mean([z['firstUse'] for z in rows if z['firstUse'] is not None]),'firstPlayerScore':mean([v[0]['score'] for v in groups.values()]),'secondPlayerScore':mean([v[1]['score'] for v in groups.values()])}
  x['missingGames']=x['planned']-x['games'];total=sum(z['score'] for z in rows);x['missingBounds']=[total/x['planned'],(total+x['missingGames'])/x['planned']]
  x['byBackground']={s:ci([mean([z['score'] for z in v.values()]) for v in groups.values() if v[0]['stratum']==s],.5) for s in ['default','random','preset','recipe']}
  peers=sum(c!=id and CARDS[c]['cost']==x['cost'] for c in CAT['market']);x['peerCount']=peers;x['flags']=[]
  if not peers:x['flags'].append('同コスト対照なし');x.update({k:None for k in ['mean','lo','hi','p']});vectors.pop(id)
  if x['usedRate']<.1:x['flags'].append('条件未達またはBOT未活用')
  elif x['usedRate']<.5:x['flags'].append('使用率が低い')
  if x['missingGames']/x['planned']>.05:x['flags'].append('欠測が5%超')
  out.append(x)
 bh(out);out.sort(key=lambda x:(x['peerCount']>0 and x['usedRate']>=.1,x['mean'] if x['mean'] is not None else -9),reverse=True)
 for i,x in enumerate(out):x['rank']=i+1 if x['peerCount'] and x['usedRate']>=.1 else None
 return out,vectors

def starter_rows(scope):
 out=[];vectors={}
 for id in CAT['starters']:
  groups={rep:v for (cid,rep),v in S[scope].items() if cid==id and len(v)==4}
  if not groups:continue
  vec={rep:mean([v['treatment',s]['score']-v['control',s]['score'] for s in [0,1]]) for rep,v in groups.items()};vectors[id]=vec
  x={**label(id),**ci(list(vec.values())),'games':len(groups)*4,'planned':planned[scope,'starter',id],'treatmentScore':mean([v['treatment',s]['score'] for v in groups.values() for s in [0,1]]),'controlScore':mean([v['control',s]['score'] for v in groups.values() for s in [0,1]]),'usedRate':mean([v['treatment',s]['used'] for v in groups.values() for s in [0,1]])}
  x['byBackground']={s:ci([vec[rep] for rep,v in groups.items() if v['treatment',0]['stratum']==s]) for s in ['default','random','preset','recipe']}
  x['flags']=[] if x['usedRate']>=.1 else ['BOT未活用・能力の弱さとは区別']
  x['missingGames']=x['planned']-x['games'];x['missingRate']=x['missingGames']/x['planned']
  if x['missingRate']>.05:x['flags'].append('欠測が5%超')
  out.append(x)
 bh(out);out.sort(key=lambda x:(x['usedRate']>=.1,x['mean']),reverse=True)
 for i,x in enumerate(out):x['rank']=i+1 if x['usedRate']>=.1 else None
 return out,vectors

def bootstrap_ranks(rows,vectors,reps=400):
 if not vectors:return
 rr=random.Random(482026);ids=[x['id'] for x in rows if x['id'] in vectors and x['rank'] is not None];N=max(max(vectors[id]) for id in ids)+1;samples={id:[] for id in ids}
 for _ in range(reps):
  weights=co.Counter(rr.randrange(N) for _ in range(N));means={}
  for id in ids:
   v=vectors[id];valid=[(v[k],w) for k,w in weights.items() if k in v];means[id]=sum(x*w for x,w in valid)/sum(w for x,w in valid)
  order=sorted(ids,key=lambda id:means[id],reverse=True)
  for rank,id in enumerate(order,1):samples[id].append(rank)
 for x in rows:
  if x['id'] not in samples:continue
  vals=sorted(samples[x['id']]);x['rank95']=[vals[int(reps*.025)],vals[int(reps*.975)]];x['top10Probability']=sum(v<=10 for v in vals)/reps

results={};vectors={}
for scope in sorted(set(M)|set(S)):
 mr,mv=market_rows(scope);sr,sv=starter_rows(scope);results[scope]={'market':mr,'starters':sr};vectors[scope]={'market':mv,'starters':sv}
 if scope=='baseline':bootstrap_ranks(mr,mv);bootstrap_ranks(sr,sv)
policyDeltas={}
for a,b in [('baseline','coverage'),('tactical-control','tactical')]:
 if a not in vectors or b not in vectors:continue
 policyDeltas[b]={}
 for section in ['market','starters']:
  out=[]
  for id,v in vectors[a][section].items():
   if id not in vectors[b][section]:continue
   w=vectors[b][section][id];common=sorted(v.keys()&w.keys());out.append({'id':id,'name':name(id),**ci([w[k]-v[k] for k in common]),'control':mean([v[k] for k in common]),'alternative':mean([w[k] for k in common])})
  bh(out);policyDeltas[b][section]=out
factor=[]
for combo in sorted({k[0] for k in F}):
 groups=[v for (c,rep),v in F.items() if c==combo and len(v)==8]
 vals=[mean([v['11',s]['score']-v['10',s]['score']-v['01',s]['score']+v['00',s]['score'] for s in [0,1]]) for v in groups]
 x={'combo':combo,'names':' + '.join(name(i) for i in combo.split('|')),**ci(vals),'games':len(groups)*8,'arms':{arm:ci([mean([v[arm,s]['score'] for s in [0,1]]) for v in groups]) for arm in ['00','10','01','11']},'useRates':{arm:{id:mean([v[arm,s]['uses'].get(id,0)>0 for v in groups for s in [0,1]]) for id in combo.split('|')} for arm in ['00','10','01','11']},'support':groups[0]['00',0]['support'] if groups else None};factor.append(x)
bh(factor);factor.sort(key=lambda x:x['mean'] if x['mean'] is not None else -9,reverse=True)
builds={};matchups={}
for scope,gs in B.items():
 out=[];ms=[]
 for nm in sorted({k[0] for k in gs}):
  vals=[mean(list(v.values())) for (a,b,rep),v in gs.items() if a==nm and len(v)==2];ex=buildExtra[scope,nm];n=ex['games']
  out.append({'name':nm,**ci(vals,.5),'games':len(vals)*2,'finishedGames':n,'turn':ex['turn']/n,'turncap':ex['turncap']/n,'maxHp':ex['maxHp']/n,'mana':ex['mana']/n,'opponentDamage':ex['damageReceivedByOpponent']/n,'specialWinRate':ex['specialWins']/n,'demonTiers':{tier:ex['마족:'+str(tier)]/n for tier in [2,3,4]},'useGames':dict(useStats[scope,nm])})
  for op in sorted({k[1] for k in gs if k[0]==nm}):
   v=[mean(list(x.values())) for (a,b,rep),x in gs.items() if a==nm and b==op and len(x)==2];ms.append({'a':nm,'b':op,**ci(v,.5),'games':len(v)*2})
 out.sort(key=lambda x:x['mean'],reverse=True);builds[scope]=out;matchups[scope]=ms
proposal=[]
for variant,context in sorted({(v,c) for v,c,rep in P}):
 groups=[v for (a,b,rep),v in P.items() if a==variant and b==context and len(v)==4]
 vals=[mean([v['candidate',s]['score']-v['control',s]['score'] for s in [0,1]]) for v in groups]
 proposal.append({'variant':variant,'context':context,**ci(vals),'games':len(groups)*4,'control':ci([mean([v['control',s]['score'] for s in [0,1]]) for v in groups]),'candidate':ci([mean([v['candidate',s]['score'] for s in [0,1]]) for v in groups]),'turn':{arm:mean([v[arm,s]['turn'] for v in groups for s in [0,1]]) for arm in ['control','candidate']},'turncap':{arm:mean([v[arm,s]['turncap'] for v in groups for s in [0,1]]) for arm in ['control','candidate']},'maxHp':{arm:mean([v[arm,s]['hp'] for v in groups for s in [0,1]]) for arm in ['control','candidate']}})
bh(proposal)
pairs=[{'a':a,'b':b,'nameA':name(a),'nameB':name(b),'n':n,'score':w/n,'earlyN':en,'earlyScore':ew/en if en else None} for (a,b),(n,w,en,ew) in pairObs.items()];pairs.sort(key=lambda x:x['score'],reverse=True)
for x in pairs:
 a,b=x['a'],x['b'];bothWins=pairObs[a,b][1]
 for key,id in [('aOnly',a),('bOnly',b)]:
  n=singleObs[id]['games']-x['n'];x[key+'N']=n;x[key]=(singleObs[id]['wins']-bothWins)/n if n else None
 n=2*obsN-singleObs[a]['games']-singleObs[b]['games']+x['n'];x['neitherN']=n;x['neither']=(obsN-singleObs[a]['wins']-singleObs[b]['wins']+bothWins)/n if n else None
for x in pairs:
 a,b=x['a'],x['b'];na=singleObs[a]['games']-x['n'];nb=singleObs[b]['games']-x['n'];wins=x['score']*x['n']
 x['aOnly']=(singleObs[a]['wins']-wins)/na if na else None;x['bOnly']=(singleObs[b]['wins']-wins)/nb if nb else None;x['aOnlyN']=na;x['bOnlyN']=nb
summary={'attempted':sum(counts.values()),'finished':sum(counts.values())-sum(bad.values()),'failed':sum(bad.values()),'counts':dict(counts),'bad':dict(bad),'reasons':dict(co.Counter(x['reason'] for x in invalid)),'endings':dict(endings),'turns':{k:{'mean':mean(v),'median':st.median(v)} for k,v in turns.items()},'firstPlayerScore':{k:mean(v) for k,v in first.items()},'observationGames':obsN,'observedMaxHp':{'mean':mean(maxHp),'maximum':max(maxHp) if maxHp else None}}
out={'summary':summary,'rankings':results,'policyDeltas':policyDeltas,'combos':factor,'builds':builds,'matchups':matchups,'proposals':proposal,'pairs':pairs,'naturalCards':[{'id':id,'name':name(id),**dict(x),'score':x['wins']/x['games']} for id,x in singleObs.items()],'quests':[{'id':id,'name':name(id),**dict(v)} for id,v in quest.items()]}
expected=json.loads((ROOT/'source-manifest.json').read_text())['totalPlanned']
summary['completeDataset']=summary['attempted']==expected
assert SNAPSHOT or summary['completeDataset'],f"Incomplete data: {summary['attempted']}/{expected}"
(ROOT/('results.partial.json' if SNAPSHOT else 'results.json')).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')));(ROOT/('invalid-games.partial.json' if SNAPSHOT else 'invalid-games.json')).write_text(json.dumps(invalid,ensure_ascii=False,separators=(',',':')))
print(json.dumps(summary,ensure_ascii=False))
