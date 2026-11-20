import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(),'lore-golem-rules-'));
try {
  await build({stdin:{contents:`export * from './client/src/shared/engine';
    export * from './client/src/shared/cards'; export * from './client/src/shared/collection';
    export * from './server/src/reworkedCardSnapshot';`,resolveDir:process.cwd()},
    bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'rules.mjs')});
  const E = await import(path.join(dir,'rules.mjs'));
  let seq=0;
  const card=id=>({...structuredClone(E.DB[id] ?? E.STARTERS[id]),uid:'golem-'+ ++seq});
  const mon=(id,props={})=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0,guts:1,...props});
  const enchant=id=>({card:card(id),turns:10,bornTurn:1});
  function game(cur=0) {
    const g=E.createGame({mode:'online',seed:317,starting:cur,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    g.cur=cur;g.pending=null;g.turn=5;g.phase='main';
    for(const p of g.players) Object.assign(p,{field:[],enchants:[],hand:[],deck:[],traps:[],discard:[],quests:[],removed:[],hp:50,maxHp:100,mana:12,maxMana:12});
    return g;
  }
  const step=(g,a)=>E.reduce(g,a).state;
  function play(g,id) {g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});}
  const end=g=>step(g,{type:'endTurn'});
  const pick=(g,uid)=>step(g,{type:'pick',uid});
  assert(E.COLLECTIBLE_STARTERS.includes('GOLEM_TEST'));
  assert(!E.BUYABLE_POOL.includes('GOLEM_TEST'));
  for(const side of [0,1]) {
    for(const [id,n] of [['GOLEM1',1],['M10',3],['NWL3',3],['GOLEM2',2],['NGA3',3]]) {
      let g=game(side);
      g.players[side].enchants=[enchant('SUPPLY_LINE'),enchant('SUPPLY_LINE')];
      g.players[1-side].enchants=[enchant('SUPPLY_LINE')];
      g.players[side].field=[mon(id),mon('GOLEM_TEST'),mon('M1')];
      g=play(g,id);
      assert.equal(g.players[side].field.at(-1).guts,n,id);
    }
    for(const [id,target,mana] of [['GOLEM1','GOLEM2',2],['GOLEM1','M10',2],['GOLEM2','NGA3',2],['M10','NWL3',2],['NGA3','AEM',3],['NWL3','MIND_BURST',3],['GOLEM3','IRON_WALL',2]]) {
      let g=game(1-side);g.players[side].field=[mon(id)];
      g=end(g);
      assert.equal(g.pending?.reason,'GOLEM_UPKEEP',id);
      assert(g.pending.allowCancel);
      const owner=g.players[side], source=owner.field[0];
      assert(E.effectChoices(g).some(c=>c.id===target));
      const pass=pick(g,null);
      assert.equal(pass.players[side].mana,owner.mana);assert.equal(pass.players[side].field[0].guts,1);
      assert.equal(pick(g,'bad').pending?.reason,'GOLEM_UPKEEP');
      g=pick(g,target);
      assert.equal(g.players[side].field[0].uid,source.uid);
      assert.equal(g.players[side].field[0].guts,0);
      assert.equal(g.players[side].mana,owner.mana-mana);
      assert.equal(g.pending,null,'a newly summoned golem cannot trigger this upkeep');
      assert(g.players[side][E.DB[target].t==='mon'?'field':'hand'].some(c=>c.id===target));
    }
    for(const id of ['GOLEM3','MANA_GIANT']) for(const kin of [false,true]) {
      let g=game(side);g.players[side].discard=[card(kin?'GOLEM_TEST':id)];g=play(g,id);
      const p=g.players[side],m=p.field[0];assert(m,id);
      assert.equal(id==='GOLEM3'?E.effAtk(p,m,g):E.curHp(p,m),id==='GOLEM3'?(kin?7:1):(kin?14:7));
    }
    {
      let g=game(side);g.players[1-side].field=['GOLEM2','NWL3','M10','GOLEM3'].map(id=>mon(id));g.players[side].enchants=[enchant('SUPPLY_LINE')];
      g=play(g,'REFRESH_HAND');assert.equal(g.players[1-side].hp,55);assert.equal(g.players[side].enchants.length,0);
      g.players[side].field=[];g=play(g,'GOLEM_TEST');assert.equal(g.players[1-side].hp,55);
      g.players[1-side].field.push(mon('NGA3'));g=play(g,'NGA3');
      assert.deepEqual(g.players[1-side].field.slice(-2).map(m=>m.guts),[2,2]);
      g.players[1-side].field=g.players[1-side].field.filter(m=>m.id==='GOLEM3');
      g=play(g,'NGA3');assert.equal(g.players[1-side].field[0].guts,2);
    }
    {
      let g=game(side);const p=g.players[1-side];p.field=[mon('GOLEM_TEST')];p.enchants=[enchant('SUPPLY_LINE')];
      g=play(g,'DISARM1');
      if(g.pending)g=step(g,{type:'chooseTarget',uid:p.enchants[0].card.uid});
      assert.deepEqual(g.players[1-side].field.map(m=>m.id),['GOLEM_TEST','GOLEM1']);
      assert.equal(g.players[1-side].field[1].guts,1);
      g=game(side);g.players[1-side].field=[mon('GOLEM_TEST')];g.players[1-side].enchants=[enchant('RUNE_BARRIER')];
      g=end(g);assert.equal(g.players[1-side].field.length,2,'Rune Barrier destroys itself and now triggers Trial Golem');
    }
    {
      let g=game(side);g.players[side].field=[mon('MANA_GIANT'),mon('GOLEM_TEST')];g.players[1-side].field=[mon('MANA_GIANT')];
      g.players[side].mana=5;g.players[side].buysTurn={M1:2};
      g=play(g,'BUYOUT');assert.equal(g.players[side].mana,5-E.playCost(E.DB.BUYOUT,g.players[side])+2);
      assert(!E.hasPassive(g.players[1-side].field[0],'void'));
      g=play(g,'BUYOUT');assert.equal(g.players[1-side].field[0].atkMod,2);assert.equal(g.players[1-side].field[0].defMod,2);
      g.players[side].maxMana=30;g=play(g,'BUYOUT');assert.equal(g.players[1-side].field[0].atkMod,2,'cap');
    }
    {
      let g=game(side);for(let i=0;i<3;i++)g=play(g,'REFRESH_HAND');
      g=play(g,'REFRESH_HAND');assert.equal(g.players[side].usesTurn.REFRESH_HAND,3);
      assert(E.playBlockReason(g,side,g.players[side].hand.at(-1)));
      g=end(end(g));assert.equal(g.players[side].usesTurn.REFRESH_HAND??0,0);
    }
  }
  {
    let g=game(1);g.players[0].field=[mon('GOLEM1'),mon('GOLEM1')];g.players[0].maxMana=2;
    g=pick(end(g),'M10');assert.equal(g.pending,null);assert.equal(g.players[0].field[1].guts,1);
    g=game(1);g.players[0].field=[mon('GOLEM1'),...Array.from({length:E.FIELD_MAX-1},()=>mon('M1'))];
    assert.equal(end(g).pending,null);
    g=game(1);g.players[0].field=[mon('GOLEM1',{guts:0})];assert.equal(end(g).pending,null);
  }
  {
    const g=game(),p=g.players[0];delete g.golemsReworked;
    p.field=[mon('GOLEM2',{guts:0,passive:['guts','counter'],aura:'leaderGolem',def:6,dmg:2})];
    p.hand=[card('REFRESH_HAND')];delete p.hand[0].maxUsesPerTurn;
    E.restoreReworkedCards(g);assert.deepEqual([p.field[0].aura,p.field[0].guts,p.field[0].def,p.field[0].dmg],[undefined,0,3,2]);
    assert.deepEqual(p.field[0].passive,['guts']);assert.equal(p.hand[0].maxUsesPerTurn,3);
    const snapshot=structuredClone(g);E.restoreReworkedCards(g);assert.deepEqual(g,snapshot);
  }
  console.log('PASS Golem rework, both seats, six upkeep sources, spell and crystal reactions, starter, Refresh and room migration');
} finally {await rm(dir,{recursive:true,force:true});}
