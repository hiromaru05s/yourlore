import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';

const dir=await mkdtemp('/tmp/lore-balance-v73-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/cardRuleGlossary';export * from './client/src/shared/cardReferences';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const E=await import(dir+'/core.mjs');let seq=0,checks=0;
 const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'v73-'+(++seq)});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,maxMana:30,mana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});return g;};
 const cast=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const play=(g,id)=>cast(g,id).state;
 const end=g=>E.reduce(g,{type:'endTurn'}).state;
 const count=(g,owner,id)=>g.players[owner].discard.filter(c=>c.id===id).length;
 const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};

 test('approved costs, Mercenary body and existing summon effect',()=>{
  assert(Number(E.BALANCE_VERSION.slice(1))>=73);
  assert.equal(E.DB.SCARECROW.cost,1);assert.equal(E.DB.WINE_COLLECTOR.cost,1);
  let g=play(fresh(),'SCARECROW');assert.equal(g.players[0].field.filter(m=>m.id==='TOKEN00').length,3);
  g=play(fresh(),'MERCENARY');const m=g.players[0].field.find(m=>m.id==='MERCENARY');
  assert.equal(E.effAtk(g.players[0],m,g),1);assert.equal(E.curHp(g.players[0],m),1);
  assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,1);
 });
 test('Recluse blocks hand and token summons until four total turns have elapsed',()=>{
  let g=play(fresh(),'TSO1');assert.equal(g.players[0].summonLockUntil,7);
  assert(E.playBlockReason(g,0,card('M1')));
  g=play(g,'SCARECROW');assert.equal(g.players[0].field.length,1);
  g=end(end(g));assert.equal(g.turn,5);assert(E.playBlockReason(g,0,card('M1')));
  g=end(end(g));assert.equal(g.turn,7);assert.equal(E.playBlockReason(g,0,card('M1')),null);
  g=play(g,'M1');assert(g.players[0].field.some(m=>m.id==='M1'));
 });
 test('Elite Commander summons one Soldier at nine cards, none at ten, respecting capacity',()=>{
  for(const [size,expected] of [[9,1],[10,0]]){let g=fresh();g.players[0].deck=Array.from({length:size-1},()=>card('STARTER_TRASH'));g=play(g,'ELITE');assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,expected);}
  let g=fresh();g.players[0].field=Array.from({length:6},()=>mon('M1'));g=play(g,'ELITE');assert.equal(g.players[0].field.length,7);assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,0);
 });
 test('Wine Collector rewards the Grape user on either side, once per collector and use',()=>{
  for(const user of [0,1])for(const owner of [0,1])for(const copies of [1,2]){
   let g=fresh();g.cur=user;g.players[owner].field=Array.from({length:copies},()=>mon('WINE_COLLECTOR'));
   const r=cast(g,'GRAPE');g=r.state;assert.equal(r.events.filter(e=>e.type==='monsterActivate'&&e.player===owner&&g.players[owner].field.some(m=>m.uid===e.uid&&m.id==='WINE_COLLECTOR')).length,copies);assert.equal(count(g,user,'GRAPE2'),copies);assert.equal(count(g,1-user,'GRAPE2'),0);
   g=play(g,'GRAPE');assert.equal(count(g,user,'GRAPE2'),copies*2);
   assert.equal(new Set(g.players[user].discard.filter(c=>c.id==='GRAPE2').map(c=>c.uid)).size,copies*2);
  }
 });
 test('Wine Collector has no old exchange; both fields stack; other fruit and Wine do not trigger',()=>{
  let g=fresh();g.players[0].hand=[card('WINE'),card('WINE')];g=play(g,'WINE_COLLECTOR');
  assert.equal(g.players[0].hand.filter(c=>c.id==='WINE').length,2);assert.equal(g.players[0].removed.length,0);assert(g.players[0].field.some(c=>c.id==='WINE_COLLECTOR'));
  g.players[1].field=[mon('WINE_COLLECTOR')];g=play(g,'GRAPE');assert.equal(count(g,0,'GRAPE2'),2);
  for(const id of ['GRAPE2','WINE','APPLE']){const before=count(g,0,'GRAPE2');g.players[0].deck=Array.from({length:10},()=>card('STARTER_TRASH'));g=play(g,id);assert.equal(count(g,0,'GRAPE2'),before+(id==='GRAPE2'?1:0));}
 });
 test('Wine Collector stops on leaving the field or losing its effect; sealed plays do not trigger',()=>{
  let g=fresh();g.players[0].field=[mon('WINE_COLLECTOR',{aura:undefined})];g.players[1].discard=[card('WINE_COLLECTOR')];g=play(g,'GRAPE');assert.equal(count(g,0,'GRAPE2'),0);
  g=fresh();g.players[0].field=[mon('WINE_COLLECTOR')];g.players[0].spellSealTurn=true;g=play(g,'GRAPE');assert.equal(count(g,0,'GRAPE2'),0);
  g=fresh();g.players[0].field=[mon('WINE_COLLECTOR')];g=play(g,'GRAPE');g.players[0].field=[];g=play(g,'GRAPE');assert.equal(count(g,0,'GRAPE2'),1);
 });
 test('Grape use still triggers when negated, while Rune Echo is only one use',()=>{
  let g=fresh();g.players[0].field=[mon('WINE_COLLECTOR')];g.players[1].traps=[{card:{...card('S1'),react:'nullspell',val:0,val2:0}}];
  g=play(g,'GRAPE');assert.equal(g.players[0].hp,100);assert.equal(count(g,0,'GRAPE2'),1);
  g=fresh();g.players[0].field=[mon('WINE_COLLECTOR')];g.players[0].enchants=[{card:{...card('S1'),ench:'runeEcho'},turns:99}];
  g=play(g,'GRAPE');assert.equal(g.players[0].hp,104);assert.equal(count(g,0,'GRAPE2'),1);
 });
 test('Predator uses current HP including damage, buffs and debuffs; ties preserve field order',()=>{
  for(const [first,second,removed] of [
   [{atk:3,def:10,dmg:9},{atk:3,def:5},1],
   [{atk:3,def:2,defMod:8},{atk:3,def:5},0],
   [{atk:3,def:10,defMod:-8},{atk:3,def:5},1],
   [{atk:3,def:2,defMod:4,dmg:1},{atk:3,def:5},0],
  ]){
   let g=fresh();g.players[0].mana=g.players[0].maxMana=10;
   g.players[1].field=[mon('M1',{cost:3,...first}),mon('M1',{cost:4,...second})];
   const ids=g.players[1].field.map(m=>m.uid);g=play(g,'TPO5');assert(!g.players[1].field.some(m=>m.uid===ids[removed]));assert(g.players[1].field.some(m=>m.uid===ids[1-removed]));assert.equal(g.players[0].maxMana,11);
  }
 });
 test('Predator still excludes Aura and purchase costs outside 3–4',()=>{
  let g=fresh();g.players[1].field=[mon('M1',{cost:3,atk:30,def:30,passive:['aura']}),mon('M1',{cost:2,atk:30,def:30}),mon('M1',{cost:5,atk:30,def:30}),mon('M1',{cost:4})];
  const eligible=g.players[1].field.at(-1).uid;g=play(g,'TPO5');assert.equal(g.players[1].field.length,3);assert(!g.players[1].field.some(m=>m.uid===eligible));
 });
 test('all current card text and glossary retire printed HP; Collector links its new cards',()=>{
  for(const c of Object.values(E.DB))for(const key of ['text','textJa','textEn'])assert(!/印刷体力|인쇄\s*체력|printed\s*(?:HP|health)/i.test(c[key]),c.id+key);
  assert(!E.CARD_RULE_GLOSSARY.some(e=>e.id==='printedHp'));
  assert(E.cardRelations('WINE_COLLECTOR').references.includes('GRAPE'));
  assert.deepEqual(E.cardRelations('WINE_COLLECTOR').generated,['GRAPE2']);
  assert(!E.cardRelations('WINE_COLLECTOR').references.includes('DARK_MERCHANT'));
 });
 console.log(`PASS ${checks} v73 balance scenario groups`);
}finally{await rm(dir,{recursive:true,force:true});}
