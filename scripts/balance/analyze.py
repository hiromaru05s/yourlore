#!/usr/bin/env python3
"""Streaming, stdlib-only summaries. Controlled CIs cluster opening-seat twins by seed."""
import collections as co
import glob,gzip,itertools,json,math,os,statistics as st,sys
ROOT=sys.argv[1]
CAT=json.load(open(ROOT+'/catalog.json'));CARDS=CAT['cards'];MARKET=set(CAT['market']);STARTERS=set(CAT['starters'])
QFIX=json.load(open(ROOT+'/quest-corrections.json')) if os.path.exists(ROOT+'/quest-corrections.json') else {}
OVERRIDES=json.load(open(ROOT+'/row-corrections.json')) if os.path.exists(ROOT+'/row-corrections.json') else {}
def score(r,s=0): return .5 if r['winner'] is None else float(r['winner']==s)
def stat(vals,center=0):
    n=len(vals)
    if not n:return {'n':0,'mean':None,'lo':None,'hi':None,'p':None}
    m=st.mean(vals);se=st.stdev(vals)/math.sqrt(n) if n>1 else 0
    p=math.erfc(abs(m-center)/(se*math.sqrt(2))) if se else (1 if m==center else 0)
    return {'n':n,'mean':m,'lo':m-1.96*se,'hi':m+1.96*se,'p':p}
def wilson(w,n):
    if not n:return [None,None]
    p=w/n;z=1.96;d=1+z*z/n;m=(p+z*z/(2*n))/d;h=z*math.sqrt((p*(1-p)+z*z/(4*n))/n)/d
    return [m-h,m+h]
def bh(rows,key='p'):
    valid=sorted([x for x in rows if x.get(key) is not None],key=lambda x:x[key]);prev=1
    for i in range(len(valid)-1,-1,-1):prev=min(prev,valid[i][key]*len(valid)/(i+1));valid[i]['q']=prev
def label(id):
    c=CARDS[id];return {'id':id,'name':c.get('nameJa',c['name']),'cost':c['cost'],'type':'quick' if c.get('quick') else c['t'],'text':c.get('textJa',c['text'])}
def pairkey(a,b):return '|'.join(sorted([a,b]))
counts=co.Counter();bad=co.Counter();invalid=[];turns=co.defaultdict(list);ends=co.defaultdict(co.Counter);first=co.defaultdict(list)
single=co.defaultdict(lambda:co.Counter());pairs=co.defaultdict(lambda:[0,0,0,0]);earlySingle=co.defaultdict(lambda:[0,0]);earlyPairs=co.defaultdict(lambda:[0,0]);starterCopies=co.defaultdict(lambda:[0,0]);population=[0,0]
starter=co.defaultdict(dict);market=co.defaultdict(dict);build=co.defaultdict(list);matchups=co.defaultdict(list);buildExtra=co.defaultdict(lambda:co.Counter());factor=co.defaultdict(dict);validation=co.defaultdict(dict)
factorSupport={}
coverage=co.defaultdict(dict);coverageUses=co.defaultdict(co.Counter)
quest=co.defaultdict(lambda:co.Counter());policies=co.defaultdict(lambda:co.Counter());observeTurns=[]
spellCounts=[];observedUses=co.Counter()
seenJobs=set()
for f in sorted(glob.glob(ROOT+'/raw/*/games-*.jsonl')+glob.glob(ROOT+'/raw/*/games-*.jsonl.gz')):
    for line in (gzip.open(f,'rt') if f.endswith('.gz') else open(f)):
        try:r=json.loads(line)
        except json.JSONDecodeError:continue # live progress snapshots may end mid-line
        r=OVERRIDES.get(str(r['id']),r)
        if r['id'] in seenJobs:raise ValueError(f"Duplicate game ID: {r['id']}")
        seenJobs.add(r['id'])
        stage=r['stage'];counts[stage]+=1
        if stage=='factor' and r.get('support'):factorSupport[r['combo']]=r['support']
        if not r['finished']:
            bad[stage]+=1;invalid.append({k:v for k,v in r.items() if k!='sides'});continue
        turns[stage].append(r['turn']);ends[stage][r['end']]+=1;first[stage].append(score(r,r['starting']))
        if stage=='starter':starter[(r['card'],r['rep'])][(r['arm'],r['starting'])]=score(r)
        if stage=='market':market[(r['card'],r['rep'])][r['starting']]=(score(r),r['card'] in r['sides'][0]['buys'],r['sides'][0]['uses'].get(r['card'],0)>0)
        if stage=='factor':factor[(r['combo'],r['rep'])][(r['arm'],r['starting'])]=(score(r),r['turn'],r['sides'][0]['hp'])
        if stage=='validation':validation[(r['test'],r['rep'])][(r['arm'],r['starting'])]=score(r)
        if stage=='coverage':
            coverage[(r['target'],r['opponent'],r['rep'])][(r['arm'],r['starting'])]=score(r)
            coverageUses[(r['target'],r['arm'])].update(r['sides'][0]['uses'])
        if stage=='build':
            a,b=r['builds'];matchups[(a,b)].append(score(r))
            for s,name in enumerate(r['builds']):
                v=score(r,s);build[name].append(v);ex=buildExtra[name];p=r['sides'][s]
                ex['turn']+=r['turn'];ex['turncap']+=r['end']=='turncap';ex['specialWins']+=r['end']=='special' and v==1
                ex['cull25']+=p['culls']>=25;ex['maxHp']+=p['maxHp'];ex['damage']+=p['damage'];ex['mana']+=p['mana']
                for id in r['decks'][s]:
                    if p['uses'].get(id,0):ex['used:'+id]+=1
        if stage!='observe':continue
        if str(r['id']) in QFIX:
            for s in [0,1]:r['sides'][s]['questCompleted']=QFIX[str(r['id'])][s]
        observeTurns.append(r['turn'])
        for s,p in enumerate(r['sides']):
            spellCounts.append(sum(n for id,n in p['uses'].items() if CARDS.get(id,{}).get('t')=='spell'))
            observedUses.update(p['uses'])
            w=score(r,s);owned=set(r['decks'][s])|set(p['buys']);early=set(r['decks'][s])|{id for id,t in p['buys'].items() if t<=10}
            population[0]+=1;population[1]+=w;policies[r['policy']]['sides']+=1
            for id in set(p['offered'])&MARKET:single[id]['offered']+=1
            for id in owned:
                x=single[id];x['n']+=1;x['w']+=w;x['n:'+r['policy']]+=1;x['w:'+r['policy']]+=w
                if id in p['buys']:x['bought']+=1;x['buyTurn']+=p['buys'][id];x['boughtUnused']+=not p['uses'].get(id,0) and not CARDS[id].get('quick')
                if p['uses'].get(id,0):x['used']+=1;x['usedW']+=w
                if CARDS[id].get('quest'):
                    q=quest[id];q['owned']+=1;q['activated']+=bool(p['uses'].get(id,0));q['complete']+=bool(p['questCompleted'].get(id,0))
            for id in early:earlySingle[id][0]+=1;earlySingle[id][1]+=w
            for a,b in itertools.combinations(sorted(owned),2):pairs[a+'|'+b][0]+=1;pairs[a+'|'+b][1]+=w
            for a,b in itertools.combinations(sorted(early),2):earlyPairs[a+'|'+b][0]+=1;earlyPairs[a+'|'+b][1]+=w
            for id,n in co.Counter(r['decks'][s]).items():starterCopies[(id,n)][0]+=1;starterCopies[(id,n)][1]+=w

