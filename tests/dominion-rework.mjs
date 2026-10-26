import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/dominion-');
try {
  await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/game.mjs'});
  const {createGame,reduce,DB,STARTERS,playCost,redactFor}=await import(dir+'/game.mjs');
  let seq=0;
  const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'dominion-'+(++seq)});
  const fresh=side=>{
    const g=createGame({mode:'online',seed:17,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    Object.assign(g,{turn:7,cur:side,phase:'main',pending:null});
    for(const p of g.players)Object.assign(p,{hp:100,mana:20,maxMana:20,hand:[],deck:Array.from({length:20},()=>card('STARTER_TRASH')),discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],skipTurns:0,skipNext:false,skipTurnSources:[],openingDrawReady:false});
    return g;
  };
  const play=g=>{g.players[g.cur].hand.push(card('DOMINION'));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
  const end=g=>{g.players[g.cur].hand=[];return reduce(g,{type:'endTurn'});};
  for(const side of [0,1]) {
    const g=fresh(side),before=structuredClone(g.players[1-side]);
    const r=play(g),p=r.state.players[side],o=r.state.players[1-side];
    assert.equal(p.hand.length,2);assert.equal(p.deck.length,18);assert.equal(p.maxMana,20);assert.equal(p.mana,20);
    assert.equal(o.maxMana,before.maxMana);assert.equal(o.mana,before.mana);assert.equal(o.skipTurns,1);
    assert.equal(r.state.cur,side);assert.equal(r.state.turn,7);
    assert.deepEqual(o.skipTurnSources,['DOMINION']);
    for(const id of ['STARTER_TRASH','M6','DISCOVERY_LARGE'])assert.equal(playCost(card(id),p),playCost(card(id),g.players[side]));
    for(const viewer of [0,1])assert.deepEqual(redactFor(r.state,viewer).players[1-side].skipTurnSources,['DOMINION']);
    const e=end(r.state);
    assert.equal(e.state.cur,side);assert.equal(e.state.turn,9);
    assert.deepEqual(e.events.filter(e=>e.type==='turnSkipped'),[{type:'turnSkipped',player:1-side,source:'DOMINION',remaining:0}]);
    assert.equal(e.state.players[1-side].deck.length,20,'skipped opponent gets no turn-start draw');
    assert.equal(e.state.players[1-side].skipTurns,0);
    assert.equal(end(e.state).state.cur,1-side,'opponent resumes normally after exactly one skip');
  }
  // Repeated casts share one unconsumed Dominion skip, preserving other cards' provenance.
  for(const sources of [[],['TIMEWARP','BLACK_NOVA']]) {
    let g=fresh(0);g.players[1].skipTurns=sources.length;g.players[1].skipTurnSources=[...sources];
    g=play(g).state;g=play(g).state;assert.equal(g.players[0].hand.length,4);
    const order=[...sources,'DOMINION'];assert.deepEqual(g.players[1].skipTurnSources,order);
    for(const source of order){const r=end(g);assert.equal(r.state.cur,0);assert.equal(r.events.find(e=>e.type==='turnSkipped').source,source);g=r.state;}
    assert.equal(end(g).state.cur,1);
  }
  // Spell replay draws twice but shares the same Dominion skip; cancelled spells resolve neither.
  {const g=fresh(0),echo=Object.values(DB).find(c=>c.ench==='runeEcho');assert(echo);g.players[0].enchants=[{card:card(echo.id),turns:99}];const r=play(g);assert.equal(r.state.players[0].hand.length,4);assert.deepEqual(r.state.players[1].skipTurnSources,['DOMINION']);}
  {const g=fresh(0);g.players[1].traps=[{card:{id:'legacy-null',uid:'null',t:'trap',cost:0,react:'nullspell',name:'Null'}}];const r=play(g);assert(r.events.some(e=>e.type==='trapReveal'));assert.equal(r.state.players[0].hand.length,0);assert.equal(r.state.players[1].skipTurns,0);}
  // Old saved cost overrides have no effect after the rework.
  {const g=fresh(0);g.players[0].expansion={turn:7,extraDraw:0,firePlayed:[],fireDiscount:0,dominion:3};for(const id of ['STARTER_TRASH','M6'])assert.equal(playCost(card(id),g.players[0]),playCost(card(id)));}
  console.log('PASS Dominion: both sides, draw 2, unchanged mana/cost, exactly one skip, normal resumption, redaction, non-stacking, mixed FIFO, echo, nullification, legacy cost state');
} finally {await rm(dir,{recursive:true,force:true});}
