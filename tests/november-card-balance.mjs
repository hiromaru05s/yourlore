import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle = await build({stdin:{contents:"export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './server/src/reworkedCardSnapshot';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const E = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let sequence=0;
const card=id=>({...structuredClone(E.DB[id]),uid:'balance-'+(++sequence)});
const mon=id=>({...card(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false});
function game(side){
  const g=E.createGame({mode:'online',seed:42,starting:side,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
  Object.assign(g,{cur:side,turn:5,pending:null,phase:'main'});delete g.mulligan;
  for(const p of g.players) Object.assign(p,{hp:100,mana:20,maxMana:20,field:[],enchants:[],hand:[],deck:[],discard:[],traps:[],quests:[],removed:[],shield:0,dew:0});
  return g;
}
const step=(g,a)=>E.reduce(g,a).state;
const pick=(g,uid)=>step(g,{type:'pick',uid});
const end=g=>step(g,{type:'endTurn'});
function cast(g,id){const hand=g.players[g.cur].hand;hand.push(card(id));return step(g,{type:'play',idx:hand.length-1});}
function attack(g,m,t){return pick(step(g,{type:'attack',uid:m.uid}),t.uid);}
for(const side of [0,1]){
  const opp=1-side;
  for (const [id, purchase, play] of [['KNIGHT_TEACH',2,2],['NMD4',3,3]]) {
    const g=game(side), p=g.players[side], c=card(id);
    p.field=[mon('M3')]; p.hand=[c]; p.mana=play-1;
    assert.equal(E.buyCost(p,c),purchase);
    assert.equal(E.playCost(c,p),play);
    assert.equal(step(g,{type:'play',idx:0}).players[side].hand[0].uid,c.uid);
    p.mana=play;
    const result=step(g,{type:'play',idx:0});
    assert.equal(result.players[side].mana,0);
    assert.equal(result.players[side].hand.length,0);
  }
  {
    const g=game(side), p=g.players[side];
    p.deck=Array.from({length:6},()=>card('S10'));
    const result=cast(g,'TSO3').players[side];
    assert.equal(result.deck.length,6);
    assert.equal(result.hand.length,0);
    assert.equal(E.effAtk(result,result.field[0]),4);
    assert.equal(E.effDef(result,result.field[0]),4);
  }
  {
    const g=game(side), p=g.players[side], hunter=mon('TSO3');
    g.novemberBalanceApplied=true; // A match saved by v90.
    p.field=[Object.assign(hunter,{atkMod:2,mutedEffects:{onSummon:'gravePure'},val:6})];
    p.hand=[Object.assign(card('TSO3'),{onSummon:'gravePure',val:6,textJa:'old'})];
    p.deck=[card('KNIGHT_TEACH')]; delete p.deck[0].play;
    p.discard=[card('NMD4')]; delete p.discard[0].play;
    E.restoreReworkedCards(g);
    assert.equal(p.field[0].atkMod,2);
    assert.equal(p.field[0].mutedEffects.onSummon,undefined);
    assert.equal(p.hand[0].onSummon,undefined);
    assert.equal(p.hand[0].textJa,E.DB.TSO3.textJa);
    assert.equal(p.deck[0].play,2);
    assert.equal(p.discard[0].play,3);
  }
  {
    const g=game(side),draws=['M3','S10','M4'].map(card);
    g.players[side].deck=draws;const s=cast(g,'NMD2');
    assert.equal(s.players[side].hand.length,3);assert.equal(s.pending.reason,'BOOK_DISCARD');
    assert.equal(pick(s,null).players[side].hand.length,3);
    const spell=s.players[side].hand.find(c=>c.t==='spell');
    for(const reward of ['E3','DISCOVERY_LARGE']){
      const r=pick(pick(s,spell.uid),reward);
      assert.deepEqual(r.players[side].discard.map(c=>c.id),['S10',reward]);assert.equal(r.players[side].hand.length,2);
    }
  }
  {
    let g=game(side);const m=mon('M3');g.players[opp].field=[m];
    g=cast(g,'M8');assert.equal(g.pending.reason,'WARDEN_ZERO');g=pick(g,m.uid);
    assert.equal(E.effAtk(g.players[opp],g.players[opp].field[0],g),2);
    g=end(g);assert.equal(E.effAtk(g.players[opp],g.players[opp].field[0],g),0);
    g=end(g);assert.equal(E.effAtk(g.players[opp],g.players[opp].field[0],g),2);
  }
  {
    let g=game(side);g.players[side].field=[mon('M9')];g.players[opp].field=[mon('M9')];
    g=step(g,{type:'refresh'});g=end(g);
    for(const p of g.players) assert.deepEqual([p.field[0].atkMod,p.field[0].defMod],[1,1]);
    g=step(g,{type:'refresh'});for(const p of g.players)assert.equal(p.field[0].atkMod,2);
  }
  {
    let g=game(side);g.players[side].field=[mon('GOBLIN'),mon('SOLDIER2'),mon('INFKNIGHT')];
    g=cast(g,'GM6_0');assert.deepEqual(g.pending.data.ids,['DRAGON_RIDER','ANTIQUE_DK','GOBLIN_DRAGON_RIDER']);
    g=pick(g,'GOBLIN_DRAGON_RIDER');const p=g.players[side],rider=p.field.find(m=>m.id==='GOBLIN_DRAGON_RIDER');
    assert(rider);assert.deepEqual(p.discard.map(c=>c.id),['GOBLIN','GM6_0']);
    assert.deepEqual([rider.atk,E.effAtk(p,rider,g),E.effDef(p,rider)],[13,16,7]);
    assert(['evade','counter','void'].every(k=>E.hasPassive(rider,k)));
  }
  {
    let g=game(side);g.players[side].field=[mon('TSO5')];
    assert(E.playBlockReason(g,side,card('M3')));assert.equal(E.playBlockReason(g,side,card('TSO3')),null);
    g=cast(g,'MUSTER_DIE');assert(g.players[side].field.every(m=>m.tribe==='고독'));
    assert(E.DECK_POOL.includes('MUSTER_DIE'));assert(!E.BUYABLE_POOL.includes('MUSTER_DIE'));
  }
  {
    let g=game(side);const m=mon('TSO3'),enemy={...mon('INFKNIGHT'),atk:18,def:20};
    g.players[side].field=[m];g.players[side].discard=[card('TSO2')];g.players[opp].field=[enemy];
    assert.deepEqual([E.effAtk(g.players[side],m,g),E.effDef(g.players[side],m)],[4,4]);
    g=attack(g,m,enemy);assert.equal(g.players[side].field[0].dmg,0);
    g.players[side].discard.push(card('M3'));assert.equal(E.effDef(g.players[side],g.players[side].field[0]),2);
  }
  {
    let g=game(side);const m=mon('TAR3'),enemy=mon('M3');g.players[side].field=[m];g.players[opp].field=[enemy];
    g=attack(g,m,enemy);assert.deepEqual(g.players[side].field.map(c=>c.id),['INFKNIGHT']);assert.equal(g.players[side].discard[0].uid,m.uid);
  }
  {
    let g=game(side);const master=mon('POISON_MASTER'),enemy=mon('M11');g.players[side].field=[master];g.players[opp].field=[enemy];
    g=attack(g,master,enemy);assert.equal(g.players[opp].brand,1);assert.equal(g.players[side].field[0].defMod,5);
  }
  {
    let g=game(side);g=cast(g,'M5');assert.equal(end(g).players[side].shield,8);
    g=step(g,{type:'attack',uid:g.players[side].field[0].uid});assert.equal(end(g).players[side].shield,2);
  }
  {
    let g=game(side);g.players[opp].field=[{...mon('M4'),def:20},{...mon('M11'),def:20}];g.players[side].field=[mon('GOBLIN')];
    g=cast(g,'GOBLIN_LEADER');assert.equal(g.players[opp].hp,99);assert(g.players[opp].field.every(m=>m.dmg===1));
  }
  {
    const g=game(side);const m={...mon('ELITE'),atk:6,def:6,dmg:5};g.players[side].field=[m];delete g.novemberBalanceApplied;
    E.restoreReworkedCards(g);assert.deepEqual([m.atk,m.def,m.dmg],[5,5,4]);assert.equal(g.players[side].field[0].uid,m.uid);
    const saved=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),saved);
  }
}
console.log('PASS November card reworks on both sides, optional choices, aura removal, fusion, rerolls, combat and saved-room migration.');
