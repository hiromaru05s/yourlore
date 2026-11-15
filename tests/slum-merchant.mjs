import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle = await build({
  stdin: {contents: `export * from './client/src/shared/cards';
    export * from './client/src/shared/engine';
    export * from './client/src/shared/protocol';
    export * from './client/src/shared/collection';`,resolveDir: process.cwd()},
  bundle:true,platform:'node',format:'esm',write:false,
});
const E = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let serial=0;
const card=id=>({...structuredClone(E.DB[id]),uid:'merchant-'+ ++serial});
function fixture(owner,stock) {
  const g=E.createGame({mode:'online',seed:7,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.cur=owner;g.turn=4;g.phase='main';g.pending=null;delete g.mulligan;
  const p=g.players[owner];
  Object.assign(p,{mana:5,maxMana:5,hand:[card('SLUM_MERCHANT')],deck:[],discard:[],field:[],enchants:[],removed:[]});
  g.market=['M1','M3'].map(card);
  g.marketStock=[1,stock];
  return g;
}
const play=g=>E.reduce(g,{type:'play',idx:0});
const pick=(g,uid)=>E.reduce(g,{type:'pick',uid});
assert(E.COLLECTIBLE_STARTERS.includes('SLUM_MERCHANT'));
assert(!E.BUYABLE_POOL.includes('SLUM_MERCHANT'));
assert.equal(E.DB.SLUM_MERCHANT.cost,1);
assert.deepEqual([E.DB.SLUM_MERCHANT.atk,E.DB.SLUM_MERCHANT.def],[0,1]);
for(const side of [0,1]) {
  for(const stock of [1,2,3,undefined]) {
    const g=fixture(side,stock);
    if(stock===undefined)delete g.marketStock;
    const p=g.players[side], other=g.players[1-side];
    p.enchants=[{card:card('GUILD_CO'),turns:99,cnt:19}];
    other.enchants=[{card:card('GUILD_CO'),turns:99,cnt:7}];
    p.supply=[card('M1')];
    const s=play(g).state;
    assert.equal(s.pending.owner,side);assert.equal(s.pending.reason,'SLUM_MERCHANT');
    assert.deepEqual(E.effectChoices(s).map(c=>c.uid),g.market.map(c=>c.uid));
    assert.equal(s.players[side].enchants[0].cnt,1);assert.equal(s.players[1-side].enchants[0].cnt,7);
    assert.deepEqual(s.players[side].hand.map(c=>c.id),['DARK_MERCHANT']);
    for(const uid of [null,p.supply[0].uid,'stale'])assert.equal(pick(s,uid).state.pending.reason,'SLUM_MERCHANT');
    const chosen=g.market[1].uid;
    const {state:r,events}=pick(s,chosen);
    assert.equal(r.pending,null);
    assert.equal(r.market[0].uid,g.market[0].uid);
    assert.equal(r.marketStock[0],stock===undefined?3:1);
    assert.deepEqual(r.players[side].supply,p.supply);
    const exhausted=stock===1||stock===2;
    assert.equal(r.market[1].uid===chosen,!exhausted);
    assert.equal(r.marketStock[1],exhausted?3:1);
    assert.equal(events.filter(e=>e.type==='marketRestock').length,exhausted?1:0);
    assert.equal(r.players[side].mana,4);
    assert.deepEqual(r.players[side].buys,p.buys);
    assert.deepEqual(pick(r,chosen).state.marketStock,r.marketStock);
  }
  for(const zone of ['deck','hand','discard','removed','enemy','none']) {
    const g=fixture(side,3),p=g.players[side];
    if(zone==='enemy')g.players[1-side].deck=[card('SLUM')];
    else if(zone!=='none')p[zone].push(card('SLUM'));
    const s=play(g).state;
    assert.equal(s.pending.reason,'SLUM_MERCHANT','works without a Trade Guild');
    const active=['deck','discard','hand'].includes(zone);
    for(const viewer of [0,1])assert.equal(E.hasPassive(E.redactFor(s,viewer).players[side].field[0],'aura'),active,zone);
    if(zone==='deck'){
      const m=s.players[side];m.removed.push(m.deck.pop());E.refreshFieldPassives(s);assert(!E.hasPassive(m.field[0],'aura'));
      m.discard.push(m.removed.pop());E.refreshFieldPassives(s);assert(E.hasPassive(m.field[0],'aura'));
    }
  }
  const silent=fixture(side,2);
  silent.players[side].deck.push(card('SLUM'));
  silent.players[side].enchants=[{card:card('ESSENCE_OF_LIFE'),turns:5},{card:card('GUILD_CO'),cnt:5,turns:99}];
  const s=play(silent).state;
  assert.equal(s.pending,null);assert.equal(s.players[side].enchants[1].cnt,5);assert(!E.hasPassive(s.players[side].field[0],'aura'));
}
console.log('PASS both seats, Guild payout, fixed-market stock and restock boundaries, old rooms, Aura and silence');
