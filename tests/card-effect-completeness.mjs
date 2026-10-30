import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-effect-completeness-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs');let seq=0,cases=0;
 const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:`complete-${++seq}`});
 const mon=(id,extra={})=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0,...extra});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:Array.from({length:20},()=>card('S10')),discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});g.turn=3;g.pending=null;return g;};
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const check=(name,fn)=>{try{fn();cases++;}catch(e){throw new Error(name,{cause:e});}};
 const requirement=(id,setup,base=()=>{})=>check(`${id}: rejected before payment, accepted with its authored requirement`,()=>{
  const g=fresh();base(g);const c=card(id);g.players[0].hand=[c];
  assert(E.playBlockReason(g,0,c),id);const r=E.reduce(g,{type:'play',idx:0});assert.equal(r.state.players[0].mana,g.players[0].mana);assert.equal(r.state.players[0].hand[0].uid,c.uid);
  setup(g);assert.equal(E.playBlockReason(g,0,c),null,id);
  for(const lang of ['textJa','text','textEn'])assert.match(c[lang],/^【(?:発動条件|발동 조건|Play Requirement)】/);
 });
 for(const id of ['DECAY_CRAFT','KNIGHT_TEACH','NL_SECRET','TRUMPET','ROGUE_ART','MAJESTY_RITE','S15','WALLBREAK1','WALLBREAK2','SNIPE1','SNIPE2'])requirement(id,g=>g.players[0].field=[mon('M1',{atk:1,def:1})]);
 requirement('MIND_BURST',g=>g.players[0].field=[mon('GOLEM1',{guts:1})]);
 requirement('PENANCE',g=>g.players[0].brand=1);
 requirement('GS6_4',g=>g.players[1].brand=1);
 for(const id of ['INCUBATOR','INCUBATOR_S'])requirement(id,g=>g.players[0].field=[mon('DRAGON_EGG',{hatch:1,dur:6})]);
 requirement('VAMP_PACT',g=>g.players[0].field.pop(),g=>g.players[0].field=Array.from({length:7},()=>mon('M1')));
 requirement('INQUISITION',g=>g.players[1].deck.push(card('TGE3')));
 requirement('MASSACRE',g=>g.players[1].field=[mon('M1')]);
 check('A Decay counter does not satisfy Mind Burst; Majesty cannot be granted twice',()=>{let g=fresh();g.players[0].field=[mon('M1',{decayCnt:2,gcount:3})];assert(E.playBlockReason(g,0,card('MIND_BURST')));g.players[0].field=[mon('M1',{passivesG:['majesty']})];assert(E.playBlockReason(g,0,card('MAJESTY_RITE')));});
 check('Guild only accrues on subsequent owner starts, pays immediately at 20',()=>{
  let g=play(fresh(),'GUILD_CO').state;assert.equal(g.players[0].enchants[0].cnt??0,0);assert(E.playBlockReason(g,0,card('GUILD_CO')));
  g=E.reduce(g,{type:'endTurn'}).state;assert.equal(g.players[0].enchants[0].cnt??0,0);
  g=E.reduce(g,{type:'endTurn'}).state;assert.equal(g.players[0].enchants[0].cnt,1);
  g.players[0].enchants[0].cnt=19;g=E.reduce(g,{type:'endTurn'}).state;g=E.reduce(g,{type:'endTurn'}).state;
  assert.equal(g.players[0].enchants[0].cnt,0);assert.equal(g.players[0].hand.filter(c=>c.id==='DARK_MERCHANT').length,1);
 });
 for(const [id,start,gain] of [['MERCH1',18,3],['MERCH2',38,8]])check(`${id}: immediate payout and remainder`,()=>{
  let g=play(fresh(),'GUILD_CO').state;g.players[0].enchants[0].cnt=start;g=play(g,id).state;
  assert.equal(g.players[0].enchants[0].cnt,(start+gain)%20);assert.equal(g.players[0].hand.filter(c=>c.id==='DARK_MERCHANT').length,Math.floor((start+gain)/20));
 });
 check('Slums pays on its die roll without waiting for a turn',()=>{let g=play(fresh(),'GUILD_CO').state;g.players[0].enchants[0].cnt=19;const r=play(g,'SLUM');const roll=r.events.find(e=>e.type==='dice'&&e.source.id==='SLUM').rolls[0];assert.equal(r.state.players[0].enchants[0].cnt,roll-1);assert.equal(r.state.players[0].hand.filter(c=>c.id==='DARK_MERCHANT').length,1);});
 for(const others of [0,1,3])check(`Origin Mimic excludes itself but counts other copies (${others})`,()=>{const g=fresh();g.players[0].discard=Array.from({length:others},()=>card('ORIGIN_MIMIC'));const r=play(g,'ORIGIN_MIMIC');const m=r.state.players[0].field.find(c=>c.id==='ORIGIN_MIMIC');assert.equal(m.atkMod,others*2);assert.equal(m.defMod,others*2);});
 check('Predator excludes enemy Aura from automatic selection',()=>{const g=fresh();g.players[1].field=[mon('M1',{cost:3,atk:30,def:30,passive:['aura']}),mon('M1',{cost:3})];const protectedUid=g.players[1].field[0].uid;g.players[0].maxMana=g.players[0].mana=15;const r=play(g,'TPO5');assert.deepEqual(r.state.players[1].field.map(m=>m.uid),[protectedUid]);assert.equal(r.state.players[0].maxMana,16);});
 check('Stable requires the named Knight, not a Knight-family card',()=>{const g=fresh();g.players[0].field=[mon('ANTIQUE_DK')];assert(E.playBlockReason(g,0,card('STABLE')));g.players[0].field=[mon('INFKNIGHT')];assert.equal(E.playBlockReason(g,0,card('STABLE')),null);});
 check('Wheel rerolls every die in a multi-die cast and retains the allowance when keeping',()=>{let g=fresh();g.players[0].enchants=[{card:card('FATE_WHEEL'),turns:99}];const first=play(g,'LUCKY_CHEST');assert.equal(first.state.pending?.kind,'reroll');const kept=E.reduce(first.state,{type:'pick',uid:null});assert.equal(kept.state.players[0].wheelUsed,false);const rerolled=E.reduce(first.state,{type:'pick',uid:'re'});assert.equal(rerolled.state.players[0].wheelUsed,true);assert.equal(rerolled.events.find(e=>e.type==='dice'&&e.source.id==='LUCKY_CHEST').rolls.length,2);assert.equal(rerolled.state.players[0].uses.LUCKY_CHEST,1);});
 console.log(`PASS ${cases} effect completeness behavior cases`);
}finally{await rm(dir,{recursive:true,force:true});}
