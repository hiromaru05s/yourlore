import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const dir=await fs.mkdtemp('/tmp/lore-fate-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {DB,STARTERS,createGame,reduce,redactFor}=await import(dir+'/engine.mjs');
 let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'wheel-qa-'+ ++seq});
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=(seed=41)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.phase='main';g.pending=null;for(const p of g.players)Object.assign(p,{hp:200,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[]});g.players[0].enchants.push({card:card('FATE_WHEEL'),turns:99,bornTurn:1});return g;};
 const play=(g,id)=>{g.players[0].hand.push(card(id));return reduce(g,{type:'play',idx:g.players[0].hand.length-1});};
 const dice=r=>r.events.filter(e=>e.type==='dice');
 const keep=r=>reduce(r.state,{type:'pick',uid:null});
 const re=r=>reduce(r.state,{type:'pick',uid:'re'});
 for(const id of ['STARTER_CHEST','S1','LUCKY_CHEST','GUILD_CHEST','DUNGEON_FLOOR']){
  const g=fresh();g.players[0].hand=[card(id)];const original=structuredClone(g);
  const first=reduce(g,{type:'play',idx:0});assert(dice(first).length,id);assert.equal(first.state.pending?.kind,'reroll',id);assert.deepEqual(g,original,'pure reducer');
  const kept=keep(first);assert.equal(kept.state.pending,null);assert.equal(kept.state._wheelSnap,null);assert.equal(kept.state.players[0].wheelUsed,false);assert.deepEqual(kept.state.players,first.state.players,'keep does not repeat rewards');assert.equal(dice(kept).length,0);
  const again=re(first);assert(dice(again).length,id);assert.equal(again.state.players[0].wheelUsed,true);assert.notEqual(again.state.pending?.kind,'reroll');assert.equal(again.state._wheelSnap,null);
  const expected=structuredClone(original);expected.rng=(expected.rng+0x9e3779b9)>>>0;expected.players[0].wheelUsed=true;
  assert.deepEqual(again.state,reduce(expected,{type:'play',idx:0}).state,'one replay: no duplicated mana, HP, cards, summons');
  const second=play(again.state,'STARTER_CHEST');assert.notEqual(second.state.pending?.kind,'reroll','once per turn');
  for(const side of [0,1]){const redacted=redactFor(first.state,side);assert.equal(redacted._wheelSnap,null);assert.equal(redacted.rng,0);}assert(first.state._wheelSnap,'redaction does not mutate authority');
 }
 // No die, no prompt, even for entries left in the legacy RANDOM_CARDS list.
 for(const id of ['NO_PAIN','FIRE_ARROW','STARTER_MANA'])assert.notEqual(play(fresh(),id).state.pending?.kind,'reroll',id);
 {const g=fresh();g.players[0].enchants=[];assert.equal(play(g,'STARTER_CHEST').state.pending,null);}
 // A summon-time dice effect also uses the actual roll, with no manual ID list.
 {const g=fresh();g.players[0].deck=Array.from({length:8},()=>card('S1'));const r=play(g,'HEXER1');assert(dice(r).length);assert.equal(r.state.pending?.kind,'reroll');assert.equal(re(r).state.players[0].field.length,1);}
 // A choice can produce dice and THEN another required choice. Preserve/resume it.
 {const g=fresh();const m=mon('LEGEND_GAMBLER');g.players[0].field=[m];g.pending={kind:'giantShop',reason:'gamblerGuess',allowCancel:false,hint:'guess',hintJa:'予測',data:{uid:m.uid}};
  const r=reduce(g,{type:'pick',uid:'2'});assert.equal(r.state.pending.kind,'reroll');assert.equal(r.state._wheelSnap.outcome.pending?.reason,'gamblerPick');assert.equal(keep(r).state.pending?.reason,'gamblerPick');assert.equal(re(r).state.players[0].wheelUsed,true);assert.notEqual(re(r).state.pending?.kind,'reroll');}
 // Casino and quest counters are counted only for the accepted roll, including on replay.
 {const g=fresh();const c=mon('CASINO');c.gcount=0;g.players[0].field=[c];const r=play(g,'STARTER_CHEST');assert.equal(r.state.players[0].field[0].gcount,1);assert.equal(keep(r).state.players[0].field[0].gcount,1);assert.equal(re(r).state.players[0].field[0].gcount,1);}
 // Lethal first results can be rerolled before the room settles the match.
 {let lethal;for(let seed=1;seed<100&&!lethal;seed++){const g=fresh(seed);g.players[0].hp=1;g.players[0].hand=[card('GUILD_CHEST')];const r=reduce(g,{type:'play',idx:0});if(r.state._wheelSnap?.outcome.over)lethal=r;}
  assert(lethal);assert.equal(lethal.state.over,false);assert.equal(lethal.events.some(e=>e.type==='win'),false);assert.equal(keep(lethal).state.over,true);assert.equal(keep(lethal).events.filter(e=>e.type==='win').length,1);assert(dice(re(lethal)).length);}
 // Invalid choices cannot consume the window; a persisted legacy idx snapshot still replays.
 {const r=play(fresh(),'S1');assert.deepEqual(reduce(r.state,{type:'pick',uid:'forged'}).state,r.state);r.state._wheelSnap.idx=r.state._wheelSnap.action.idx;delete r.state._wheelSnap.action;delete r.state._wheelSnap.outcome;assert.equal(re(r).state.players[0].wheelUsed,true);}
 // Accepting a result leaves the allowance for a later card; next own turn resets it.
 {let r=keep(play(fresh(),'STARTER_CHEST'));r=play(r.state,'STARTER_CHEST');assert.equal(r.state.pending?.kind,'reroll');let g=re(r).state;g.players.forEach(p=>p.hand=[]);g=reduce(g,{type:'endTurn'}).state;g=reduce(g,{type:'endTurn'}).state;assert.equal(g.players[0].wheelUsed,false);assert.equal(play(g,'STARTER_CHEST').state.pending?.kind,'reroll');}
 console.log('PASS Fate Wheel: starters/spells/summon dice, choice continuation, no-roll suppression, keep/replay accounting, once per turn, lethal deferral, redaction, legacy rooms');
}finally{await fs.rm(dir,{recursive:true,force:true});}
