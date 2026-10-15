import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-v58-');
try {
  await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/protocol';export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/game.mjs'});
  const E=await import(dir+'/game.mjs');let seq=0,checks=0;
  const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:`v58-${++seq}`});
  const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const fresh=(owner=0,seed=41)=>{const g=E.createGame({mode:'online',seed,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=5;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],dew:0,shield:0,brand:0,uses:{},usesTurn:{},playsTurn:0});return g;};
  const step=(g,a)=>E.reduce(g,a).state,end=g=>step(g,{type:'endTurn'}),pick=(g,uid)=>step(g,{type:'pick',uid});
  const play=(g,id)=>{g.players[g.cur].mana=30;g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
  const ench=id=>({card:card(id),turns:E.DB[id].val??99,bornTurn:0});
  const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};
  test('approved stats, retained keyword passives and starter eligibility',()=>{
    assert.equal(E.BALANCE_VERSION,'v58');
    for(const [id,atk,hp] of [['ELF',12,10],['HIGH_ELF',20,20],['ELDER_ELF_KING',8,14],['DARK_ELF',16,10],['WORLD_TREE',1,25]])assert.deepEqual([E.DB[id].atk,E.DB[id].def],[atk,hp]);
    assert(E.hasPassive(E.DB.ELF,'evade'));for(const k of ['aura','majesty','evade'])assert(E.hasPassive(E.DB.HIGH_ELF,k));for(const k of ['aura','majesty'])assert(E.hasPassive(E.DB.ELDER_ELF_KING,k));assert(E.hasPassive(E.DB.WORLD_TREE,'guts'));assert(!E.hasPassive(E.DB.WORLD_TREE,'aura'));
    assert(E.DECK_POOL.includes('NIGHT_CASTLE_GIFT'));assert(!E.BUYABLE_POOL.includes('NIGHT_CASTLE_GIFT'));assert.equal(E.DB.NIGHT_CASTLE_GIFT.cost,4);assert.equal(E.DB.NIGHT_CASTLE_GIFT.ench,'nightCastleGift');
    for(const id of ['DRY_SCOUT','DRY_WARD','VAMP_INVITE','NIGHT_GUIDE','BLOOD_PULSE'])assert(!E.DB[id]);
    assert.equal(E.sanitizeDeck(['NIGHT_CASTLE_GIFT',...Array(7).fill('STARTER_TRASH')])[0],'NIGHT_CASTLE_GIFT');
  });
  for(const [id,cost] of [['ELF',4],['HIGH_ELF',10],['ELDER_ELF_KING',12],['WORLD_TREE',8]])test(id+' spends Dew exactly on ordinary summon',()=>{let g=fresh();g.players[0].dew=cost+3;g=play(g,id);if(g.pending)g=pick(g,'done');assert.equal(g.players[0].dew,3);assert(g.players[0].field.some(m=>m.id===id));});
  test('World Tree duplication no longer multiplies healing; Elf multipliers remain',()=>{let g=fresh();g.players[0].dew=10;g.players[0].field=['ELF','ELF','WORLD_TREE','WORLD_TREE'].map(mon);g=end(end(g));assert.equal(g.players[0].hp,180);assert.equal(g.players[0].dew,16);});
  test('all three distinct-World-Tree stat passives remain',()=>{for(const [id,n]of [['ELF',1],['HIGH_ELF',2],['ELDER_ELF_KING',4]]){const g=fresh(),m=mon(id);g.players[0].field=[m];g.players[0].enchants=[ench('WORLD_CARE'),ench('WORLD_CARE'),ench('WORLD_HEART')];assert.equal(E.effAtk(g.players[0],m,g),m.atk+2*n);assert.equal(E.curHp(g.players[0],m),m.def+2*n);}});
  test('Elder wipes monsters but preserves enchantments, quests and legacy traps',()=>{let g=fresh();g.players[0].dew=12;g.players[1].field=[mon('M1')];g.players[1].enchants=[ench('WORLD_CARE')];g.players[1].quests=[{card:card('Q_CASTLE'),progress:0,startedTurn:0}];g.players[1].traps=[{card:{...card('M1'),t:'trap'}}];g=play(g,'ELDER_ELF_KING');assert.equal(g.players[1].field.length,0);for(const zone of ['enchants','quests','traps'])assert.equal(g.players[1][zone].length,1);});
  for(const dew of [14,15,22])test('Elder death threshold '+dew,()=>{let g=fresh();g.players[1].field=[mon('ELDER_ELF_KING')];g.players[1].field[0].passive=[];g.players[1].dew=dew;g=play(g,'S15');g=pick(g,g.players[1].field[0].uid);assert.equal(g.players[0].hp,dew>=15?80:100);assert.equal(g.players[1].dew,dew>=15?dew-15:dew);});
  for(const owner of [0,1])for(const reward of ['VAMP_PACT','VAMP_WARD'])test(`Gift owner ${owner}, chosen ${reward}, 4 subsequent own starts`,()=>{
    let g=play(fresh(owner),'NIGHT_CASTLE_GIFT');const uid=g.players[owner].enchants[0].card.uid;assert.equal(g.players[owner].mana,26);
    for(let n=1;n<=4;n++){g=end(g);assert.equal(g.pending,null);assert.equal(g.players[owner].enchants[0].turns,5-n);g=end(g);assert.equal(g.players[owner].enchants[0].turns,4-n);if(n<4)assert.equal(g.pending,null);}
    assert.equal(g.pending.reason,'NIGHT_CASTLE_GIFT');assert.equal(g.pending.owner,owner);assert.deepEqual(E.effectChoices(g).map(c=>c.id),['VAMP_PACT','VAMP_WARD']);
    g=pick(g,'bogus');assert(g.pending);g=pick(g,null);assert(g.pending);g=pick(g,reward);assert.equal(g.pending,null);
    assert.equal(g.players[owner].hand.filter(c=>c.id===reward).length,1);assert.equal(g.players[owner].enchants.length,0);assert(g.players[owner].discard.some(c=>c.uid===uid));assert.equal(E.redactFor(g,1-owner).players[owner].hand.filter(c=>c.id===reward).length,0);
    for(let n=0;n<10;n++)g=end(g);assert.equal(g.pending,null);const p=g.players[owner];assert.equal([...p.hand,...p.deck,...p.discard].filter(c=>c.id===reward).length,1);
  });
  test('simultaneous Gift expiries retain both choices and distinct reward instances',()=>{let g=play(play(fresh(),'NIGHT_CASTLE_GIFT'),'NIGHT_CASTLE_GIFT');for(let i=0;i<8;i++)g=end(g);assert.equal(g.pending.reason,'NIGHT_CASTLE_GIFT');g=pick(g,'VAMP_PACT');assert.equal(g.pending.reason,'NIGHT_CASTLE_GIFT');g=pick(g,'VAMP_PACT');assert.equal(g.pending,null);assert.equal(g.players[0].hand.filter(c=>c.id==='VAMP_PACT').length,2);assert.equal(new Set(g.players[0].hand.map(c=>c.uid)).size,g.players[0].hand.length);assert.equal(g.players[0].enchants.length,0);});
  test('destroying Gift before maturity prevents the reward',()=>{let g=play(fresh(),'NIGHT_CASTLE_GIFT');g=end(g);g=play(g,'DISARM1');g=step(g,{type:'chooseTarget',uid:g.players[0].enchants[0].card.uid});assert.equal(g.players[0].enchants.length,0);for(let i=0;i<10;i++)g=end(g);assert.equal(g.pending,null);assert(![...g.players[0].hand,...g.players[0].deck,...g.players[0].discard].some(c=>['VAMP_PACT','VAMP_WARD'].includes(c.id)));});
  test('recast Gift starts a fresh four-turn countdown',()=>{let g=play(fresh(),'NIGHT_CASTLE_GIFT');for(let i=0;i<8;i++)g=end(g);g=pick(g,'VAMP_PACT');const p=g.players[0],i=p.discard.findIndex(c=>c.id==='NIGHT_CASTLE_GIFT');p.hand=[p.discard.splice(i,1)[0]];p.mana=4;g=step(g,{type:'play',idx:0});assert.equal(g.players[0].enchants[0].turns,4);g=end(end(g));assert.equal(g.players[0].enchants[0].turns,3);assert.equal(g.pending,null);});
  for(const vamp of [false,true])test('BOT reward and subsequent card use '+vamp,()=>{let g=play(fresh(),'NIGHT_CASTLE_GIFT');for(let i=0;i<8;i++)g=end(g);if(vamp)g.players[0].field=[mon('VAMP1')];g=step(g,E.greedyDecide(g));assert.equal(g.pending,null);assert(g.players[0].hand.some(c=>c.id===(vamp?'VAMP_WARD':'VAMP_PACT')));g.players[0].field.forEach(m=>m.exhausted=true);g.players[0].mana=10;const action=E.greedyDecide(g);assert.equal(action.type,'play');g=step(g,action);assert(vamp?g.players[0].enchants.some(e=>e.card.id==='VAMP_WARD'):g.players[0].field.some(m=>m.id==='VAMP1'));});
  console.log(`PASS ${checks} v58 scenario groups`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
