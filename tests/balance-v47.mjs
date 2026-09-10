import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-v47-'));
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export {candidates} from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'core.mjs')});
 const {DB,STARTERS,createGame,reduce,hasPassive,summonReqMet,playCost,candidates,maxManaGrowthBlocked,effMaxMana,BALANCE_VERSION}=await import(path.join(dir,'core.mjs'));
 let seq=0;
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:`v47-${++seq}`});
 const mon=id=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0,attacksUsed:0});
 const fresh=(seed=42)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],exile:[],mana:20,maxMana:20,hp:40,maxHp:100});return g;};
 const step=(g,a)=>reduce(g,a).state;
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 assert.equal(BALANCE_VERSION,'v47');
 for(const [id,atk,def] of [['NGA4',8,1],['TDE1',3,5],['TDE2',5,8],['TDE3',7,11],['TDE4',12,14],['M7',3,1]])assert.deepEqual([DB[id].atk,DB[id].def],[atk,def],id);
 assert(hasPassive(card('TDE4'),'majesty'));assert(hasPassive(card('TDE4'),'aura'));
 assert.equal(playCost(card('ELF_HAVEN'),fresh().players[0]),4);
 // Failed requirements are atomic and agree with the bot's legal actions.
 for(const id of ['TDE1','TDE2','TDE4']){
  let g=fresh();g.players[0].maxMana=4;g.players[0].mana=4;g.players[0].hand=[card(id)];
  assert(!summonReqMet(g.players[0],g.players[0].hand[0],g.players[1]));
  assert(!candidates(g).some(a=>a.type==='play'));const after=step(g,{type:'play',idx:0});assert.equal(after.players[0].mana,4);assert.equal(after.players[0].hand.length,1);
 }
 for(const zone of ['hand','deck','discard','field','removed']){
  let g=fresh();g.players[0].maxMana=5;g.players[0][zone].push(zone==='field'?mon('TDE1'):card('TDE1'));
  assert.equal(summonReqMet(g.players[0],card('TDE4'),g.players[1]),zone!=='removed',zone);
 }
 {const g=fresh();g.players[0].deck=[card('TDE4'),card('DEMON_REALM')];assert(!summonReqMet(g.players[0],card('TDE4'),g.players[1]));}
 {let g=fresh();g.players[0].deck=[card('TDE1')];g=play(g,'TDE4').state;assert.equal(g.players[0].maxMana,3);assert(maxManaGrowthBlocked(g.players[0]));
  g=play(g,'STARTER_MANA').state;assert.equal(g.players[0].maxMana,3);
  // Opponent remains free to grow; removal releases the restriction.
  g.cur=1;g=play(g,'STARTER_MANA').state;assert.equal(g.players[1].maxMana,21);
  g.cur=0;g.players[0].field=[];g.players[0].mana=3;g=play(g,'STARTER_MANA').state;assert.equal(g.players[0].maxMana,4);
 }
 // Return of borrowed mana, spell gain, healing procs, and quest rewards all obey the lock.
 for(const seed of Array.from({length:30},(_,i)=>i+1)){
  let g=fresh(seed);const p=g.players[0];p.field=[mon('TDE4')];p.maxMana=3;p.mana=3;p.manaGainNext=2;p.manaRegain=[{at:g.turn+2,amt:1}];p.enchants=[{card:card('LIFE_CYCLE'),turns:99}];p.quests=[{card:card('Q_MANA'),progress:25},{card:card('Q_WINTER'),progress:10}];
  g=play(g,'STARTER_MANA').state;assert.equal(g.players[0].maxMana,3);g=step(g,{type:'endTurn'});g=step(g,{type:'endTurn'});assert.equal(g.players[0].maxMana,3);
 }
 {const g=fresh(),p=g.players[0];p.maxMana=3;p.field=[mon('TDE4'),mon('M10'),mon('GOLEM2')];p.enchants=[{card:card('MULTI_CULTURE'),turns:99}];assert.equal(effMaxMana(p),3);p.field.shift();assert(effMaxMana(p)>3);}
 // Demon Realm's existing effect suppression also suppresses the King's new effect.
 {let g=fresh();g.players[0].deck=[card('TDE1')];g.players[0].enchants=[{card:card('DEMON_REALM'),turns:99}];g=play(g,'TDE4').state;assert.equal(g.players[0].maxMana,20);assert(!maxManaGrowthBlocked(g.players[0]));}
 // One growth = equal healing, one heal event, one Ghost trigger; no duplicated legacy heal.
 for(const id of ['GRAPE','GRAPE2','WINE','VITAL3']){
  const g=fresh();g.players[1].field=[mon('GHOST')];const out=play(g,id),p=out.state.players[0],gain=p.maxHp-100;
  assert(gain>0,id);assert.equal(p.hp-40,gain,id);assert.equal(out.events.filter(e=>e.type==='heal'&&e.player===0).length,1,id);assert.equal(out.state.players[1].field[0].atkMod,1,id);
 }
 {let g=fresh();g.players[0].enchants=[{card:card('RIFT'),turns:99}];g.players[0].supply[0]=card('QUICK_ATTUNE');const r=reduce(g,{type:'buySupply',i:0});assert.equal(r.state.players[0].maxHp,107);assert.equal(r.state.players[0].hp,47);}
 {let g=fresh();g.players[0].quests=[{card:card('Q_TORI'),progress:5}];g=step(g,{type:'pick',uid:null});assert.equal(g.players[0].maxHp,130);assert.equal(g.players[0].hp,70);}
 {let g=fresh();g.players[0].enchants=[{card:card('WORLD_CARE'),turns:99}];g=step(g,{type:'endTurn'});g=step(g,{type:'endTurn'});assert.equal(g.players[0].maxHp,109);assert.equal(g.players[0].hp,49);}
 // Growth must not roll Cycle of Life once for healing and again for max HP.
 {const g=fresh();g.players[0].enchants=[{card:card('LIFE_CYCLE'),turns:99}];const r=play(g,'GRAPE');assert.equal(r.events.filter(e=>e.type==='dice').length,1);}
 // Each kill may unlock only the second attack, never a third. Turn reset restores availability.
 {let g=fresh();const m=mon('M7');g.players[0].field=[m];g.players[1].field=[mon('MIMIC'),mon('MIMIC'),mon('MIMIC')];
  for(let i=0;i<2;i++){g=step(g,{type:'attack',uid:m.uid});g=step(g,{type:'pick',uid:g.players[1].field[0].uid});}
  assert.equal(g.players[0].field[0].attacksUsed,2);assert(g.players[0].field[0].exhausted);assert.equal(g.players[1].field.length,1);
  const before=structuredClone(g.players[1]);g=step(g,{type:'attack',uid:m.uid,target:g.players[1].field[0].uid});assert.deepEqual(g.players[1],before);
 }
 let hits=0,misses=0;
 for(let seed=1;seed<=50;seed++){
  let g=fresh(seed);g.players[0].field=[mon('M7')];const opponentTurn=reduce(g,{type:'endTurn'});assert(!opponentTurn.events.some(e=>e.type==='dice'));g=opponentTurn.state;
  const r=reduce(g,{type:'endTurn'}),dice=r.events.find(e=>e.type==='dice');assert(dice);const roll=dice.rolls[0];assert.equal(r.state.players[0].hp,roll>=5?37:40);assert.equal(r.state.players[0].field[0].dmg,0);if(roll>=5)hits++;else misses++;
 }
 assert(hits>0&&misses>0);
 // Guard against future un-gated max-mana/max-HP increments outside their helpers.
 const source=await readFile('client/src/shared/engine.ts','utf8');assert.equal((source.match(/\.maxMana\s*\+=/g)||[]).length,1);assert.equal((source.match(/\.maxHp\s*\+=/g)||[]).length,1);
 console.log('PASS: v47 stats/cost, summon gates, mana lock/suppression, growth healing/triggers, Ember limit and recoil');
}finally{await rm(dir,{recursive:true,force:true});}
