import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-balance-caps-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/protocol';export * from './client/src/shared/botActions';export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs'); const {DB,STARTERS,createGame,reduce,playCost,playBlockReason,effAtk,botActions}=E;
 let seq=0,checks=0;
 const card=id=>({...structuredClone(DB[id]||STARTERS[id]),uid:'cap-'+(++seq)});
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=(seed=41)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0,dew:0,shield:0});g.turn=3;g.pending=null;return g;};
 const step=(g,a)=>reduce(g,a).state;
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const buy=g=>{g.market[0]=card('QUICK_GRIMOIRE');g.marketStock[0]=3;return step(g,{type:'buyMarket',i:0});};
 const end=g=>step(g,{type:'endTurn'});
 const ench=id=>({card:card(id),turns:99,bornTurn:0});
 const test=(name,fn)=>{try{fn();checks++;console.log('PASS',name);}catch(e){console.error('FAIL',name);throw e;}};
 test('Raider rejects duplicate before payment; enemy may control one; BOT follows the same rule',()=>{
  let g=play(fresh(),'GOBLIN_RAIDER');const uid=g.players[0].field[0].uid;g.players[0].hand=[card('GOBLIN_RAIDER')];const mana=g.players[0].mana;
  assert(playBlockReason(g,0,g.players[0].hand[0]));assert(!botActions(g).some(a=>a.type==='play'));
  g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,mana);assert.equal(g.players[0].hand.length,1);assert.equal(g.players[0].field[0].uid,uid);
  g=end(g);g=play(g,'GOBLIN_RAIDER');assert.deepEqual(g.players.map(p=>p.field.length),[1,1]);
 });
 test('Raider expires after opponent end, even with Guts/Aura; own turn does not expire it',()=>{
  let g=play(fresh(),'GOBLIN_RAIDER');const uid=g.players[0].field[0].uid;g.players[0].field[0].passivesG=['guts','aura'];g.players[0].field[0].guts=10;
  g=end(g);assert.equal(g.players[0].field.length,1);g=JSON.parse(JSON.stringify(g));g=end(g);
  assert.equal(g.players[0].field.length,0);assert(g.players[0].discard.some(c=>c.uid===uid)||g.players[0].hand.some(c=>c.uid===uid));
  assert.equal(playBlockReason(g,0,card('GOBLIN_RAIDER')),null);
 });
 test('Raider expires across a skipped opponent turn',()=>{let g=play(fresh(),'GOBLIN_RAIDER');g=play(g,'DOMINION');g=end(g);assert.equal(g.cur,0);assert.equal(g.turn,5);assert.equal(g.players[0].field.length,0);});
 test('Revival cannot bypass uniqueness or consume the graveyard monster; successful revival receives the deadline',()=>{
  let g=play(fresh(),'GOBLIN_RAIDER');const dead=card('GOBLIN_RAIDER');g.players[0].discard=[dead];
  const revive=x=>{x.market[0]=card('QUICK_REBIRTH');x.marketStock[0]=3;x=step(x,{type:'buyMarket',i:0});return step(x,{type:'pick',uid:dead.uid});};
  g=revive(g);assert.equal(g.players[0].field.length,1);assert(g.players[0].discard.some(c=>c.uid===dead.uid));
  g.players[0].field=[];g=revive(g);assert.equal(g.players[0].field[0].expireOpponentOf,0);g=end(end(g));assert.equal(g.players[0].field.length,0);assert(g.players[0].removed.some(c=>c.uid===dead.uid));
 });
 test('Scavenger copies respect uniqueness; an opponent-turn summon survives that turn and expires next opponent end',()=>{
  for(const existing of [false,true]){let seen=false;for(let seed=1;seed<100&&!seen;seed++){let g=fresh(seed);g.players[1].field=[mon('TPO3'),...(existing?[mon('GOBLIN_RAIDER')]:[])];g.players[0].field=[mon('GOBLIN_RAIDER')];const uid=g.players[0].field[0].uid;g=play(g,'S15');const r=reduce(g,{type:'pick',uid});const die=r.events.find(e=>e.type==='dice'&&e.source.id==='TPO3');if(die.rolls[0]<5)continue;seen=true;g=r.state;
   assert.equal(g.players[1].field.filter(m=>m.id==='GOBLIN_RAIDER').length,1);
   if(!existing){const copy=g.players[1].field.find(m=>m.id==='GOBLIN_RAIDER');assert.equal(copy.expireOpponentOf,1);g=end(g);assert(g.players[1].field.some(m=>m.uid===copy.uid));g=end(end(g));assert(!g.players[1].field.some(m=>m.uid===copy.uid));}
  }assert(seen);}
 });
 test('Legacy steal trap cannot put a second Raider on the receiving field',()=>{let g=play(fresh(),'GOBLIN_RAIDER');g.players[1].field=[mon('GOBLIN_RAIDER')];g.players[1].traps=[{card:{...card('COUNTERCALC'),t:'trap',react:'slaughterRaise',val:100}}];const uid=g.players[0].field[0].uid;g=step(g,{type:'attack',uid});g=step(g,{type:'chooseTarget',uid:null});assert.equal(g.players[1].field.filter(m=>m.id==='GOBLIN_RAIDER').length,1);});
 test('Grimoire has exactly five discounts; sixth draw costs mana and zero-cost spells consume a charge',()=>{
  let g=buy(fresh());g.players[0].hand=[card('S10')];g.players[0].deck=[];g.players[0].discard=[];const mana=g.players[0].mana;
  for(let i=0;i<5;i++){assert.equal(playCost(g.players[0].hand[0],g.players[0]),0);g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,mana);}
  assert.equal(playCost(g.players[0].hand[0],g.players[0]),1);g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,mana-1);
  g=buy(fresh());g=play(g,'DOMINION');assert.deepEqual(g.players[0].spellDiscountCharges,[4]);
 });
 test('Multiple purchases have independent five-use lifetimes and reset at end of turn',()=>{
  let g=buy(fresh());g=play(g,'S10');g=buy(g);assert.deepEqual(g.players[0].spellDiscountCharges,[4,5]);assert.equal(playCost(card('S15'),g.players[0]),Math.max(0,(DB.S15.play??DB.S15.cost)-2));
  for(let i=0;i<4;i++)g=play(g,'S10');assert.deepEqual(g.players[0].spellDiscountCharges,[1]);g=end(g);assert.equal(g.players[0].spellDiscountTurn,0);assert.deepEqual(g.players[0].spellDiscountCharges,[]);
 });
 test('Rejected actions and non-spells do not consume discounts; JSON and legacy saves remain bounded',()=>{
  let g=buy(fresh());g.players[0].field=[mon('GOBLIN_RAIDER')];g.players[0].hand=[card('GOBLIN_RAIDER')];g=step(g,{type:'play',idx:0});assert.deepEqual(g.players[0].spellDiscountCharges,[5]);g=play(g,'GOBLIN');assert.deepEqual(g.players[0].spellDiscountCharges,[5]);
  g=play(JSON.parse(JSON.stringify(g)),'S10');assert.deepEqual(g.players[0].spellDiscountCharges,[4]);
  g=fresh();delete g.players[0].spellDiscountCharges;g.players[0].spellDiscountTurn=1;g=play(g,'S10');assert.deepEqual(g.players[0].spellDiscountCharges,[4]);
 });
 test('Legacy reaction: fifth discounted spell is countered at its paid cost and consumes its charge',()=>{
  let g=buy(fresh());g.players[0].spellDiscountCharges=[1];g.players[1].traps=[{card:{...card('COUNTERCALC'),t:'trap',react:'nullspell',cap:0}}];g.players[0].hand=[card('S10')];g=step(g,{type:'play',idx:0});assert.equal(g.players[1].traps.length,0);assert.equal(g.players[0].hand.length,0);assert.deepEqual(g.players[0].spellDiscountCharges,[]);
 });
 test('Dominion self-redraw stops at three, queue stays one, fourth use changes nothing',()=>{
  let g=fresh();g.players[0].hand=[card('DOMINION'),card('STARTER_MANA')];for(let i=0;i<3;i++){g=step(g,{type:'play',idx:g.players[0].hand.findIndex(c=>c.id==='DOMINION')});assert.equal(g.players[1].skipTurns,1);}
  assert.equal(g.players[0].uses.DOMINION,3);const c=g.players[0].hand.find(c=>c.id==='DOMINION');assert(playBlockReason(g,0,c));const before=JSON.stringify(g.players);g=step(g,{type:'play',idx:g.players[0].hand.indexOf(c)});assert.equal(JSON.stringify(g.players),before);
  assert(!botActions(g).some(a=>a.type==='play'&&g.players[0].hand[a.idx].id==='DOMINION'));
 });
 test('Dominion limit is per player across turns and JSON saves, including negations and legacy copies',()=>{
  let g=fresh();for(let i=0;i<3;i++){g.players[1].traps=[{card:{...card('COUNTERCALC'),t:'trap',react:'nullspell',cap:0}}];g=play(g,'DOMINION');}
  assert.equal(g.players[0].uses.DOMINION,3);assert.equal(g.players[1].skipTurns??0,0);g=end(g);g=JSON.parse(JSON.stringify(g));g=play(g,'DOMINION');assert.equal(g.players[1].uses.DOMINION,1);g=end(g);assert.equal(g.cur,1);g=end(g);assert.equal(g.cur,0);
  const old=card('DOMINION');delete old.maxUsesPerGame;assert(playBlockReason(g,0,old));assert.equal(g.players[0].uses.DOMINION,3);
 });
 test('Dominion preserves other skip sources and can reserve again after consumption',()=>{let g=fresh();g.players[1].skipTurns=1;g.players[1].skipTurnSources=['TIMEWARP'];g=play(g,'DOMINION');g=play(g,'DOMINION');assert.deepEqual(g.players[1].skipTurnSources,['TIMEWARP','DOMINION']);g=end(end(g));assert.equal(g.players[1].skipTurns,0);g=play(g,'DOMINION');assert.equal(g.players[1].skipTurns,1);assert.equal(g.players[0].uses.DOMINION,3);});
 test('Rune echo does not duplicate the Dominion skip reservation',()=>{let g=fresh();const echo=Object.values(DB).find(c=>c.ench==='runeEcho');g.players[0].enchants=[ench(echo.id)];g=play(g,'DOMINION');assert.equal(g.players[0].uses.DOMINION,1);assert.equal(g.players[1].skipTurns,1);});
 test('Rust rolls 1–3 to grave, 4–6 to Rift plus 3 self damage (all six boundaries)',()=>{
  const seen=new Set();for(let seed=1;seed<1000&&seen.size<6;seed++){let g=fresh(seed);const m=mon('RUST_SHROOM');g.players[0].field=[m];g=play(g,'S15');const r=reduce(g,{type:'pick',uid:m.uid});const die=r.events.find(e=>e.type==='dice'&&e.source.id==='RUST_SHROOM');assert(die);const n=die.rolls[0],ok=n>=4;seen.add(n);assert.equal(r.state.players[0].hp,ok?97:100);assert.equal(r.state.players[0].removed.some(c=>c.uid===m.uid),ok);assert.equal(r.state.players[0].discard.some(c=>c.uid===m.uid),!ok);}assert.equal(seen.size,6);
 });
 console.log(`PASS ${checks} balance cap scenario groups`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
