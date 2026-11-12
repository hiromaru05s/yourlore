import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-chosen-dungeon-'));
try {
  await build({stdin:{contents:"export * from './client/src/shared/engine';export {botActions} from './client/src/shared/botActions';export {DB,STARTERS} from './client/src/shared/cards';export {CARD_EFFECT_TEXT} from './client/src/shared/cardEffectText';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs',plugins:[{name:'test-hooks',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},async({path:p})=>({contents:await fs.readFile(p,'utf8')+'\nexport {resolveOnSummon,applySpell,makeCtx};',loader:'ts'}));}}]});
  const E=await import(tmp+'/engine.mjs'),{DB,STARTERS,CARD_EFFECT_TEXT}=E;
  let seq=0;
  const card=(id,extra={})=>({...structuredClone(DB[id]??STARTERS[id]),uid:'chosen-test-'+(++seq),...extra});
  const mon=(id,extra={})=>card(id,{dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
  function fresh(){
    const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    g.turn=5;g.pending=null;
    for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],removed:[],enchants:[],traps:[],quests:[],hp:40,maxMana:20,mana:20,brand:0});
    return g;
  }

  // Colosseum already owns the first turn-start choice; the Chosen Mage offer
  // must appear immediately after that choice resolves.
  {
    const g=fresh(),p=g.players[0];
    const mage=mon('CHOSEN_MAGE');p.field=[mage];p.removed=Array.from({length:8},()=>card('STARTER_TRASH'));
    p.enchants=[{card:card('COLOSSEUM',{ench:'colosseum'}),turns:99,bornTurn:0}];
    g.cur=1;
    const start=E.reduce(g,{type:'endTurn'});
    assert.equal(start.state.pending?.reason,'colosseumPick');
    assert(!start.state.chosenMageQueued);
    const chosen=E.reduce(start.state,{type:'pick',uid:'CHOSEN_KNIGHT'});
    assert.equal(chosen.state.players[0].mana,start.state.players[0].mana-3);
    assert(!chosen.state.pending);assert(chosen.state.players[0].field.some(m=>m.id==='CHOSEN_KNIGHT'));
  }
  // Predator cannot eat the cost-7 Chosen Mage (its ward also blocks effects).
  {
    const g=fresh(),p=g.players[0],o=g.players[1],predator=mon('TPO5'),mage=mon('CHOSEN_MAGE');
    p.field=[predator];o.field=[mage];
    const events=[],ctx=E.makeCtx(g,events);
    E.resolveOnSummon(g,ctx,predator);
    assert(o.field.some(m=>m.uid===mage.uid));
    assert.equal(p.maxMana,20);
  }

  // Dungeon Depths now checks the opponent's 9 mana crystals and adds Brand
  // instead of reducing its owner's maximum mana.
  {
    const g=fresh(),p=g.players[0],spell=card('DUNGEON_FLOOR');
    p.hand=[spell];g.players[1].maxMana=8;
    assert(E.playBlockReason(g,0,spell)?.ko.includes('9 미만'));
    g.players[1].maxMana=9;
    assert.equal(E.playBlockReason(g,0,spell),null);
    const before=p.maxMana;
    const played=E.reduce(g,{type:'play',idx:0}),after=played.state.players[0];
    assert.equal(after.brand,1);
    assert.equal(after.maxMana,before);
    assert(played.events.some(e=>e.type==='log'&&e.html.includes('낙인 카운터 1개')));
    for(const [locale,minimum] of [['ja','9以上'],['ko','9 이상'],['en','9 mana crystals']]){
      assert(CARD_EFFECT_TEXT.DUNGEON_FLOOR[locale].includes(minimum),`${locale} condition text`);
      assert(CARD_EFFECT_TEXT.DUNGEON_FLOOR[locale].includes(locale==='ja'?'烙印カウンター':locale==='ko'?'낙인 카운터':'Brand counter'),`${locale} Brand text`);
      assert(!CARD_EFFECT_TEXT.DUNGEON_FLOOR[locale].includes(locale==='ja'?'マナ水晶-1':locale==='ko'?'마나 수정 -1':'Reduce your mana crystals'),`${locale} obsolete penalty removed`);
    }
  }
  for (const {base, field, displayed, allowed} of [
    {base: 8, field: ['M10', 'GOLEM1'], displayed: 9, allowed: true},
    {base: 9, field: ['TDE2'], displayed: 7, allowed: false},
  ]) {
    const g = fresh();
    const [caster, opponent] = g.players;
    const spell = card('DUNGEON_FLOOR');
    caster.hand = [spell];
    opponent.maxMana = base;
    opponent.field = field.map(id => mon(id));
    assert.equal(E.effMaxMana(opponent), displayed);
    assert.equal(E.playBlockReason(g, 0, spell) === null, allowed);
    assert.equal(E.botActions(g).some(action => action.type === 'play' && action.idx === 0), allowed);
    const result = E.reduce(g, {type: 'play', idx: 0}).state.players[0];
    assert.equal(result.brand, allowed ? 1 : 0);
    assert.equal(result.hand.some(c => c.uid === spell.uid), !allowed);
    if (!allowed) assert.equal(result.mana, caster.mana);
  }
  console.log('PASS chosen mage turn-start queue, Predator protection, and Dungeon Depths rules');
} finally { await fs.rm(tmp,{recursive:true,force:true}); }
