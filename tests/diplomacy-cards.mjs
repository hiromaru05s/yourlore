import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
export * from './client/src/shared/engine';
export * from './client/src/shared/cards';
export * from './client/src/shared/protocol';
export { resolveTurnTimeout } from './server/src/gameInput';
export { restoreReworkedCards } from './server/src/reworkedCardSnapshot';
`},bundle:true,platform:'node',format:'esm',write:false});
const E=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let seq=0;
const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'dip-'+ ++seq});
const mon=(id,mods={})=>({...card(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false,...mods});
function fresh(side=0) {
  const g=E.createGame({mode:'online',seed:13,starting:side,p0:{id:'one',name:'One'},p1:{id:'two',name:'Two'}}).state;
  g.turn=5;g.cur=side;g.pending=null;
  for(const p of g.players)Object.assign(p,{hp:40,maxMana:12,mana:12,deck:[],hand:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],shield:0,brand:0,dew:0,uses:{},usesTurn:{},playsTurn:0,openingDrawReady:false});
  return g;
}
const step=(g,a)=>E.reduce(g,a).state;
const pick=(g,uid)=>step(g,{type:'pick',uid});
const cast=(g,id)=>{const p=g.players[g.cur];p.hand.push(card(id));return step(g,{type:'play',idx:p.hand.length-1});};
const buy=(g,id)=>{g.market[0]=card(id);return step(g,{type:'buyMarket',i:0});};
const end=g=>step(g,{type:'endTurn'});
const check=(name,fn)=>{fn();console.log('PASS',name);};
check('Three new spells enter both market pools, and Peace Treaty retains its effect',()=>{
  for(const id of ['MIND_GAME','TOLL_GATE','TRUCE'])assert(E.BUYABLE_POOL.includes(id));
  assert.deepEqual(['MIND_GAME','TOLL_GATE','TRUCE','E2'].map(id=>E.DB[id].cost),[2,2,3,2]);
  assert.equal(E.playCost(card('E2')),2);
  assert(E.DB.MIND_GAME.quick);assert(!E.DB.TOLL_GATE.quick);
  const g=cast(fresh(),'E2');g.players[0].field=[mon('M1')];assert(!E.monsterCanAttack(g,g.players[0],g.players[0].field[0]));
});
check('Truce remembers a real attack after the attacker leaves and across room serialization',()=>{
  let g=fresh();const m=mon('M1');g.players[0].field=[m];
  assert.equal(E.playBlockReason(g,0,card('TRUCE')),null);
  g=step(g,{type:'attack',uid:m.uid});g.players[0].field=[];
  assert(E.playBlockReason(JSON.parse(JSON.stringify(g)),0,card('TRUCE')));
  g=end(end(g));assert.equal(E.playBlockReason(g,0,card('TRUCE')),null);
});
check('Toll Gate taxes play and effect summons but not the spell owner',()=>{
  let g=cast(fresh(),'TOLL_GATE');
  g=cast(g,'M1');assert.equal(g.players[0].hp,40);
  g=end(g);g=cast(g,'M1');assert.equal(g.players[1].hp,39);
  g=buy(g,'QUICK_MUSTER');assert.equal(g.players[1].hp,36);
});
check('Truce blocks new ordinary attackers but Assassins still obey Peace Treaty',()=>{
  let g=fresh();g.truceThroughTurn=g.turn+1;
  g.players[0].field=[mon('M1'),mon('ASSASSIN1')];const [normal,assassin]=g.players[0].field;
  assert(!E.monsterCanAttack(g,g.players[0],normal));assert(E.monsterCanAttack(g,g.players[0],assassin));
  assert.equal(step(g,{type:'attack',uid:normal.uid}).players[1].hp,40);
  g=cast(g,'E2');assert(!E.monsterCanAttack(g,g.players[0],assassin));
});
for (const side of [0,1]) check('Secret attack targets stay private after reconnect, side '+side,()=>{
  const g=fresh(side),target=mon('M1');
  g.players[1-side].field.push(target);g.mindSecret={owner:side,attackerUid:'public-attacker',targetUid:target.uid};
  const fromDisk=JSON.parse(JSON.stringify(g));assert.deepEqual(E.redactFor(fromDisk,side).mindSecret,g.mindSecret);
  assert.equal(E.redactFor(fromDisk,1-side).mindSecret,undefined);
});
for (const side of [0,1]) for (const correct of [false,true]) for (const dual of [false,true]) {
  check(`Mind Game through purchase, private target and guess: ${side}/${correct}/${dual}`,()=>{
    let g=fresh(side);
    const a=mon('M1',{atk:7,def:20,passive:dual?['dual']:[]});
    const b=mon('M1',{atk:4,def:3,passive:['counter']}), other=mon('M1');
    g.players[side].field=[a];g.players[1-side].field=[b,other];
    g=buy(g,'MIND_GAME');g=pick(g,a.uid);g=pick(g,b.uid);
    assert.equal(g.pending.owner,1-side);assert.equal(g.pending.data.attackerUid,a.uid);
    const opponentView=E.redactFor(g,1-side);
    assert.equal(opponentView.mindSecret,undefined);
    assert.equal(JSON.stringify(opponentView.pending).includes(b.uid),false);
    assert.equal(E.effectChoices(opponentView).length,2);
    g=pick(JSON.parse(JSON.stringify(g)),correct?b.uid:other.uid);
    const after=g.players[side].field[0];
    assert.equal(g.players[1-side].hp,correct?40:32);
    assert.equal(after.exhausted,correct&&!dual);
    assert.equal(after.attacksUsed,correct?1:0);
    assert.equal(after.dmg,correct?0:2);
    assert(!g.pending && !g.mindSecret && !g.mindCombat);
  });
}
check('Truce returns both fields, keeps Assassins and expires at the next own turn',()=>{
  let g=fresh();
  g.players[0].field=[mon('M1'),mon('ASSASSIN1')];
  g.players[1].field=[mon('M1',{token:true}),mon('ASSASSIN1')];
  g=cast(g,'TRUCE');
  assert(g.players.every(p=>p.field.length===1 && p.field[0].id==='ASSASSIN1'));
  assert(g.players[0].hand.some(c=>c.id==='M1'));assert(g.players[1].removed.some(c=>c.id==='M1'));
  g=end(g);g.players[1].field.push(mon('M1'));assert(!E.monsterCanAttack(g,g.players[1],g.players[1].field[1]));
  g=end(g);g.players[0].field.push(mon('M1'));assert(E.monsterCanAttack(g,g.players[0],g.players[0].field[1]));
});
check('Toll Gate stacks distinct conditions once, and the summoner chooses what to discard',()=>{
  let g=cast(fresh(),'TOLL_GATE');g.players[0].hp=10;
  g.players[0].field=[mon('CASTLE'),mon('MERCENARY'),mon('MERC_LEADER'),mon('M1',{tribe:'귀족'})];
  g=end(g);const keep=card('S1'),discard=card('S2');g.players[1].hand=[keep,discard];
  g=cast(g,'M1');const m=g.players[1].field[0];
  assert.equal(m.atkMod,-1);assert.equal(g.players[0].hp,10+E.effAtk(g.players[1],m,g)+E.effDef(g.players[1],m));
  assert.equal(g.pending.owner,1);g=pick(g,discard.uid);
  assert.deepEqual(g.players[1].hand.map(c=>c.uid),[keep.uid]);assert(!g.pending);
});
check('First Loose Screw casts with an empty board and can destroy only your own enchantment',()=>{
  let g=cast(fresh(),'DISARM1');assert(!g.pending);assert(g.players[0].discard.some(c=>c.id==='DISARM1'));
  g=cast(g,'E2');const uid=g.players[0].enchants[0].card.uid;g=cast(g,'DISARM1');
  g=step(g,{type:'chooseTarget',uid});assert.equal(g.players[0].enchants.length,0);
});
check('Reading the Cursed Codex clears counters and counts each eligible monster only once',()=>{
  let g=fresh();g.players[0].brand=1;g.players[0].curseSeals=3;
  g.players[1].hp=100;g.players[1].deck=[card('TDE1'),card('BLACK_CURSE')];
  g.players[1].discard=[card('BLACK_ELSA')];g.players[1].field=[mon('HEXER1',{tribe:'마족'})];
  g.players[1].hand=[card('BLACK_ALICE')];g=cast(g,'GS5_3');
  assert.equal(g.players[1].hp,64);assert.equal(g.players[0].brand,0);assert.equal(g.players[0].curseSeals,0);
});
check('Undying Curse creates two when both zones are clear and includes them in its damage',()=>{
  const g=buy(fresh(),'QUICK_CURSE');assert.equal(g.players[1].hp,38);
  assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,2);
});
check('Mimic Hunter stops both sides across the family and releases the field when it leaves',()=>{
  const g=fresh();const a=mon('AWAKENED_MIMIC'),b=mon('MIMIC2');
  g.players[0].field=[a,mon('MIMIC_HUNTER')];g.players[1].field=[b];
  for(const [i,m] of [[0,a],[1,b]]) {g.cur=i;assert(!E.monsterCanAttack(g,g.players[i],m));
    assert(!step(g,{type:'attack',uid:m.uid}).pending);}
  g.players[0].field.pop();assert(E.monsterCanAttack(g,g.players[1],b));
});
check('First Aid counts HP damage after shields in the previous turn only',()=>{
  let g=fresh();g.players[1].shield=5;
  const a=mon('M1',{atk:15});g.players[0].field=[a];g=step(g,{type:'attack',uid:a.uid});
  assert.equal(g.players[1].hp,30);assert(!E.purchaseAllowed(g,g.players[1],card('QUICK_AID')));
  g=end(g);assert(E.purchaseAllowed(g,g.players[1],card('QUICK_AID')));
  g=end(g);assert(!E.purchaseAllowed(g,g.players[1],card('QUICK_AID')));
});
check('Hunter hits before damage when a previously committed attack resumes',()=>{
  for(const def of [5,10]) {
    let g=fresh();const a=mon('MIMIC',{atk:3,def,passive:[]}),h=mon('MIMIC_HUNTER',{def:12,passive:[]});
    g.players[0].field=[a];g.players[1].field=[h];
    g.pending={kind:'cardChoice',owner:1,reason:'WORLD_TREE_DEFEND',data:{attackerUid:a.uid,targetUid:h.uid},allowCancel:false};
    g=pick(g,'pass');assert.equal(g.players[0].field.length,def===5?0:1);
    if(def===10)assert.equal(g.players[0].field[0].dmg,6);
    assert.equal(g.players[1].field[0].dmg,def===5?0:3);
  }
});
check('Saved game migration updates the cost in hand and market, keeping existing enchantment duration',()=>{
  const g=fresh();delete g.diplomacyApplied;
  const h=card('E2'),m=card('E2'),e=card('E2');h.cost=m.cost=e.cost=3;
  g.players[0].hand=[h];g.market[0]=m;g.players[1].enchants=[{card:e,turns:2,bornTurn:2}];
  E.restoreReworkedCards(g);
  assert.deepEqual([h.cost,m.cost,e.cost],[2,2,2]);assert.equal(g.players[1].enchants[0].turns,2);
  const saved=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),saved);
});
