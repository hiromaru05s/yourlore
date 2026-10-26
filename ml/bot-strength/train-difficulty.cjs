// Reproducible v68+ training. Candidate selection, value fitting, and held-out
// evaluation have disjoint game seeds. Human win targets are never training labels.
const fs=require('node:fs'),path=require('node:path'),{Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-training-20261027';
const C=require(lab+'/candidate.cjs');
const copies=(id,n)=>Array(n).fill(id),cull=n=>copies('STARTER_TRASH',n);
const defaultFamilies={
 goblin:{core:['GOBLIN','GOBLIN','GOBLIN_RAIDER'],pool:['GOBLIN','GOBLIN','COUNTERCALC','TRUMPET','BLOOD_RITE','STARTER_TRASH','GOBLIN_SETTLEMENT']},
 decay:{core:['RUST_SHROOM','RUST_SHROOM','ACID_RAIN'],pool:['RUST_SHROOM','COUNTERCALC','BLOOD_RITE','TRUMPET','WEAKEN_ALL','STARTER_TRASH']},
 fortress:{core:['CASTLE','WEAKEN_ALL','WEAKEN_ALL'],pool:['CASTLE','COUNTERCALC','NOURISHING_RAIN','GAMBLER','STARTER_TRASH','BLOOD_RITE','STARTER_CHEST']},
 dew:{core:['ELF_HAVEN','HALF_ELF','NOURISHING_RAIN'],pool:['HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN','COUNTERCALC','BLOOD_RITE','STARTER_TRASH','STARTER_CHEST']},
 casino:{core:['CASINO','GAMBLER','GAMBLER'],pool:['CASINO','GAMBLER','COUNTERCALC','BLOOD_RITE','WEAKEN_ALL','STARTER_CHEST','STARTER_TRASH','FATE_WHEEL']},
 rift:{core:['RIFT','RIFT','STARTER_TRASH'],pool:['STARTER_TRASH','STARTER_TRASH','CASTLE','WEAKEN_ALL','COUNTERCALC','SELECTED_SHIELD','NOURISHING_RAIN','FOCUS']},
 vampire:{core:['NIGHT_CASTLE_GIFT','NIGHT_CASTLE_GIFT','BLOOD_RITE'],pool:['NIGHT_CASTLE_GIFT','WEAKEN_ALL','COUNTERCALC','GAMBLER','NOURISHING_RAIN','STARTER_TRASH','STARTER_CHEST']},
};
const families=process.env.FAMILIES_FILE?JSON.parse(fs.readFileSync(process.env.FAMILIES_FILE,'utf8')):defaultFamilies;
const opponents={
 goblin:[...copies('GOBLIN',6),'GOBLIN_RAIDER','COUNTERCALC'],
 suppression:['WEAKEN_ALL','WEAKEN_ALL','CASTLE','CASTLE','COUNTERCALC','GAMBLER','GAMBLER','BLOOD_RITE'],
 decay:[...copies('RUST_SHROOM',5),'ACID_RAIN','COUNTERCALC','BLOOD_RITE'],
 recovery:['ELF_HAVEN','HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN','CASTLE','WEAKEN_ALL','COUNTERCALC','STARTER_TRASH'],
 ramp:['GAMBLER','GAMBLER','GAMBLER','GAMBLER','STARTER_CHEST','STARTER_CHEST','WEAKEN_ALL','COUNTERCALC'],
 vampire:['NIGHT_CASTLE_GIFT','NIGHT_CASTLE_GIFT','NIGHT_CASTLE_GIFT','CASTLE','WEAKEN_ALL','COUNTERCALC','NOURISHING_RAIN','STARTER_TRASH'],
 mixed:['GOBLIN','GOBLIN','RUST_SHROOM','RUST_SHROOM','GOBLIN_RAIDER','COUNTERCALC','TRUMPET','BLOOD_RITE'],
 default:[...cull(6),'STARTER_CHEST','STARTER_CHEST'],
};
function rng(seed){return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};}
function play({deck,other,seed,seat=0,bias,record=false}){
 const ds=seat?[other,deck]:[deck,other];
 let g=C.createGame({mode:'bot',seed,starting:0,challenge:bias?{difficulty:bias,side:seat}:undefined,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;
 const market=g.market.map(c=>c.id),states=[],buys=[],random=rng(seed^0x4ee45);let steps=0;
 C.withoutMonsterPresentation(()=>{for(;!g.over&&steps<1800;steps++){
  const side=C.actingSide(g),view=C.observationSample(g,side,0);
  if(record&&!g.pending&&steps%9===0)states.push(C.valueFeatures(C.observationSample(g,0,37),0));
  let action=C.safeGreedy(view);
  if(record&&random()<.06){const actions=C.botActions(view);action=actions[Math.floor(random()*actions.length)];}
  action=C.legalBotAction(g,action,view);
  if(side===seat&&(action.type==='buyMarket'||action.type==='buySupply'))buys.push((action.type==='buyMarket'?g.market:g.players[side].supply)[action.i]?.id);
  const next=C.reduce(g,action).state;
  if(!C.actionChangesState(g,next)&&g.rng===next.rng)throw Error('Rejected action '+JSON.stringify(action));g=next;
 }});
 return {seed,seat,result:g.over?(g.winner==null?.5:g.winner===seat?1:0):null,turn:g.turn,steps,market,buys,states,label:g.over?(g.winner==null?.5:g.winner===0?1:0):null};
}
if(!isMainThread){parentPort.on('message',job=>{try{parentPort.postMessage({id:job.id,result:play(job)});}catch(e){parentPort.postMessage({id:job.id,error:String(e.stack)});}});}
else {
 const command=process.argv[2]||'select',out=lab+'/'+command+'.json';if(fs.existsSync(out))throw Error('Fresh output required: '+out);
 if(['train','holdout'].includes(command)&&fs.existsSync(lab+'/'+(command==='train'?'training-games':'holdout-games')+'.jsonl'))throw Error('Fresh game log required');
 const workers=Array.from({length:+(process.env.JOBS||4)},()=>new Worker(__filename)),pending=new Map();let serial=0,completed=0;const begin=Date.now();
 function runJobs(jobs){let cursor=0;return new Promise((resolve,reject)=>{
  const results=Array(jobs.length);let done=0;
  workers.forEach(w=>{w.removeAllListeners('message');w.removeAllListeners('error');w.on('error',reject);w.on('message',m=>{if(m.error){reject(Error(m.error));return;}results[m.id]=m.result;completed++;if(++done===jobs.length)resolve(results);else dispatch(w);});dispatch(w);});
  function dispatch(w){if(cursor<jobs.length){const id=cursor++;w.postMessage({...jobs[id],id});}}
 });}
 async function main(){
 if(command==='select'){
  const random=rng(271027);const scores=[];
  for(const [family,spec] of Object.entries(families)){
   const candidates=[],seen=new Set();
   while(candidates.length<24){const deck=[...spec.core];while(deck.length<8)deck.push(spec.pool[Math.floor(random()*spec.pool.length)]);const key=[...deck].sort().join(',');if(seen.has(key))continue;seen.add(key);if(JSON.stringify(C.sanitizeDeck(deck))!==JSON.stringify(deck))throw Error('Illegal deck');candidates.push(deck);}
   const jobs=[];for(let i=0;i<candidates.length;i++)for(const [oi,other] of Object.values(opponents).entries())for(const seat of [0,1])jobs.push({deck:candidates[i],other,seed:27100000+oi*100,seat,bias:'hell'});
   const rows=await runJobs(jobs);const ranked=candidates.map((deck,i)=>{const rr=rows.slice(i*16,(i+1)*16);return {deck,score:rr.reduce((s,r)=>s+(r.result??0),0)/rr.length,invalid:rr.filter(r=>r.result==null).length};}).sort((a,b)=>b.score-a.score);
   // Fresh seeds for finalists; never rank using the final holdout.
   const top=ranked.slice(0,4),round=[];for(const t of top)for(const [oi,other] of Object.values(opponents).entries())for(let r=0;r<3;r++)for(const seat of [0,1])round.push({deck:t.deck,other,seed:27200000+oi*100+r,seat,bias:r%2?'hard':'hell'});
   const rr=await runJobs(round);top.forEach((t,i)=>{const rows=rr.slice(i*48,(i+1)*48);t.validation=rows.reduce((s,r)=>s+(r.result??0),0)/rows.length;t.invalid+=rows.filter(r=>r.result==null).length;});top.sort((a,b)=>b.validation-a.validation);
   scores.push({family,selected:top[0],candidates:ranked,finalists:top});fs.writeFileSync(lab+'/selection-'+family+'.json',JSON.stringify({family,jobs,rows,round,validation:rr,scores:scores.at(-1)}));
   console.log(JSON.stringify({family,selected:top[0],games:completed,seconds:(Date.now()-begin)/1000}));
  }
  fs.writeFileSync(out,JSON.stringify({balance:C.BALANCE_VERSION,families,scores,games:completed,seconds:(Date.now()-begin)/1000},null,2));
 }else if(command==='refine'){
  const seeds=JSON.parse(fs.readFileSync(lab+'/roster.json')),scores=[];
  for(const [family,spec] of Object.entries(families)){
   const seed=seeds[family],candidates=[seed],seen=new Set([[...seed].sort().join(',')]);
   const include=deck=>{const left=[...deck];for(const id of spec.core){const i=left.indexOf(id);if(i<0)return;left.splice(i,1);}const key=[...deck].sort().join(',');if(!seen.has(key)){seen.add(key);candidates.push(deck);}};
   // Exhaust every legal single-card substitution around the incumbent and
   // include extreme distributions that random mutations rarely discover.
   for(let i=0;i<8;i++)for(const id of spec.pool){const deck=[...seed];deck[i]=id;include(deck);}
   for(const id of spec.pool){const deck=[...spec.core];while(deck.length<8)deck.push(id);include(deck);}
   const jobs=[];for(const deck of candidates)for(const [oi,other] of Object.values(opponents).entries())for(const seat of [0,1])jobs.push({deck,other,seed:33000000+oi*100,seat,bias:'hell'});
   const rows=await runJobs(jobs),ranked=candidates.map((deck,i)=>({deck,score:rows.slice(i*16,(i+1)*16).reduce((s,r)=>s+(r.result??0),0)/16})).sort((a,b)=>b.score-a.score);
   const finalists=ranked.slice(0,4);if(!finalists.some(x=>x.deck===seed))finalists.push({deck:seed,score:ranked.find(x=>x.deck===seed).score});
   const round=[];for(const t of finalists)for(const [oi,other] of Object.values(opponents).entries())for(let r=0;r<3;r++)for(const seat of [0,1])round.push({deck:t.deck,other,seed:33100000+oi*100+r,seat,bias:r%2?'hard':'hell'});
   const validation=await runJobs(round);finalists.forEach((t,i)=>{t.validation=validation.slice(i*48,(i+1)*48).reduce((s,r)=>s+(r.result??0),0)/48;});finalists.sort((a,b)=>b.validation-a.validation);
   const invalid=[...rows,...validation].filter(r=>r.result==null).length;
   const result={family,selected:finalists[0],candidates:ranked,finalists,invalid};scores.push(result);fs.writeFileSync(lab+'/refinement-'+family+'.json',JSON.stringify({jobs,rows,round,validation,result}));console.log(JSON.stringify({family,selected:result.selected,candidates:candidates.length,invalid,games:completed,seconds:(Date.now()-begin)/1000}));
  }
  fs.writeFileSync(out,JSON.stringify({balance:C.BALANCE_VERSION,families,scores,games:completed,seconds:(Date.now()-begin)/1000},null,2));
 }else if(command==='market'){
  const profiles=JSON.parse(fs.readFileSync(lab+'/roster.json')),names=Object.keys(profiles),foes=Object.entries(opponents),jobs=[];
  const rows=[];
  const reuse=process.env.MARKET_REUSE_DIR;
  if(reuse){const old=JSON.parse(fs.readFileSync(reuse+'/market.json')),oldNames=Object.keys(old.profiles);for(const r of fs.readFileSync(reuse+'/market-games.jsonl','utf8').trim().split('\n').map(JSON.parse))if(JSON.stringify(old.profiles[oldNames[r.profile]])===JSON.stringify(profiles[names[r.profile]]))rows.push(r);}
  const reusedGames=rows.length,reusedProfiles=new Set(rows.map(r=>r.profile));
  if(rows.length)fs.writeFileSync(lab+'/market-games.jsonl',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  for(const [pi,name] of names.entries())if(!reusedProfiles.has(pi))for(const [oi,[opponent,other]] of foes.entries())for(let r=0;r<80;r++)for(const seat of [0,1])jobs.push({profile:pi,opponent:oi,deck:profiles[name],other,seat,seed:35100000+pi*100000+oi*1000+r});
  for(let start=0;start<jobs.length;start+=128){const batch=(await runJobs(jobs.slice(start,start+128))).map((r,i)=>({...r,profile:jobs[start+i].profile,opponent:jobs[start+i].opponent,states:undefined}));rows.push(...batch);fs.appendFileSync(lab+'/market-games.jsonl',batch.map(r=>JSON.stringify(r)).join('\n')+'\n');if(completed%512===0)console.log(JSON.stringify({games:completed,seconds:(Date.now()-begin)/1000}));}
  if(rows.some(r=>r.result==null))throw Error('Incomplete market training games');
  const cards=[...new Set(rows.flatMap(r=>r.market))].sort(),offset=1+names.length+foes.length+1,dim=offset+cards.length*(names.length+1),index=new Map(cards.map((id,i)=>[id,i]));
  const samples=rows.map((r,i)=>({y:r.result,validation:Math.floor(i/2)%10===0,base:[0,1+r.profile,1+names.length+r.opponent,...(r.seat?[offset-1]:[])],extra:r.market.flatMap(id=>[offset+index.get(id),offset+cards.length*(r.profile+1)+index.get(id)])}));
  const random=rng(351027),ids=samples.map((_,i)=>i).filter(i=>!samples[i].validation);
  function fit(withCards,penalty){const w=Array(dim).fill(0),v=Array(dim).fill(.1);for(let epoch=0;epoch<35;epoch++){for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}for(const i of ids){const s=samples[i],x=withCards?[...s.base,...s.extra]:s.base,z=x.reduce((n,j)=>n+w[j],0),e=1/(1+Math.exp(-z))-s.y;for(const j of x){const grad=e+w[j]*(j<offset?.002:penalty);v[j]+=grad*grad;w[j]-=.08*grad/Math.sqrt(v[j]);}}}let loss=0,brier=0,n=0;for(const s of samples)if(s.validation){const x=withCards?[...s.base,...s.extra]:s.base,p=1/(1+Math.exp(-x.reduce((z,j)=>z+w[j],0)));loss-=s.y*Math.log(Math.max(1e-9,p))+(1-s.y)*Math.log(Math.max(1e-9,1-p));brier+=(p-s.y)**2;n++;}return{w,validation:{n,loss:loss/n,brier:brier/n},penalty};}
  const baseline=fit(false,0),fits=[.05,.2,.8].map(p=>fit(true,p));fits.sort((a,b)=>a.validation.loss-b.validation.loss);const best=fits[0],weights={};
  for(const [pi,name] of names.entries())weights[name]=Object.fromEntries(cards.map((id,i)=>[id,+((best.w[offset+i]+best.w[offset+cards.length*(pi+1)+i])*20).toFixed(4)]));
  const result={balance:C.BALANCE_VERSION,games:rows.length,reusedGames,profiles,baseline:baseline.validation,validation:best.validation,penalty:best.penalty,grid:fits.map(({w,...v})=>v),weights,seconds:(Date.now()-begin)/1000};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,weights:undefined,profiles:undefined}));
 }else if(command==='train'){
  const selected=JSON.parse(fs.readFileSync(lab+'/select.json')).scores.map(s=>s.selected.deck),decks=[...selected,...Object.values(opponents),...C.BOT_DECKS.map(d=>d.cards)];const random=rng(281027),X=[],Y=[],V=[];let invalid=0;
  const games=+(process.env.GAMES||8000);
  for(let beginIndex=0;beginIndex<games;beginIndex+=100){const jobs=Array.from({length:Math.min(100,games-beginIndex)},(_,i)=>({deck:decks[Math.floor(random()*decks.length)],other:decks[Math.floor(random()*decks.length)],seed:28100000+beginIndex+i,seat:(beginIndex+i)%2,bias:['hard','hell',undefined,undefined][i%4],record:true}));
   const rows=await runJobs(jobs);for(const [i,r] of rows.entries()){if(r.result==null){invalid++;continue;}for(const x of r.states){X.push(x);Y.push(r.label);V.push((beginIndex+i)%10===0);}}
   fs.appendFileSync(lab+'/training-games.jsonl',rows.map(({states,...r})=>JSON.stringify(r)).join('\n')+'\n');
   if(completed%500===0)console.log(JSON.stringify({games:completed,invalid,samples:X.length,seconds:(Date.now()-begin)/1000}));
  }
  const F=X[0].length,scale=Array(F).fill(0),weights=Array(F).fill(0),grad2=Array(F).fill(.01);let n=0;
  for(let i=0;i<X.length;i++)if(!V[i]){n++;for(let j=0;j<F;j++)scale[j]+=X[i][j]**2;}for(let j=0;j<F;j++)scale[j]=Math.sqrt(scale[j]/n)||1;
  const raw=X.map(x=>x.slice());for(const x of X)for(let j=0;j<F;j++)x[j]/=scale[j];
  const ids=X.map((_,i)=>i).filter(i=>!V[i]);
  for(let epoch=0;epoch<35;epoch++){for(let k=ids.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[ids[k],ids[j]]=[ids[j],ids[k]];}for(const i of ids){const x=X[i],z=x.reduce((s,v,j)=>s+v*weights[j],0),err=1/(1+Math.exp(-z))-Y[i];for(let j=0;j<F;j++){const grad=err*x[j]+.0005*weights[j];grad2[j]+=grad*grad;weights[j]-=.08*grad/Math.sqrt(grad2[j]);}}}
  const metric=(validation,w=weights,sc=scale)=>{let loss=0,brier=0,n=0;for(let i=0;i<X.length;i++)if(V[i]===validation){const z=raw[i].reduce((s,v,j)=>s+v*w[j]/sc[j],0),p=1/(1+Math.exp(-z));loss+=-Y[i]*Math.log(Math.max(1e-9,p))-(1-Y[i])*Math.log(Math.max(1e-9,1-p));brier+=(p-Y[i])**2;n++;}return{n,loss:loss/n,brier:brier/n};};
  fs.writeFileSync(out,JSON.stringify({balance:C.BALANCE_VERSION,games,invalid,samples:X.length,weights,scale,train:metric(false),validation:metric(true),previousValidation:metric(true,C.VALUE_WEIGHTS.weights,C.VALUE_WEIGHTS.scale),seconds:(Date.now()-begin)/1000},null,2));console.log(fs.readFileSync(out,'utf8'));
 }else if(command==='holdout'){
  const selected=JSON.parse(fs.readFileSync(lab+'/select.json')).scores,jobs=[];
  for(const s of selected)for(const [opponent,other] of Object.entries(opponents))for(let r=0;r<8;r++)for(const seat of [0,1])for(const bias of [undefined,'hard','hell'])jobs.push({family:s.family,opponent,deck:s.selected.deck,other,seed:+(process.env.HOLDOUT_SEED||29100000)+r*100+Object.keys(opponents).indexOf(opponent),seat,bias});
  const rows=[];for(let start=0;start<jobs.length;start+=96){const rr=await runJobs(jobs.slice(start,start+96)),batch=rr.map((r,i)=>({...jobs[start+i],...r,states:undefined}));rows.push(...batch);fs.appendFileSync(lab+'/holdout-games.jsonl',batch.map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(JSON.stringify({games:completed,seconds:(Date.now()-begin)/1000}));}
  fs.writeFileSync(out,JSON.stringify({balance:C.BALANCE_VERSION,games:rows.length,rows,seconds:(Date.now()-begin)/1000}));
 }
 }
 main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>workers.forEach(w=>w.terminate()));
}
