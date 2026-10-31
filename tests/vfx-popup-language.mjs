import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {build} from 'esbuild';
const dir=await fs.mkdtemp('/tmp/lore-event-locales-');
try {
await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export {logToEn} from './client/src/shared/logEn';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs',logLevel:'silent'});const E=await import(dir+'/engine.mjs');let seq=0,total=0;const bad=new Map(),all=new Map();
const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'probe-'+ ++seq}),mon=id=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0,guts:2,decay:1});
function collect(events,id){for(const e of events)if(e.type==='log'){total++;for(const l of ['ko','ja','en']){let s=(l==='en'?(e.htmlEn??E.logToEn(e.html)):l==='ja'?e.htmlJa:e.html).replace(/<b class="log-card" data-card="([^"]+)">.*?<\/b>/g,(_m,id)=>{const c=E.DB[id]??E.STARTERS[id];return c?c[{ko:'name',ja:'nameJa',en:'nameEn'}[l]]:'CARD';}).replace(/<[^>]*>/g,'');all.set(l+':'+s,{id,lang:l,text:s});if((l==='en'?/[가-힣ぁ-んァ-ヶ一-龯]/:l==='ja'?/[가-힣]/:/[ぁ-んァ-ヶ一-龯]/).test(s))bad.set(l+':'+s,{id,lang:l,text:s,original:e});}}}
for(const def of Object.values(E.DB))for(const seed of [1,4,9]){
 let g=E.createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=9;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,dew:30,shield:3,brand:2,hand:[],deck:['M1','S1','S2','STARTER_TRASH','STARTER_CHEST'].map(card),discard:['M1','S2','STARTER_TRASH'].map(card),field:['M1','INFKNIGHT','ASSASSIN','ELF','GOLEM2','VAMP2'].filter(id=>E.DB[id]).map(mon),enchants:[],traps:[],quests:[],removed:['STARTER_TRASH','M1','S1'].map(card),uses:{},usesTurn:{},buys:{},playsTurn:0});g.players[0].hand=[card(def.id),card('STARTER_TRASH')];
 try{let r=E.reduce(g,{type:'play',idx:0});collect(r.events,def.id);g=r.state;
 for(let n=0;n<5&&g.pending&&!g.over;n++){const q=g.pending,p=g.players[E.actingSide(g)],o=g.players[1-E.actingSide(g)];let choices=q.kind==='cardChoice'?E.effectChoices(g):q.kind==='myMon'?p.field:q.kind==='oppMon'?(q.data?.anySide?[...o.field,...p.field]:o.field):q.kind==='oppBoard'?[...o.field,...o.enchants.map(x=>x.card),...p.enchants.map(x=>x.card)]:q.kind==='seek'?p.deck:q.kind==='recall'?p.discard:[];r=E.reduce(g,{type:'pick',uid:choices[0]?.uid??null});collect(r.events,def.id);g=r.state;}
 for(let n=0;n<3&&!g.over;n++){r=E.reduce(g,{type:'endTurn'});collect(r.events,def.id);g=r.state;}
 }catch(e){throw Error(def.id+':'+e.stack);}
}

// Exercise damage sources, deferred triggers, traps and both active players.
for(const seed of Array.from({length:24},(_,i)=>i+1))for(const side of [0,1]){
 const fresh=()=>{const g=E.createGame({mode:'online',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=9;g.cur=side;g.pending=null;
  for(const p of g.players)Object.assign(p,{hp:1000,mana:30,maxMana:30,shield:0,dew:10,brand:2,bleed:2,field:[],hand:[],deck:[],discard:[card('M1')],traps:[],enchants:[],quests:[]});return g;};
 const step=(g,action,label)=>{const r=E.reduce(g,action);collect(r.events,label);return r.state;};
 // Retained trap paths are reachable in saved games, even though traps left the current catalog.
 for(const react of ['preyGuard','plunder','lavaPit','rallyKnights','informant','counterFull']){const def={id:'M1'};
  let g=fresh(),p=g.players[side],o=g.players[1-side];p.field=[{...mon('M1'),atk:6}];o.field=[{...mon('M1'),tribe:'포식'}];o.traps=[{card:{...card(def.id),react,val2:50},bornTurn:0}];
  g=step(g,{type:'attack',uid:p.field[0].uid},def.id);g=step(g,{type:'chooseTarget',uid:o.field[0].uid},def.id);
 }
 let g=fresh();g.players[side].field=[{...mon('CASINO'),gcount:12},mon('GHOST')];g.players[1-side].field=[mon('GHOST')];g.players[side].hand=[card('AJIN')];g.players[side].enchants=[{card:card('LUCKY_ECHO'),turns:99,bornTurn:0}];
 g=step(g,{type:'play',idx:0},'casino/echo/ghost');g=step(g,{type:'endTurn'},'status damage');
 for(const tokens of [0,2]){g=fresh();g.players[side].refreshTokens=tokens;step(g,{type:'refresh'},'market refresh');}
 g=fresh();g.players[1-side].skipTurns=3;step(g,{type:'endTurn'},'stacked turn skips');
 g=fresh();g.players[side].hand=[card('AHEUK')];g.players[1-side].field=[mon('M1'),mon('M1')];step(g,{type:'play',idx:0},'mana reduction bonus');
}
assert.equal(bad.size,0,JSON.stringify([...bad.values()].slice(0,20),null,2));
assert(total>15000);console.log(`PASS ${total} fully interpolated engine logs; ${all.size} localized variants; no mixed JA/KO/EN text`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
