import assert from 'node:assert/strict';
import {build} from 'esbuild';

const code = await build({stdin:{contents:`export * from './client/src/shared/engine';
  export * from './client/src/shared/cards'; export * from './client/src/shared/protocol';
  export * from './server/src/reworkedCardSnapshot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const E=await import('data:text/javascript;base64,'+Buffer.from(code.outputFiles[0].text).toString('base64'));
let seq=0;
const card=id=>({...structuredClone(E.DB[id]),uid:'test-'+ ++seq});
const egg=(turns=3)=>({...card('DRAGON_EGG'),hatch:turns,dur:4,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false});
function fresh(side=0) {
  const g=E.createGame({mode:'online',seed:32,starting:side,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
  g.turn=5;g.cur=side;g.pending=null;g.phase='main';delete g.mulligan;
  for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],enchants:[],traps:[],quests:[],removed:[],supply:[],mana:10,maxMana:10,hp:100});
  g.market=[card('M1')];g.marketStock=[3];return g;
}
const step=(g,a)=>E.reduce(g,a).state;
const target=(g,uid)=>step(g,{type:'pick',uid});
function cast(g,c){g.players[g.cur].hand.push(c);return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});}
function has(p,zone,c){return p[zone].some(x=>(x.card??x).uid===c.uid);}
const partners=['GUILD_CO','SLUM','SLUM_MERCHANT','SHARED_MARKET','MERCH1','MERCH2','DARK_MERCHANT'];
for(const side of [0,1]){
  for(const partner of partners)for(const zone of ['hand','deck','discard','market','supply']){
    let g=fresh(side);const c=card('INCUBATOR_S'),p=g.players[side],op=g.players[1-side];
    if(zone==='market')g.market=[card(partner)];else if(zone==='supply')p.supply=[card(partner)];else op[zone]=[card(partner)];
    p.hand=[c];const view=E.redactFor(g,side);assert.equal(E.playBlockReason(view,side,c),null);
    if(zone==='deck'||zone==='hand')assert.equal(view.players[1-side][zone][0].id,'HIDDEN');
    g=step(g,{type:'play',idx:0});assert.equal(g.players[side].maxMana,11);assert(has(g.players[side],'removed',c));
    assert(!g.players[side].discard.some(x=>x.uid===c.uid));
  }
  for(const [id,amount,accelerate] of [['INCUBATOR_S',1,2],['INCUBATOR',2,5]]){
    let g=fresh(side),p=g.players[side];const e=egg(7);p.field=[e];p.deck=[card('MERCH1')];
    const c=card(id);g=cast(g,c);assert.equal(g.pending.reason,'INCUBATOR_EFFECT');
    const retry=target(g,'invalid');assert.equal(retry.pending.reason,'INCUBATOR_EFFECT');
    const declined=target(g,null);assert(has(declined.players[side],'discard',c));assert.equal(declined.players[side].field[0].hatch,7);
    const hatched=target(g,e.uid);assert.equal(hatched.players[side].field[0].hatch,7-accelerate);assert(has(hatched.players[side],'discard',c));
    g=target(JSON.parse(JSON.stringify(g)),'incubator-sale');assert.equal(g.players[side].maxMana,10+amount);assert(has(g.players[side],'removed',c));
    const second=card(id);g=cast(g,second);assert.equal(g.pending.reason,'incubate');
    g=target(g,e.uid);assert.equal(g.players[side].field[0].hatch,7-accelerate);
    g.players[side].field=[];assert(E.playBlockReason(g,side,card(id)));
    const opposite=card(id);g.cur=1-side;g=cast(g,opposite);assert.equal(g.players[1-side].maxMana,10+amount);
  }
  {
    let g=fresh(side);g.players[side].deck=[card('SLUM')];
    for(const id of ['INCUBATOR_S','INCUBATOR'])g=cast(g,card(id));
    assert.equal(g.players[side].maxMana,13);
  }
  {
    let g=fresh(side);const p=g.players[side],normal=card('INCUBATOR_S'),rare=card('INCUBATOR');
    p.enchants=[{card:card('GUILD_CO'),turns:99}];p.removed=[card('SLUM')];
    assert(E.playBlockReason(g,side,normal));assert.equal(E.playBlockReason(g,side,rare),null);
    g=cast(g,rare);assert(has(g.players[side],'enchants',rare));assert(!has(g.players[side],'discard',rare));
    g=cast(g,{...card('DRAGON_EGG'),hatchTurns:5});assert.equal(g.pending.reason,'incubate');const uid=g.players[side].field[0].uid;
    g=target(g,uid);assert(!has(g.players[side],'enchants',rare));assert(has(g.players[side],'discard',rare));
    assert(!g.players[side].field.some(m=>m.uid===uid));
  }
  {
    let g=fresh(side);const c=card('INCUBATOR');g=cast(g,c);g=step(g,{type:'endTurn'});g=cast(g,card('SLUM_MERCHANT'));
    g=target(g,g.market[0].uid);assert(has(g.players[side],'enchants',c));assert.equal(g.players[side].maxMana,10);
    g=step(g,{type:'endTurn'});assert(has(g.players[side],'removed',c));assert.equal(g.players[side].maxMana,12);
  }
  {
    let g=fresh(side);const c=card('INCUBATOR');g=cast(g,c);const d=card('INCUBATOR');g=cast(g,d);
    g.players[side].deck=[card('SLUM')];const e=egg(2);g.players[side].field=[e];
    g=step(g,{type:'endTurn'});assert.equal(g.pending.reason,'INCUBATOR_EFFECT');assert.equal(g.cur,side);
    g=target(g,'incubator-sale');assert.equal(g.pending.reason,'incubate');g=target(g,e.uid);assert.equal(g.cur,1-side);
    assert.equal(g.players[side].maxMana,12);assert(has(g.players[side],'removed',c));assert(has(g.players[side],'discard',d));
  }
  {
    let g=fresh(side);const c=card('INCUBATOR');
    g=cast(g,c);const p=g.players[side],op=g.players[1-side];
    op.field=[{...egg(),...card('GHOST'),hatch:undefined}];
    p.enchants.push({card:{...card('M1'),ench:'rift'},turns:20});p.hp=40;
    p.hand=[card('M1')];g.market=[card('MERCH1')];
    g=step(g,{type:'play',idx:0});assert(has(g.players[side],'removed',c));
    assert.equal(g.players[side].hp,41);assert.equal(g.players[1-side].hp,98);
  }
  {
    let g=fresh(side);const c=card('INCUBATOR_S'),e=egg(1);
    c.textJa='old';g.players[side].discard=[c];g.players[side].field=[e];
    delete g.incubatorsReworked;
    g.pending={kind:'myMon',reason:'incubate',hint:'',hintJa:'',allowCancel:true,data:{val:2}};
    E.restoreReworkedCards(g);assert.equal(c.textJa,E.DB.INCUBATOR_S.textJa);
    g=target(g,e.uid);assert.equal(g.players[side].discard.filter(x=>x.uid===c.uid).length,1);
    assert(!g.players[side].field.some(m=>m.uid===e.uid));
  }
  {
    const g=fresh(side),p=g.players[side];p.traps=Array.from({length:E.ST_MAX},()=>({card:card('M1')}));
    assert(E.playBlockReason(g,side,card('INCUBATOR')));p.field=[egg(1)];assert.equal(E.playBlockReason(g,side,card('INCUBATOR')),null);
  }
  {
    let g=fresh(side);const c=card('INCUBATOR_S');g.market=[card('SLUM')];g.players[1-side].traps=[{card:{...card('M1'),t:'trap',react:'nullspell'}}];
    g=cast(g,c);assert(has(g.players[side],'discard',c));assert.equal(g.players[side].maxMana,10);assert(!g.players[side].onceUsed?.includes(c.id));
  }
}
console.log('PASS both Incubators, 7 trade records, hidden and public sources, separate limits, both choices, deferred hatching and trade, expiry, full field and negation');
