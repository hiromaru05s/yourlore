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
  const choose=(g,uid)=>E.reduce(g,{type:'chooseTarget',uid}).state;
  const pick=(g,uid)=>E.reduce(g,{type:'pick',uid}).state;
  let branchCases=0;
  const check=(name,fn)=>{try{fn();branchCases++;}catch(error){throw new Error(name,{cause:error});}};
  check('Recall cannot recover itself; cancel keeps other graveyard cards',()=>{let g=fresh();const other=card('S10');g.players[0].discard=[other];g=play(g,'S8');assert.equal(g.pending.allowCancel,true);const self=g.players[0].discard.find(c=>c.id==='S8');assert.equal(g.pending.data.exclude,self.uid);const beforeInvalid=g;g=choose(g,self.uid);assert(!g.players[0].hand.some(c=>c.uid===self.uid));g=choose(beforeInvalid,null);assert.equal(g.pending,null);assert(g.players[0].discard.some(c=>c.uid===other.uid));});
  check('Seek may finish without taking a card',()=>{let g=fresh();g.players[0].deck=[card('S10')];g=play(g,'S6');g=choose(g,null);assert.equal(g.players[0].deck.length,1);assert.equal(g.players[0].hand.length,0);});
  for(const select of [false,true])check(`Purge Touch: Brand removal unconditional, draw conditional (${select})`,()=>{let g=fresh();const target=card('M1');g.players[0].discard=[target];g.players[0].deck=[card('M2')];g.players[0].brand=3;g=play(g,'PURGE_TOUCH');assert.equal(g.players[0].brand,0);assert.equal(g.players[0].hand.length,0);g=choose(g,select?target.uid:null);assert.equal(g.players[0].hand.length,select?1:0);assert.equal(g.players[0].removed.some(c=>c.uid===target.uid),select);});
  for(const n of [0,1,2,3])check(`Wine Collector with ${n} Wines`,()=>{let g=fresh();g.players[0].hand=Array.from({length:n},()=>card('WINE'));g=play(g,'WINE_COLLECTOR');assert.equal(g.players[0].field.some(c=>c.id==='WINE_COLLECTOR'),n<2);assert.equal(g.players[0].hand.filter(c=>c.id==='DARK_MERCHANT').length,n>=2?1:0);assert.equal(g.players[0].removed.filter(c=>c.id==='WINE').length,n>=2?2:0);assert.equal(g.players[0].hand.filter(c=>c.id==='WINE').length,n>=2?n-2:n);});
  for(const hp of [20,40,50])check(`Hermit always grants the additional 15 HP (${hp})`,()=>{let g=fresh();g.players[0].hp=hp;g=play(g,'HERMIT');assert.equal(g.players[0].hp,Math.max(hp,40)+15);});
  check('Origin Arbiter spends its only check even without other Origin cards',()=>{let g=fresh();g=play(g,'TGE4');assert.equal(g.players[1].brand??0,0);g.players[0].deck=[card('TGE3')];g=play(g,'TGE4');assert.equal(g.players[1].brand??0,0);});
  check('Rally grants Guts to existing and later Soldiers and persists without source',()=>{let g=fresh();g.players[0].field=[mon('SOLDIER2')];g=play(g,'VITAL4');const first=g.players[0].field.find(m=>m.id==='SOLDIER2');assert(E.hasPassive(first,'guts'));assert.equal(first.guts,1);g=play(g,'SOLDIER2');assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2'&&m.guts===1).length,2);const source=g.players[0].field.find(m=>m.id==='VITAL4');g=play(g,'S15');g=choose(g,source.uid);assert(!g.players[0].field.some(m=>m.uid===source.uid));assert(g.players[0].field.filter(m=>m.id==='SOLDIER2').every(m=>E.hasPassive(m,'guts')&&m.guts===1));});
  check('Egg Master increases durability, never the hatch countdown',()=>{let g=fresh();g.players[0].field=[{...mon('DRAGON_EGG'),hatch:5,dur:6}];g=play(g,'EGG_MASTER');assert.equal(g.players[0].field[0].dur,11);assert.equal(g.players[0].field[0].hatch,5);});
  check('Mind Burst removes only Guts counters',()=>{let g=fresh();g.players[0].field=[{...mon('GOLEM1'),guts:2,decayCnt:1,gcount:3}];g=play(g,'MIND_BURST');const m=g.players[0].field[0];assert.equal(m.guts,0);assert.equal(m.decayCnt,1);assert.equal(m.gcount,3);assert.equal(g.players[1].hp,92);});
  check('High Elf finishing inspection immediately still breaks Shield and doubles Dew',()=>{let g=fresh();g.players[0].dew=10;g.players[1].shield=7;g.players[1].hand=[card('M1')];g=play(g,'HIGH_ELF');assert.equal(g.pending.reason,'HIGH_ELF_HAND');g=pick(g,'done');assert.equal(g.players[1].hand.length,1);assert.equal(g.players[1].shield,0);assert.equal(g.players[0].dew,20);});
  for(const protectedVamp of [false,true])check(`Blood Secret rewards only actual destruction (${protectedVamp})`,()=>{let g=fresh();g.players[0].maxMana=10;g.players[0].field=[mon('VAMP5')];if(protectedVamp)g.players[0].enchants=[{card:card('VAMP_WARD'),turns:99,bornTurn:1}];g=play(g,'BLOOD_SECRET');assert.equal(g.players[0].hp,protectedVamp?91:101);assert.equal(g.players[0].maxMana,protectedVamp?10:13);});
  for(const lang of ['ja','ko','en']) {
    assert(E.cardEffectNotes(E.DB.HEXER4,lang).length,'deck composition must be explained');
    assert(E.cardEffectNotes(E.DB.QUICK_REBIRTH,lang).length>=2,'Rift and Quick lifecycle must be explained');
    assert(E.cardEffectNotes(E.DB.Q_CASTLE,lang).length,'quest progress starts after deployment');
  }
  console.log(`PASS card wording: 8 original scenarios + ${branchCases} boundary/choice/dependency scenarios; contextual definitions in 3 languages`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