starterRows=[]
for id in CAT['starters']:
    valid=[v for (c,k),v in starter.items() if c==id and len(v)==4]
    diffs=[st.mean(v[('treatment',s)]-v[('control',s)] for s in [0,1]) for v in valid]
    row={**label(id),**stat(diffs),'games':len(valid)*4,'treatmentScore':st.mean(v[('treatment',s)] for v in valid for s in [0,1]) if valid else None,'controlScore':st.mean(v[('control',s)] for v in valid for s in [0,1]) if valid else None,'observedUses':observedUses[id],'flags':['自然対戦で未使用・効力は評価保留'] if observedUses[id]==0 else []}
    starterRows.append(row)
bh(starterRows);starterRows.sort(key=lambda x:x['mean'] if x['mean'] is not None else -99,reverse=True)
marketRows=[]
for id in CAT['market']:
    valid=[v for (c,k),v in market.items() if c==id and len(v)==2]
    vals=[st.mean(z[0] for z in v.values()) for v in valid]
    row={**label(id),**stat(vals,.5),'games':len(valid)*2,'boughtRate':st.mean(z[1] for v in valid for z in v.values()) if valid else None,'usedRate':st.mean(z[2] for v in valid for z in v.values()) if valid else None,'observed':dict(single[id])}
    row['excludedGames']=256-row['games']
    row['missingOutcomeBounds']=[sum(vals)*2/256,(sum(vals)*2+row['excludedGames'])/256]
    row['observed']['score']=single[id]['w']/single[id]['n'] if single[id]['n'] else None
    marketRows.append(row)
bh(marketRows);marketRows.sort(key=lambda x:x['mean'] if x['mean'] is not None else -99,reverse=True)
for x in marketRows:
    x['flags']=[]
    x['peerCount']=sum(CARDS[id]['cost']==x['cost'] and id!=x['id'] for id in CAT['market'])
    if x['peerCount']==0:
        x['selfMirrorScore']=x['mean']
        for key in ['mean','lo','hi','p','q']:x[key]=None
        x['flags'].append('同コスト比較相手なし・順位対象外')
    if x['excludedGames']>12:x['flags'].append('BOT停止の影響に注意')
    if x['boughtRate'] is not None and x['boughtRate']<.5:x['flags'].append('購入条件・到達率に注意')
    if x['usedRate'] is not None and x['usedRate']<.1:x['flags'].append('BOT未活用・発動条件を要確認')
