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

for (const [id, threshold] of [['FIRE_MARK', 6], ['FIRE_BRANDING', 3]]) {
  assert(E.BUYABLE_POOL.includes(id));
  const faces = new Set();
  for (let seed = 1; seed < 200 && faces.size < 6; seed++) {
    const g = fresh();
    g.rng = seed;
    g.players[0].hand = [card(id)];
    const {state, events} = E.reduce(g,{type:'play',idx:0});
    const die = events.find(e=>e.type==='dice' && e.source.id===id);
    assert.equal(die.need,threshold);
    faces.add(die.rolls[0]);
    assert.equal(state.players[1].brand ?? 0, Number(die.rolls[0] >= threshold));
  }
  assert.equal(faces.size,6);
}
{
  let g = fresh();
  assert.deepEqual([E.DB.FIRE_MARK.cost,E.playCost(card('FIRE_MARK'),g.players[0])],[2,1]);
  assert.deepEqual([E.DB.FIRE_BRANDING.cost,E.playCost(card('FIRE_BRANDING'),g.players[0])],[6,6]);
  g = play(play(g,'FLAME'),'FLAME');
  assert.equal(E.playCost(card('FIRE_BRANDING'),g.players[0]),4);
  g.players[0].hand = [card('FIRE_MARK')];
  const {state, events} = E.reduce(g,{type:'play',idx:0});
  assert(!events.some(e=>e.type==='dice'));
  assert.equal(state.players[1].brand,1);
  g = play(state,'FLAME');
  assert.equal(g.players[1].hp,190);
  g = E.reduce(E.reduce(g,{type:'endTurn'}).state,{type:'endTurn'}).state;
  assert.equal(E.playCost(card('FIRE_BRANDING'),g.players[0]),6);
  g.players[0].hand = [card('FIRE_MARK')];
  assert(E.reduce(g,{type:'play',idx:0}).events.some(e=>e.type==='dice' && e.source.id==='FIRE_MARK'));
}
{
  let g = fresh();
  g.players[1].brand = 2;
  const target = {...mon('M1'),def:20};
  g.players[1].field = [target];
  g = pick(play(g,'FIRE_BALL'),target.uid);
  assert.equal(g.players[1].field[0].dmg,7);
  assert.deepEqual(g.players.map(p=>p.hp),[198,196]);
  assert.equal(g.players[1].brand,2);
}
for (const [id,damage] of [['FIRE_ZONE',14],['FIRE_METEOR',32]]) {
  let g = fresh();
  g.players[1].brand = 3;
  const payment = card('M1');
  if (id === 'FIRE_ZONE') g.players[0].hand=[payment];
  const cost = E.playCost(card(id),g.players[0]);
  g=play(g,id);
  if (id === 'FIRE_ZONE') g=pick(JSON.parse(JSON.stringify(g)),payment.uid);
  const [p,o]=g.players;
  assert.equal(o.hp,200-damage);
  assert.equal(o.brand,2);
  assert.equal(p.maxMana,id==='FIRE_ZONE'?15:14);
  assert.equal(p.mana,15-cost);
  assert.equal(p.removed.length,id==='FIRE_ZONE'?1:0);
  assert.deepEqual(p.expansion.firePlayed,[id,id]);
  assert.equal(p.spellsCastTurn,2);
  assert.equal(p.discard.filter(c=>c.id===id).length,1);
  assert(!g.pending);
}
{
  let g=fresh();
  g.players[0].field=[mon('FIRE_MASTER')];
  g.players[1].shield=20;
  const attacker=g.players[0].field[0];
  g=E.reduce(g,{type:'attack',uid:attacker.uid}).state;
  if (g.pending) g=E.reduce(g,{type:'chooseTarget',uid:undefined}).state;
  assert.equal(g.players[1].brand,1);
  const hand=Array.from({length:9},()=>card('M1'));
  g.players[0].hand=hand;
  g=E.reduce(g,{type:'endTurn'}).state;
  assert.equal(g.players[0].hand.length,0);
  assert(hand.every(c=>g.players[0].discard.some(d=>d.uid===c.uid)));
  g=fresh();
  g.players[0].field=[mon('FIRE_MASTER')];
  g=play(g,'FIRE_MARK');
  g.players[0].hand=[card('M1')];
  g=E.reduce(g,{type:'endTurn'}).state;
  assert.equal(g.players[0].hand.length,1);
}
{
  let g=fresh();
  g.players[1].brand=2;
  g.players[1].traps=[{card:{...card('S1'),react:'nullspell',cap:0,val:0,val2:0}}];
  const payment=card('M1');
  g.players[0].hand=[payment];
  g=play(g,'FIRE_ZONE');
  const result=E.reduce(g,{type:'pick',uid:payment.uid});
  assert(result.events.some(e=>e.type==='trapReveal'));
  const [p,o]=result.state.players;
  assert.equal(o.hp,195);assert.equal(o.brand,1);
  assert.equal(p.expansion.firePlayed.length,2);
  assert.equal(p.discard.filter(c=>c.id==='FIRE_ZONE').length,1);
}
console.log('PASS Fire Brand dice, turn counts, distinct targets, single recasts, spell negation and Fire Master');

// All Fire-series consumers share the same identifiers, including Three Fire's damage roll.
assert.equal(E.DB.S1.nameJa, 'スリーファイアー');
{
  let g = play(fresh(), 'FIRE_ART');
  assert.equal(E.playCost(card('S1'),g.players[0]),0);
  let rolledDamage = false;
  for(let seed=1;seed<=40 && !rolledDamage;seed++){
    g.rng=seed;
    const result=play(structuredClone(g),'S1');
    assert(result.players[0].expansion.firePlayed.includes('S1'));
    if(result.players[1].hp<200){assert.equal(result.players[1].hp,196);rolledDamage=true;}
  }
  assert(rolledDamage);
}
for(const [id,advance] of [['INCUBATOR_S',2],['INCUBATOR',5]]) {
  for(const remaining of [1,advance,advance+1]){
    let g=fresh();
    const egg={...mon('DRAGON_EGG'),hatch:remaining,dur:3};
    g.players[0].field=[egg];
    g=pick(play(g,id),egg.uid);
    if(remaining>advance) assert.equal(g.players[0].field[0].hatch,1);
    else {
      assert(E.DB.DRAGON_EGG.hatchInto.includes(g.players[0].field[0].id));
      assert.equal(g.players[0].removed.filter(c=>c.uid===egg.uid).length,1);
    }
  }
}
