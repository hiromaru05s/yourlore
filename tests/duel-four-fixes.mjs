import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-duel-four-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0;
 const card=id=>({...C.DB[id]??C.STARTERS[id],uid:'four-'+serial++});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=side=>{const g=C.createGame({mode:'bot',seed:97,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=8;g.pending=null;g.mulligan=null;g.market=[];g.marketStock=[];for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],supply:[],hp:40,mana:8,maxMana:8,brand:0});return g;};
 let monsterShots=0,playerShots=0;
 for(const side of [0,1])for(const id of ['GUNNER','HEAVY_GUNNER'])for(let seed=1;seed<=100;seed++){
  const g=fresh(side);g.rng=seed;g.players[side].field=[mon(id)];g.players[1-side].field=[mon('GOBLIN',{def:1})];
  const r=C.reduce(g,{type:'endTurn'}),shot=r.events.find(e=>e.type==='elementalStart'&&e.id===id);assert.equal(shot.targets.length,1);
  if(shot.targets[0].uid){monsterShots++;assert.equal(r.state.players[1-side].hp,40,'monster impact cannot spill to player');assert(!r.events.some(e=>e.type==='damage'));assert.equal(r.state.players[1-side].field.length,0);}
  else {playerShots++;assert.equal(r.state.players[1-side].hp,40-(id==='GUNNER'?1:2));assert.equal(r.state.players[1-side].field.length,1);}
 }
 assert(monsterShots&&playerShots);
 const enchantId=Object.values(C.DB).find(c=>c.ench==='noAttack').id;
 for(const side of [0,1])for(const difficulty of ['easy','normal','hard','hell']){
  let g=fresh(side);g.players[side].field=[mon('M2')];g.players[side].hand=[card('DISARM1')];g.players[1-side].enchants=[{card:card(enchantId),turns:8,bornTurn:0}];
  const target=g.players[1-side].enchants[0].card.uid;g=C.reduce(g,{type:'play',idx:0}).state;assert.equal(g.pending.reason,'destroyEnch');
  let progress=0;const started=performance.now(),action=C.botDecide(g,difficulty,()=>progress++);
  assert.equal(action.uid,target);assert(performance.now()-started<1000);assert.equal(progress,1,'target choice must not explore a whole future turn');g=C.reduce(g,action).state;assert.equal(g.pending,null);assert.equal(g.players[1-side].enchants.length,0);
 }
 // Safe cancellation still works when no opposing target remains.
 {let g=fresh(1);g.players[1].hand=[card('DISARM1')];g.players[1].enchants=[{card:card(enchantId),turns:8,bornTurn:0}];g=C.reduce(g,{type:'play',idx:0}).state;const a=C.botDecide(g,'hard');assert.equal(a.uid,null);assert.equal(C.reduce(g,a).state.players[1].enchants.length,1);}
 console.log('PASS: 400 cannon target/HP cases and immediate removal/cancellation on both sides, all bot difficulties',{monsterShots,playerShots});
}finally{await rm(dir,{recursive:true,force:true});}
