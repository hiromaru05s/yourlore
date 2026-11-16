import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-goblin-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './client/src/shared/protocol'; export * from './server/src/reworkedCardSnapshot'; export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs'); const {DB,STARTERS,DECK_POOL,createGame,reduce,effAtk,curHp,playBlockReason,effectChoices,hasPassive,redactFor,greedyDecide,effMaxMana,ARIES_OPPONENTS}=E;
 let seq=0,checks=0;
 const card=id=>{assert(DB[id]||STARTERS[id],id);return {...structuredClone(DB[id]||STARTERS[id]),uid:'test-'+(++seq)};};
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});g.turn=3;g.pending=null;return g;};
 const step=(g,a)=>reduce(g,a).state;
 const play=(g,id)=>{g.players[g.cur].mana=30;g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const pick=(g,uid)=>step(g,{type:'pick',uid});
 const end=g=>step(g,{type:'endTurn'});
 const ench=id=>({card:card(id),turns:99,bornTurn:0});
 function test(name,fn){fn();checks++;console.log('PASS',name);}
 for(const side of [0,1]){
  const other=1-side;
  test('Muster rejects purchases without spending mana or consuming market stock: '+side,()=>{
   for(const shop of ['buyMarket','buySupply'])for(const count of [0,1,2,3]){
    const g=fresh();g.cur=side;const p=g.players[side];p.field=Array.from({length:count},()=>mon('M2'));g.players[other].field=[mon('M2'),mon('M2')];
    const offer=card('QUICK_MUSTER');if(shop==='buyMarket'){g.market[0]=offer;g.marketStock[0]=1;}else {p.supply[0]=offer;}
    const result=reduce(g,{type:shop,i:0}),after=result.state;
    assert.equal(result.events.some(e=>e.type==='buy'&&e.id===offer.id),count<=1);
    assert.equal(after.players[side].field.length,count+(count<=1?3:0));
    if(count>1){assert.equal(after.players[side].mana,p.mana);assert.equal(shop==='buyMarket'?after.marketStock[0]:after.players[side].supply[0].uid,shop==='buyMarket'?1:offer.uid);}
   }
  });
  test('Hexers grant only unique other names; puppet adds three: '+side,()=>{
   for(const [ids,n] of [[[],2],[['HEXER3','HEXER1','HEXER1'],3],[['HEXER1','HEXER2'],4]]){
    let g=fresh();g.cur=side;g.players[side].field=ids.map(mon);g=play(g,'HEXER3');assert.equal(g.players[other].discard.filter(c=>c.id==='CURSE').length,n);
   }
   let g=fresh();g.cur=side;g=play(g,'HEX_PUPPET');assert.equal(g.players[other].discard.filter(c=>c.id==='CURSE').length,3);
  });
  test('Focus pays once, only on a completed eligible exile: '+side,()=>{
   for(const zone of ['deck','discard','field'])for(const [id,bonus] of [['HEXER1',0],['TDE3',2]]){
    let g=fresh();g.cur=side;const p=g.players[side];p.mana=7;p.hand=[card('FOCUS')];const target=zone==='field'?mon(id):card(id);p[zone].push(target);
    g=step(g,{type:'play',idx:0});const before=g.players[side].mana;assert.equal(before,6);assert.equal(pick(g,'missing').players[side].mana,before);
    assert.equal(pick(g,null).players[side].mana,before);g=pick(g,target.uid);
    assert(g.players[side].removed.some(c=>c.uid===target.uid));assert.equal(g.players[side].mana,before+bonus);assert.equal(pick(g,target.uid).players[side].mana,before+bonus);
   }
  });
  test('Holy Sword closes the empty target prompt after the last eligible ally dies: '+side,()=>{
   for(const preselect of [false,true]){
    let g=fresh();g.cur=side;const p=g.players[side],half={...mon('HALF_ELF'),dmg:1};p.field=[half];p.enchants=[ench('WORLD_CARE')];g.players[other].field=[mon('GOLEM3')];p.hand=[card('GS5_4')];
    const result=reduce(g,{type:'play',idx:0,...preselect&&{sourceUid:p.hand[0].uid,targets:[half.uid]}});
    assert.equal(result.state.players[side].field.length,0);assert.equal(result.state.pending,null);assert(!result.events.some(e=>e.type==='needTarget'&&e.pending.reason==='buffTurn'));assert.equal(end(result.state).turn,g.turn+1);
   }
   let g=fresh();g.cur=side;const ally=mon('M2');g.players[side].field=[ally];g=play(g,'GS5_4');assert.equal(g.pending.reason,'buffTurn');g=pick(g,ally.uid);assert.equal(g.players[side].field[0].tempAtk,8);
  });
 }
 test('saved rooms cancel impossible buffs but preserve viable buffs and Focus choices',()=>{
  for(const legal of [false,true]){
   let g=fresh();delete g.balance98Applied;if(legal)g.players[0].field=[mon('M2')];
   g.pending={kind:'myMon',reason:'buffTurn',hint:'',allowCancel:false,data:{val:8}};
   E.restoreReworkedCards(g);assert.equal(!!g.pending,legal);assert(g.balance98Applied);
  }
  let g=fresh();const target=card('TDE3');g.players[0].discard=[target];g=play(g,'FOCUS');delete g.pending.data.sourceId;delete g.balance98Applied;g.players[0].mana=3;E.restoreReworkedCards(g);assert.equal(pick(g,target.uid).players[0].mana,5);
 });
 test('demon market and hand costs are distinct; printed stat changes are current',()=>{
  for(const [id,market,hand] of [['TDE2',2,3],['TDE3',4,5]]){
   let g=fresh();const c=card(id),p=g.players[0];assert.equal(E.buyCost(p,c),market);assert.equal(E.playCost(c,p),hand);p.mana=hand-1;p.hand=[c];assert.equal(step(g,{type:'play',idx:0}).players[0].field.length,0);p.mana=hand;assert.equal(step(g,{type:'play',idx:0}).players[0].field[0].uid,c.uid);
  }
  for(const [id,a,d] of [['CAPTAIN',5,1],['TDE3',7,5],['GOBLIN_LEADER',4,2]])assert.deepEqual([DB[id].atk,DB[id].def],[a,d]);
 });
 console.log(checks,'v98 integration cases passed');
} finally {await fs.rm(dir,{recursive:true,force:true});}
