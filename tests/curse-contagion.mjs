import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles} = await build({
  stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/engine';export {DB,BUYABLE_POOL} from './client/src/shared/cards';`},
  bundle:true, platform:'node', format:'esm', write:false,
});
const E=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
let serial=0;
const card=id=>({...structuredClone(E.DB[id]),uid:'contagion-'+ ++serial});
function fixture(side) {
  const g=E.createGame({mode:'online',seed:17,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  for(const p of g.players) Object.assign(p,{hp:40,maxMana:10,mana:10,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],removed:[]});
  g.cur=side;g.turn=3;g.pending=null;
  return g;
}
function resolve(g) {
  const p=g.players[g.cur],spell=card('CURSE_CONTAGION');
  p.hand.push(spell);
  return E.reduce(g,{type:'play',idx:p.hand.length-1,sourceUid:spell.uid}).state;
}
const count=pile=>pile.filter(c=>c.id==='CURSE').length;
assert(E.BUYABLE_POOL.includes('CURSE_CONTAGION'));
assert.equal(E.DB.CURSE_CONTAGION.t,'spell');
assert.equal(E.playCost(card('CURSE_CONTAGION')),1);
for(const side of [0,1]) {
  for(const [own,enemy,added] of [[0,0,2],[1,0,1],[0,1,1],[0,4,1],[2,5,3],[0,8,3]]) {
    const g=fixture(side),p=g.players[side],o=g.players[1-side];
    p.deck=Array.from({length:own},()=>card('CURSE'));
    for(let i=0;i<enemy;i++)o[['deck','hand','discard'][i%3]].push(card('CURSE'));
    o.removed=Array.from({length:7},()=>card('CURSE'));
    const before=JSON.parse(JSON.stringify(g)),next=resolve(g);
    const mine=next.players[side],theirs=next.players[1-side];
    assert.equal(count(theirs.discard)-count(before.players[1-side].discard),added);
    assert.equal(count(mine.discard),own===0 && enemy===0?1:0);assert.equal(mine.mana,9);assert.equal(mine.hp,40);
    assert.equal(theirs.curseSeals??0,0);assert.deepEqual(theirs.removed,before.players[1-side].removed);
    const uids=[...mine.discard,...theirs.deck,...theirs.hand,...theirs.discard,...theirs.removed].map(c=>c.uid);
    assert.equal(new Set(uids).size,uids.length);
  }
  const g=fixture(side);g.players[1-side].traps=[{card:{...card('T1'),react:'nullspell',cap:10},setTurn:0}];
  const blocked=resolve(g);assert.equal(count(blocked.players[side].discard)+count(blocked.players[1-side].discard),0);
}
// A separate replay counts the newly populated graveyard again.
const replay=fixture(0);
const echo=Object.values(E.DB).find(c=>c.ench==='runeEcho');
replay.players[0].enchants=[{card:card(echo.id),turns:99,bornTurn:1}];
replay.players[1].discard=Array.from({length:4},()=>card('CURSE'));
const echoed=resolve(replay);
assert.equal(count(echoed.players[1].discard),8,'4 + 1 on first resolution, then 5 + 3 on replay');
assert.equal(echoed.players[0].mana,9,'the copy resolves without a second payment');
console.log('PASS Curse Contagion: both seats, printed and paid cost, 0/1/4/5/8 opposing Curses, split zones, excluded Rift, new instances and negation');
