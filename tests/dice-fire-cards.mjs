import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: [
    "export * from './client/src/shared/engine'",
    "export * from './client/src/shared/cards'",
    "export * from './client/src/shared/collection'",
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const E = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let seq = 0;
const card = id => ({ ...E.DB[id], uid: 'test-' + ++seq });
const mon = id => ({ ...card(id), dmg: 0, exhausted: false, atkMod: 0, defMod: 0, tempAtk: 0, summonedTurn: 0 });
function fresh() {
  const g = E.createGame({ mode:'online', seed:17, starting:0, p0:{id:'a',name:'A'}, p1:{id:'b',name:'B'} }).state;
  g.cur = 0;
  g.turn = 3;
  g.pending = null;
  g.phase = 'main';
  for (const p of g.players) Object.assign(p, { hand:[], field:[], enchants:[], traps:[], deck:[], discard:[], quests:[], removed:[], hp:200, mana:15, maxMana:15 });
  return g;
}
function play(g, id) {
  g.players[g.cur].hand.push(card(id));
  return E.reduce(g, {type:'play', idx:g.players[g.cur].hand.length - 1}).state;
}
const pick = (g, uid) => E.reduce(g, {type:'pick', uid}).state;

for (const id of ['MANA_CYCLE','SLUM_ASSASSIN']) {
  assert(E.COLLECTIBLE_STARTERS.includes(id));
  assert(!E.BUYABLE_POOL.includes(id));
}
const trio = ['DICE_FIGHTER','DICE_ARCHER','DICE_MAGICIAN'];
for (const id of trio) {
  assert(E.BUYABLE_POOL.includes(id));
  assert(!E.DECK_POOL.includes(id));
}
{
  let g = fresh();
  const p = g.players[0];
  p.field = [mon('DICE_FIGHTER')];
  p.mana--;
  assert(E.playBlockReason(g,0,card('MANA_CYCLE')));
  p.field.push(mon('DICE_ARCHER'));
  p.mana++;
  assert(E.playBlockReason(g,0,card('MANA_CYCLE')));
  p.mana--;
  g = play(g,'MANA_CYCLE');
  assert.equal(g.players[0].mana,15);
  assert.equal(g.players[0].maxMana,15);
  assert(g.players[0].removed.some(c=>c.id==='MANA_CYCLE'));
}
{
  let g = fresh();
  g.players[1].field = [mon('DICE_FIGHTER')];
  g = play(g,'SLUM_ASSASSIN');
  assert.equal(g.players[0].field[0].id,'SLUM_ASSASSIN');
  assert(E.hasPassive(g.players[0].field[0],'void'));
  g = play(g,'SLUM_ASSASSIN');
  assert.equal(g.players[0].field.length,1);
  assert.equal(g.players[0].hand.length,1);
  assert.equal(g.players[0].field[0].directOnly,true);
}
{
  let g = fresh();
  g.players[0].field = trio.map(mon);
  g.players[1].field = [mon('DICE_FIGHTER')];
  g.players[0].hand = [card('ND3')]; // the opponent rolls once, the caster twice
  const result = E.reduce(g,{type:'play',idx:0});
  const [guess, rolls] = result.events.filter(e=>e.type==='dice').map(e=>e.rolls);
  g = result.state;
  const [fighter,archer,mage] = g.players[0].field;
  assert.deepEqual([fighter.atkMod,fighter.defMod,archer.atkMod,mage.atkMod],[2,2,4,2]);
  assert.equal(g.players[1].field[0].atkMod,1);
  const prophecy = rolls.includes(guess[0]) ? 0 : 4;
  assert.equal(g.players[0].maxMana,15 + prophecy + rolls.filter(face=>face>=5).length);
  for (const unit of g.players[0].field) for (const key of ['counter','evade','aura']) assert(E.hasPassive(unit,key));
  g.players[0].field = [fighter];
  g = play(g,'S4');
  assert.deepEqual(g.players[0].field[0].conditionalPassives,[]);
  g.players[0].field[0].passivesG = ['evade'];
  g = play(g,'S4');
  assert(E.hasPassive(g.players[0].field[0],'aura'));
}
{
  let g = fresh();
  g = play(g,'FIRE_ART');
  assert.equal(E.playCost(card('FIRE_ART'),g.players[0]),0);
  g = play(g,'FIRE_ARROW');
  assert.deepEqual(g.players.map(p=>p.hp),[199,190]);
  g = pick(play(g,'FIRE_BALL'),'player-0');
  assert.equal(g.players[0].hp,187);
  g = pick(play(g,'FIRE_BALL'),'player-1');
  assert.equal(g.players[1].hp,179);
  g = play(g,'FLAME');
  assert.equal(g.players[1].hp,176);
  g = play(g,'FIRE_METEOR');
  assert.equal(g.players[1].hp,152);
  g.players[0].hand = [card('M1')];
  g = pick(play(g,'FIRE_ZONE'),g.players[0].hand[0].uid);
  assert.equal(g.players[1].hp,142);
  g = E.reduce(g,{type:'endTurn'}).state;
  g = E.reduce(g,{type:'endTurn'}).state;
  const hp = g.players[1].hp;
  g = play(g,'FIRE_ARROW');
  assert.equal(g.players[1].hp,hp-3);
}
console.log('PASS starter pools, summon gates, Void, dice ownership, conditional grants and Fire damage packets');
