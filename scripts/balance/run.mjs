import {installClone} from './clone.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createGame,reduce,greedyDecide,botDecide,candidates,buyCost,playCost,purchaseAllowed,DB,STARTERS,DECK_POOL,BUYABLE_POOL,BOT_DECKS,DEFAULT_DECK_8,BALANCE_VERSION,cullExiled} from './core.bundle.mjs';

export const catalog = {version:BALANCE_VERSION,market:BUYABLE_POOL,starters:DECK_POOL,cards:{...DB,...STARTERS},presets:BOT_DECKS};
export function rng(seed) {let s=seed>>>0; return ()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function randomDeck(r) {return Array.from({length:8},()=>DECK_POOL[Math.floor(r()*DECK_POOL.length)]);}
export function mixedDeck(r) {return r()<0.5 ? randomDeck(r) : [...[...BOT_DECKS.map(d=>d.cards),DEFAULT_DECK_8][Math.floor(r()*6)]];}

export function simulate(job,onStep) {
  const r=rng(job.seed^0xa85b1739), oldRandom=Math.random; Math.random=r;
  let g=createGame({seed:job.seed,mode:'bot',starting:job.starting??0,p0:{id:'p0',name:'A',isBot:true,deck:job.decks[0]},p1:{id:'p1',name:'B',isBot:true,deck:job.decks[1]}}).state;
  // A fixed-market opportunity experiment, not a free card injection. Both players pay normal costs.
  if(job.market) job.market.forEach((id,i)=>{g.market[i]={...structuredClone(DB[id]),uid:`experiment-market-${i}`};g.marketStock[i]=3;});
  const buys=[{},{}], questCompleted=[{},{}], offered=[new Set(),new Set()], damage=[0,0];
  let steps=0,invalid=0,reason='',lastTurn=g.turn,burst=[0,0],maxBurst=[0,0];
  const priorityDone=[new Set(),new Set()];
  const observe=()=>{for(let s=0;s<2;s++){for(const c of [...g.market,...g.players[s].supply])if(c)offered[s].add(c.id);}};
  observe();
  try {
    while(!g.over && steps<1600) {
      let a=job.policy==='hell' ? botDecide(g,'hell') : greedyDecide(g,job.tactical!==false);
      if(job.priority&&!g.pending){
        const s=g.cur,p=g.players[s];
        for(const [slot,id] of (job.priority[s]??[]).entries()){
          if(priorityDone[s].has(slot))continue;
          const c={...structuredClone(DB[id]),uid:`priority-${s}-${slot}-${id}`};
          if(buyCost(p,c)<=p.mana&&purchaseAllowed(g,p,c)){
            p.supply[0]=c;offered[s].add(id);a={type:'buySupply',i:0};priorityDone[s].add(slot);break;
          }
        }
      }
      if(job.policy==='explore' && !g.pending && (a.type==='buyMarket'||a.type==='buySupply'||a.type==='endTurn') && r()<0.4){
        const opts=candidates(g).filter(x=>x.type==='buyMarket'||x.type==='buySupply');
        if(opts.length) a=opts[Math.floor(r()*opts.length)];
      }
      // Separate sensitivity experiment only: cover a bounded list of overlooked,
      // theme-enabling spells. All baseline jobs retain the shipped policy.
      if(job.policy==='coverage'&&!g.pending){
        const p=g.players[g.cur],spare=['buyMarket','buySupply','endTurn','refresh'].includes(a.type);
        for(let idx=0;idx<p.hand.length;idx++){
          const c=p.hand[idx];if(playCost(c,p)>p.mana)continue;
          const win=c.id==='CHOSEN_AREA'&&cullExiled(p)>=25;
          const support=spare&&(
            ['GRAPE','GRAPE2','WINE'].includes(c.id)||
            c.id==='SLUM'&&p.enchants.some(e=>e.card.ench==='guild')||
            c.id==='INCUBATOR_S'&&p.field.some(m=>m.hatch!=null)||
            c.id==='FOCUS'&&[...p.deck,...p.discard].some(x=>x.star==='trash')||
            c.id==='REFRESH_HAND'&&p.hand.some(x=>x.star==='trash')||
            c.id==='CROSSROADS'&&[...p.hand,...p.deck,...p.discard].some(x=>x.id==='CHOSEN_AREA'));
          if(!win&&!support)continue;
          const next=reduce(g,{type:'play',idx}).state;
          if(!next.players[g.cur].hand.some(x=>x.uid===c.uid)&&(!win||next.over&&next.winner===g.cur)){a={type:'play',idx};break;}
        }
      }
      const prev=g, result=reduce(g,a);g=result.state;steps++;
      if(onStep)onStep(prev,a,result,steps);
      for(const e of result.events){
        if(e.type==='buy')buys[e.player][e.id]??=prev.turn;
        if(e.type==='damage'){damage[1-e.player]+=e.amount;burst[e.player]+=e.amount;}
      }
      for(let s=0;s<2;s++)for(const q of prev.players[s].quests??[]){
        if(!(g.players[s].quests??[]).some(x=>x.card.uid===q.card.uid) && g.players[s].removed.some(x=>x.uid===q.card.uid) && result.events.some(e=>e.type==='log'&&e.html.includes('クエスト達成！')&&e.html.includes(q.card.name)))questCompleted[s][q.card.id]=(questCompleted[s][q.card.id]??0)+1;
      }
      if(g.turn!==lastTurn){for(let s=0;s<2;s++)maxBurst[s]=Math.max(maxBurst[s],burst[s]);burst=[0,0];lastTurn=g.turn;observe();}
      // Rejected actions are data-quality failures, never manufactured draws or forced passes.
      if((result.events.length===0 || job.tactical===true && a.type==='attack') && JSON.stringify(prev)===JSON.stringify(g)){
        invalid++;reason=job.tactical===true&&a.type==='attack'?'rejected-attack':`noop:${a.type}:${g.pending?.reason??''}`;break;
      }
    }
    if(!g.over&&!reason)reason='stepcap';
    for(let s=0;s<2;s++)maxBurst[s]=Math.max(maxBurst[s],burst[s]);
    return {...job,finished:g.over,winner:g.winner,turn:g.turn,steps,invalid,reason,
      end:g.over?(g.turn>=60?'turncap':g.players.some(p=>p.hp<=0)?'hp':'special'):'invalid',
      sides:g.players.map((p,s)=>({buys:buys[s],uses:p.uses,offered:[...offered[s]],hp:p.hp,maxHp:p.maxHp,mana:p.maxMana,culls:cullExiled(p),damage:damage[s],maxBurstReceived:maxBurst[s],questCompleted:questCompleted[s],questPending:(p.quests??[]).map(q=>({id:q.card.id,progress:q.progress,target:q.card.quest.target})),field:p.field.map(c=>c.id)}))};
  }catch(e){return {...job,finished:false,winner:null,reason:`exception:${e.stack}`,turn:g.turn,steps};}
  finally {Math.random=oldRandom;}
}

if(process.argv[2]==='catalog')fs.writeFileSync(process.argv[3],JSON.stringify(catalog,null,2));
if(process.argv[2]==='worker'){
  if(process.env.BALANCE_FAST_CLONE==='1')installClone();
  const [,,mode,planFile,outFile,shardText='0',shardsText='1']=process.argv;
  const jobs=JSON.parse(fs.readFileSync(planFile,'utf8')),shard=+shardText,shards=+shardsText;
  if(fs.existsSync(outFile+'.gz'))throw Error('Archived results already exist: '+outFile+'.gz');
  const selected=jobs.filter((_,i)=>i%shards===shard),fd=fs.openSync(outFile,'wx'),t=Date.now();let done=0,bad=0;
  for(const job of selected){const row=simulate(job);if(!row.finished)bad++;fs.writeSync(fd,JSON.stringify(row)+'\n');done++;if(done%100===0)console.log(JSON.stringify({shard,done,total:selected.length,bad,seconds:(Date.now()-t)/1000}));}
  fs.closeSync(fd);console.log(JSON.stringify({shard,done,bad,seconds:(Date.now()-t)/1000,complete:true}));
}
