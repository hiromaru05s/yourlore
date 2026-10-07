import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
const dir = await fs.mkdtemp('/tmp/lore-wording-tests-');
try {
  await build({stdin:{contents:`export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './client/src/shared/cardEffectNotes';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
  const E=await import(dir+'/engine.mjs');
  let seq=0;
  const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:`wording-${++seq}`});
  const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});g.turn=3;g.pending=null;return g;};
  const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1}).state;};
  // These are behavioral discrepancies discovered in the wording audit. Assert
  // actual engine outcomes, not a regex against the same text implementation.
  {let g=fresh();g.players[1].maxMana=4;g=play(g,'AMBUSH');assert.equal(g.players[1].hp,92);assert.equal(g.players[0].hp,97);}
  {let g=fresh();g.players[0].field=[mon('TGE3')];g=play(g,'GENESIS_MAGIC');assert.equal(g.players[0].field[0].atkMod,4);assert.equal(g.players[0].field[0].defMod,4);}
  {for(const empty of [true,false]){let g=fresh();g.players[1].maxMana=10;if(!empty)g.players[0].field=[mon('M1')];g=play(g,'AHEUK');assert.equal(g.players[1].maxMana,empty?8:9);}}
  {let g=fresh();const own=mon('M1'),enemy=mon('M1');own.atk=1;own.def=30;enemy.atk=2;enemy.def=2;g.players[0].field=[own];g.players[1].field=[enemy];g=play(g,'WALLBREAK1');assert(!g.players[0].field.some(m=>m.uid===own.uid),'highest stat sum on either field is automatic');assert(g.players[1].field.some(m=>m.uid===enemy.uid));assert.equal(g.pending,null);}
  {let g=fresh();g.players[0].field=[mon('M1')];g.players[1].field=[mon('M1'),mon('M4')];g=play(g,'DOUBLE_EXEC');assert.equal(g.pending.allowCancel,true);assert.equal(g.pending.data.anySide,true);}
  {let g=fresh();g.players[0].field=[mon('M1')];g.players[0].deck=[card('S1')];g.players[0].discard=[card('S10')];g.players[0].removed=[card('S13')];assert.equal(E.deckComp(g.players[0]).length,3);assert.equal(E.spellDeckHalf(g.players[0]),true);}
  {let g=fresh();g.players[0].field=[mon('M1')];g=play(g,'ANESTHESIA');g=play(g,'M2');assert.equal(g.players[0].field[0].immuneDamageTurn,g.turn);assert.equal(g.players[0].field[1].immuneDamageTurn,undefined);}
  {let g=fresh();g.market[0]=card('QUICK_ATTUNE');g.marketStock[0]=3;g=E.reduce(g,{type:'buyMarket',i:0}).state;assert(g.players[0].removed.some(c=>c.id==='QUICK_ATTUNE'));assert(!g.players[0].hand.some(c=>c.id==='QUICK_ATTUNE'));}
  for(const lang of ['ja','ko','en']) {
    assert(E.cardEffectNotes(E.DB.HEXER4,lang).length,'deck composition must be explained');
    assert(E.cardEffectNotes(E.DB.QUICK_REBIRTH,lang).length>=2,'Rift and Quick lifecycle must be explained');
    assert(E.cardEffectNotes(E.DB.Q_CASTLE,lang).length,'quest progress starts after deployment');
  }
  console.log('PASS card wording: 8 engine scenarios, contextual definitions in 3 languages');
} finally {await fs.rm(dir,{recursive:true,force:true});}
