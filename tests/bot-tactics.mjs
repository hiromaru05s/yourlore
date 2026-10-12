import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-tactics-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/botTactics';export * from './client/src/shared/botObservation';export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0;
 const card=id=>({...C.DB[id],uid:'tactic-'+serial++});
 const mon=(atk,exhausted=false)=>({...card('M2'),tribe:undefined,atk,def:5,dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted,summonedTurn:0});
 function fresh(){const g=C.createGame({mode:'bot',seed:27,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=8;g.pending=null;g.market=[];for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:2,maxMana:8});return g;}
 for(const difficulty of ['hard','hell']){
  let g=fresh();g.players[0].field=[mon(9,true),mon(2)];g.players[0].hand=[card('S3')];g.players[1].hp=5;
  for(let i=0;i<4&&!g.over;i++){const a=C.botDecide(g,difficulty);g=C.reduce(g,a).state;}
  assert.equal(g.winner,0,'buff the ready small attacker, not the exhausted large one');
 }
 const noProof=fresh();noProof.players[0].hand=[card('GAMBLE')];noProof.players[0].mana=4;noProof.players[1].hp=1;assert.equal(C.forcedWin(noProof,900),undefined,'a lucky die is not a forced win');
 const draw=fresh();draw.players[0].hand=[card(Object.keys(C.DB).find(id=>C.DB[id].act==='draw'))];draw.players[0].hand[0].val=1;draw.players[0].deck=[card('FLAME')];draw.players[0].mana=20;draw.players[1].hp=1;assert.equal(C.reduce(draw,{type:'play',idx:0}).state.rng,draw.rng,'fixture draws without random bookkeeping');assert(C.reduce(draw,{type:'play',idx:0}).state.players[0].hand.some(c=>c.id==='FLAME'));assert.equal(C.forcedWin(draw,900),undefined,'sampled future draw is not a forced win');
 const trapped=fresh();trapped.players[0].field=[mon(20)];trapped.players[1].hp=1;trapped.players[1].traps=[{card:card(Object.keys(C.DB).find(id=>C.DB[id].t==='trap'))}];assert.equal(C.forcedWin(trapped,900),undefined,'hidden trap is not a forced win');
 const inspected=fresh();inspected.players[1].deck=[card('S1'),card('S1'),card('M2')];inspected.pending={kind:'giantShop',reason:'exileOppDeck',allowCancel:true,hint:'',hintJa:'',data:{ids:['S1','M2']}};
 for(let seed=0;seed<10;seed++){const view=C.observationSample(inspected,0,seed);assert.deepEqual([...new Set(view.players[1].deck.map(c=>c.id))].sort(),['M2','S1']);assert.equal(view.players[1].deck.length,3);}
 for(const tier of ['hard','hell']){const g=C.createGame({mode:'bot',seed:21,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;const progress=[];const final=C.botDecide(g,tier,a=>progress.push(a));assert(progress.length>0);assert.deepEqual(final,C.botDecide(g,tier));for(const a of progress)assert.notDeepEqual(C.reduce(g,a).state,g,'anytime recommendations progress legally');}
 console.log('PASS multi-action lethal, ready-target selection, dice/trap proof boundaries, public deck ID constraints');
}finally{await rm(dir,{recursive:true,force:true});}
