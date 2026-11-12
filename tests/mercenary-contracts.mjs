// Exercise the public reducer and the serialized view used by remote players.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result = await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';export {restoreReworkedCards} from './server/src/reworkedCardSnapshot';`},bundle:true,platform:'node',format:'esm',write:false});
const E=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
let serial=0;
const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'merc-'+(++serial)});
const mon=id=>({...card(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false});
const fresh=(side=0)=>{
  const g=E.createGame({mode:'online',seed:41,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.turn=3;g.cur=side;
  for (const pl of g.players) Object.assign(pl,{hp:100,mana:24,maxMana:24,deck:[],discard:[],field:[],hand:[],traps:[],enchants:[],quests:[],removed:[],dew:0,shield:0,uses:{},usesTurn:{},playsTurn:0,openingDrawReady:false});
  return g;
};
const step=(g,a)=>E.reduce(g,a).state;
function cast(g,id){const p=g.players[g.cur];p.hand.push(card(id));return step(g,{type:'play',idx:p.hand.length-1});}
function buy(g,id,market='buyMarket'){
  if (market==='buyMarket') g.market[0]=card(id);
  else g.players[g.cur].supply[0]=card(id);
  return step(g,{type:market,i:0});
}
const pick=(g,uid)=>step(g,{type:'pick',uid});
function enchant(g,id,owner=g.cur){g.players[owner].enchants.push({card:card(id),turns:99,bornTurn:0});}
function check(name,f){f();console.log('PASS',name);}
const ranks = [['MERCENARY',1,2,1,1],['MERC_LEADER',3,4,3,2],['MERC_MASTER',5,6,5,3]];
for (const [id,cost,atk,hp,reward] of ranks) {
  check(id+' printed stats and hand cost with and without a Mercenary',()=>{
    assert.deepEqual([E.DB[id].cost,E.DB[id].atk,E.DB[id].def],[cost,atk,hp]);
    for (const ally of [false,true]) for (const mana of [cost-1,cost]) {
      let g=fresh();if(ally)g.players[0].field=[mon('MERCENARY')];
      g.players[0].mana=mana;g=cast(g,id);
      assert.equal(g.players[0].field.length,Number(ally)+Number(mana===cost));
      assert.equal(g.players[0].mana,mana===cost?0:mana);
    }
  });
  for(const market of ['buyMarket','buySupply']) check(id+' '+market+' purchase and immediate hire',()=>{
    for(const side of [0,1]) {
      let g=buy(fresh(side),id,market);
      assert.equal(g.pending.reason,'MERC_HIRE');
      const bought=g.players[side].discard.at(-1);
      assert.equal(pick(g,'invalid').pending.reason,'MERC_HIRE');
      const declined=pick(g,'pass');assert.equal(declined.players[side].mana,24-cost);assert.equal(declined.players[side].discard.at(-1).uid,bought.uid);
      const paid=pick(g,'hire');assert.equal(paid.players[side].mana,24-cost-1);assert.equal(paid.players[side].field.at(-1).uid,bought.uid);assert.equal(paid.players[side].discard.length,0);
      g=fresh(side);g.players[side].mana=cost;g=buy(g,id,market);assert.equal(g.pending,null);assert.equal(g.players[side].discard.at(-1).id,id);
      g=fresh(side);g.players[side].field=[mon(id)];g.players[side].mana=cost;g=buy(g,id,market);
      assert.equal(g.players[side].mana,0);assert.equal(g.players[side].field.length,2);assert.equal(g.players[side].discard.length,0);
      g=fresh(side);g.players[side].field=Array.from({length:E.FIELD_MAX},()=>mon('MERCENARY'));g=buy(g,id,market);
      assert.equal(g.pending,null);assert.equal(g.players[side].discard.at(-1).id,id);assert.equal(g.players[side].mana,24-cost);
    }
  });
  check(id+' rough work and personal battle bounty',()=>{
    let g=fresh();const target={...mon('SOLDIER2'),def:10};g.players[1].field=[target];
    g=cast(g,id);g=pick(pick(g,'hit'),target.uid);assert.equal(g.players[1].field[0].dmg,cost);
    g=fresh();g.players[1].field=[{...target,def:1,atk:10,passive:['counter']}];
    g=cast(g,id);g=pick(pick(g,'bounty'),target.uid);
    const hunter=g.players[0].field[0];g=step(g,{type:'attack',uid:hunter.uid});g=pick(g,target.uid);
    assert.equal(g.players[0].mana,24-cost+reward);assert.equal(g.players[1].field.length,0);
    if(hp<=5)assert.equal(g.players[0].field.length,0,'mutual destruction still pays');
  });
}
check('Casino dice on summon are independent of contracts and count for either Casino',()=>{
  for (const [id,dice] of [['MERCENARY',3],['MERC_LEADER',5],['MERC_MASTER',10]]) {
    for (const casinoSide of [null,0,1]) for (const art of [false,true]) {
      const g=fresh();
      if (casinoSide!==null) g.players[casinoSide].field=[mon('CASINO')];
      if (art) enchant(g,'MERC_ART');
      g.players[0].hand=[card(id)];
      const r=E.reduce(g,{type:'play',idx:0});
      const rolls=r.events.filter(e=>e.type==='dice' && e.source.id===id);
      assert.deepEqual(rolls.map(e=>e.rolls.length),casinoSide===null?[]:art?[dice,dice]:[dice]);
      if (casinoSide!==null) assert.equal(r.state.players[casinoSide].field.find(m=>m.id==='CASINO').gcount,dice*(art?2:1)%12);
    }
  }
});
check('Guildmaster upkeep uses only the owner’s turn and repeats with Mercenary Arts',()=>{
  for(const side of [0,1]) for(const ownTurn of [false,true]){
    const g=fresh();g.cur=ownTurn?1-side:side;g.players[side].field=[mon('MERC_MASTER')];
    g.players[1-side].field=[mon('CASINO')];enchant(g,'MERC_ART',side);
    const {events}=E.reduce(g,{type:'endTurn'});
    assert.deepEqual(events.filter(e=>e.type==='dice' && e.source.id==='MERC_MASTER').map(e=>e.rolls.length),ownTurn?[10,10]:[]);
  }
});
check('a different killer or a bounced and replayed target earns no bounty',()=>{
  for(const bounce of [false,true]){
    let g=fresh();const target=mon('SOLDIER2');g.players[1].field=[target];
    g=cast(g,'MERCENARY');g=pick(pick(g,'bounty'),target.uid);
    let hunter=g.players[0].field[0];
    if(bounce){
      g.pending={kind:'oppMon',reason:'bounceLow',allowCancel:false,data:{maxCost:2}};
      g=pick(g,target.uid);g.cur=1;g=step(g,{type:'play',idx:0});g.cur=0;
      assert.equal(g.players[1].field[0].uid,target.uid);
    } else {hunter=mon('MERCENARY');g.players[0].field.push(hunter);}
    const mana=g.players[0].mana;g=step(g,{type:'attack',uid:hunter.uid});g=pick(g,target.uid);
    assert.equal(g.players[1].field.length,0);assert.equal(g.players[0].mana,mana);
  }
});
check('Guildmaster Escort summons an active Leader and Mercenary Arts repeats contracts',()=>{
  let g=fresh();enchant(g,'MERC_ART');const target={...mon('M1'),def:20};g.players[1].field=[target];
  g=cast(g,'MERC_MASTER');g=pick(g,'escort');
  let guards=0;
  while(g.pending){
    assert.equal(g.pending.reason,'MERC_JOB');
    if(g.pending.data.sourceId==='MERC_MASTER'){
      assert(!E.effectChoices(g).some(c=>c.uid==='escort'));
      g=pick(pick(g,'hit'),target.uid);
    } else {
      guards++;g=pick(g,'escort');
    }
    assert(guards<=2);
  }
  assert.equal(guards,2);assert.equal(g.players[1].field[0].dmg,5);
  assert.deepEqual(g.players[0].field.map(m=>m.id),['MERC_MASTER','MERC_LEADER']);assert(E.hasPassive(g.players[0].field[1],'taunt'));
});
check('persisted rooms refresh prices and stats while retaining UIDs and damage',()=>{
  const g=fresh();delete g.mercReworkApplied;
  const old={...mon('MERC_MASTER'),cost:6,atk:5,def:7,dmg:2};g.players[0].field=[old];
  g.market[0]={...card('MERCENARY'),cost:2};
  E.restoreReworkedCards(g);E.restoreReworkedCards(g);
  assert.deepEqual([old.cost,old.atk,old.def,old.dmg],[5,6,5,2]);assert.equal(g.market[0].cost,1);
});