bh(marketRows);marketRows.sort(key=lambda x:x['mean'] if x['mean'] is not None else -99,reverse=True)
pairRows=[]
for key,(n,w,_,__) in pairs.items():
    a,b=key.split('|');na,wa=single[a]['n'],single[a]['w'];nb,wb=single[b]['n'],single[b]['w'];nn=population[0]-na-nb+n;wn=population[1]-wa-wb+w
    aonly=(wa-w)/(na-n) if na>n else None;bonly=(wb-w)/(nb-n) if nb>n else None;neither=wn/nn if nn else None
    en,ew=earlyPairs[key]
    pairRows.append({'a':a,'b':b,'nameA':label(a)['name'],'nameB':label(b)['name'],'n':n,'score':w/n,'ci':wilson(w,n),'aOnly':aonly,'bOnly':bonly,'neither':neither,'interaction':w/n-aonly-bonly+neither if None not in (aonly,bonly,neither) else None,'earlyN':en,'earlyScore':ew/en if en else None})
pairRows.sort(key=lambda x:(x['ci'][0],x['n']),reverse=True)
factorRows=[]
for combo in sorted({k[0] for k in factor}):
    valid=[v for (c,k),v in factor.items() if c==combo and len(v)==8]
    vals=[st.mean(v[('11',s)][0]-v[('10',s)][0]-v[('01',s)][0]+v[('00',s)][0] for s in [0,1]) for v in valid]
    row={'combo':combo,'support':factorSupport.get(combo),**stat(vals),'games':len(valid)*8,'arms':{arm:st.mean(v[(arm,s)][0] for v in valid for s in [0,1]) if valid else None for arm in ['00','10','01','11']}}
    factorRows.append(row)
bh(factorRows);factorRows.sort(key=lambda x:x['mean'] if x['mean'] is not None else -99,reverse=True)
validationRows=[]
for name in sorted({k[0] for k in validation}):
    valid=[v for (c,k),v in validation.items() if c==name and len(v)==4]
    vals=[st.mean(v[('treatment',s)]-v[('control',s)] for s in [0,1]) for v in valid]
    validationRows.append({'test':name,**stat(vals),'games':len(valid)*4,'treatmentScore':st.mean(v[('treatment',s)] for v in valid for s in [0,1]) if valid else None,'controlScore':st.mean(v[('control',s)] for v in valid for s in [0,1]) if valid else None})
coverageRows=[]
for target in sorted({k[0] for k in coverage}):
    valid=[v for (c,o,k),v in coverage.items() if c==target and len(v)==4]
    vals=[st.mean(v[('treatment',s)]-v[('control',s)] for s in [0,1]) for v in valid]
    coverageRows.append({'target':target,**stat(vals),'games':len(valid)*4,'treatmentScore':st.mean(v[('treatment',s)] for v in valid for s in [0,1]) if valid else None,'controlScore':st.mean(v[('control',s)] for v in valid for s in [0,1]) if valid else None,'uses':{arm:dict(coverageUses[(target,arm)]) for arm in ['control','treatment']}})
buildRows=[{'build':b,**stat(v,.5),'games':len(v),**{k:x/len(v) for k,x in buildExtra[b].items()}} for b,v in build.items()];buildRows.sort(key=lambda x:x['mean'],reverse=True)
summary={'attempted':sum(counts.values()),'finished':sum(counts.values())-sum(bad.values()),'failed':sum(bad.values()),'counts':dict(counts),'badByStage':dict(bad),'endings':{k:dict(v) for k,v in ends.items()},'turns':{k:{'mean':st.mean(v),'median':st.median(v),'p10':sorted(v)[int(len(v)*.1)],'p90':sorted(v)[int(len(v)*.9)]} for k,v in turns.items()},'firstScore':{k:st.mean(v) for k,v in first.items()},'observationSides':population[0]}
summary['spellsPerSide']={'mean':st.mean(spellCounts),'median':st.median(spellCounts),'atLeast25':sum(x>=25 for x in spellCounts),'sides':len(spellCounts)}
summary['observedUses']=dict(observedUses)
result={'summary':summary,'market':marketRows,'starters':starterRows,'pairs':pairRows,'builds':buildRows,'matchups':[{'a':a,'b':b,'games':len(v),'score':st.mean(v)} for (a,b),v in matchups.items()],'factor':factorRows,'validation':validationRows,'coverage':coverageRows,'quests':[{'id':id,**dict(v)} for id,v in quest.items()],'starterCopies':[{'id':id,'copies':c,'n':v[0],'score':v[1]/v[0]} for (id,c),v in starterCopies.items()]}
with open(ROOT+'/results.json','w')as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
with open(ROOT+'/invalid-games.json','w')as f:json.dump(invalid,f,ensure_ascii=False,separators=(',',':'))
print(json.dumps({k:v for k,v in summary.items() if k!='observedUses'},ensure_ascii=False))
for title,rows in [('STARTERS',starterRows),('MARKET',marketRows),('BUILDS',buildRows),('FACTOR',factorRows)]:
    print(title)
    for x in (rows[:6]+rows[-5:] if len(rows)>11 else rows):print({k:x.get(k) for k in ['id','name','build','combo','n','mean','lo','hi','q','boughtRate','usedRate'] if k in x})
