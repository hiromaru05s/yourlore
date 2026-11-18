import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const tmp=await mkdtemp('/tmp/lore-context-catalog-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/botSearch';export * from './client/src/shared/botAcquisition';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/core.mjs'});
 const C=await import(tmp+'/core.mjs');let serial=0,assessed=0;const ids=new Set(),rows=[];
 const card=id=>({...C.DB[id]??C.STARTERS[id],uid:'catalog-'+serial++});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const pool=C.BUYABLE_POOL.filter(id=>C.DB[id]);
 for(let scenario=0;scenario<4;scenario++)for(let offset=0;offset<pool.length;offset+=7){
  const g=C.createGame({mode:'bot',seed:8120+offset+scenario,starting:scenario%2,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
  g.turn=scenario===3?55:15;g.pending=null;g.market=pool.slice(offset,offset+7).map(card);g.marketStock=g.market.map(()=>3);
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],exile:[],removed:[],revealedCards:[],supply:[],hp:40,mana:20,maxMana:20});
  const p=g.players[g.cur],o=g.players[1-g.cur];p.hand=['MINI_SPIRIT','STARTER_MANA','NOURISHING_RAIN'].map(card);p.deck=['M4','GOBLIN','VAMP_PACT'].map(card);
  if(scenario===1){p.hp=6;o.field=[mon('M12',{dmg:2}),mon('M7',{dmg:1})];}
  if(scenario===2){p.field=[mon('MINI_SPIRIT',{atkMod:4,defMod:4,dmg:2}),mon('M4',{dmg:1})];o.enchants=['BLOOD_RITE','WEAKEN_ALL'].map(id=>({card:card(id),turns:99,bornTurn:0}));}
  if(scenario===3){p.deck.push(...Array.from({length:15},()=>card('STARTER_TRASH')));p.field=[mon('CASTLE',{gcount:2})];o.field=[mon('NGA4')];}
  const before=JSON.stringify(g),start=performance.now(),result=[...C.assessAcquisitions(g,C.positionMerit,1).values()];
  assert.equal(JSON.stringify(g),before,'every card trial preserves its input');
  for(const r of result){assert([r.impact,r.worst,r.cooperation,r.arrival,r.heuristic,r.margin].every(Number.isFinite),r.id);ids.add(r.id);assessed++;}
  rows.push({scenario,offset,count:result.length,ms:performance.now()-start});
 }
 assert(ids.size>300,'broad current purchase pool');
 const report={pool:pool.length,uniqueAssessed:ids.size,trials:assessed,scenarios:4,rows};
 if(process.env.BOT_CONTEXT_CATALOG_REPORT){await mkdir(path.dirname(path.resolve(process.env.BOT_CONTEXT_CATALOG_REPORT)),{recursive:true});await writeFile(process.env.BOT_CONTEXT_CATALOG_REPORT,JSON.stringify(report,null,2));}
 console.log(JSON.stringify({...report,rows:undefined}));
}finally{await rm(tmp,{recursive:true,force:true});}
