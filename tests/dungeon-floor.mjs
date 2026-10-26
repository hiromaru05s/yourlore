import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'dungeon-floor-'));
try {
 await build({stdin:{contents:"export * from './client/src/ui/dungeonFloor/events';export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
 const E=await import(path.join(dir,'engine.mjs'));
 let cases=0;
 for(const side of [0,1])for(const slots of [0,2,7]){
  const seen=new Set();
  for(let seed=1;seed<300&&seen.size<6;seed++){
   const g=E.createGame({mode:'bot',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
   g.opening=undefined;g.turn=5;g.cur=side;g.phase='main';g.pending=null;
   for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=p.maxMana=10;p.enchants=[];p.quests=[];p.traps=[];p.field=i===side?Array.from({length:7-slots},(_,j)=>({...E.DB.M4,uid:`old-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0})):[];p.hand=i===side?[{...E.DB.DUNGEON_FLOOR,uid:'cast'}]:[];}
   const r=E.reduce(g,{type:'play',idx:0}),index=r.events.findIndex(e=>e.type==='dice'&&e.source.id==='DUNGEON_FLOOR');assert(index>=0);
   const roll=r.events[index].rolls[0];if(seen.has(roll))continue;seen.add(roll);
   const events=E.dungeonFloorSummons(r.events,index);assert.equal(events.length,Math.min(slots,roll));assert(events.every(e=>e.player===side&&e.id==='MIMIC'&&e.source==='DUNGEON_FLOOR'));
   assert.equal(r.state.players[side].maxMana,9);cases++;
  }assert.equal(seen.size,6);
 }
 const dice={type:'dice',source:{id:'DUNGEON_FLOOR',player:0},player:0,rolls:[6]};
 const own={type:'summon',source:'DUNGEON_FLOOR',player:0,id:'MIMIC',uid:'a'};
 assert.deepEqual(E.dungeonFloorSummons([dice,{...own,source:undefined},{...own,player:1},own,{type:'playSpell'},own],0),[own]);
 const dom=new JSDOM('<div id="portraitMe"><i class="pt-ring"></i></div><div id="portraitOpp"><i class="pt-ring"></i></div><div id="meRow"><div class="zone-mon"></div></div><div id="oppRow"><div class="zone-mon"></div></div>',{pretendToBeVisual:true});
 for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
 globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
 globalThis.innerWidth=1440;globalThis.innerHeight=1040;
 HTMLElement.prototype.getBoundingClientRect=()=>({x:200,y:500,width:80,height:110});
 let frames=new Map(),id=0,clock=0,reduced=false,alloc=0,disposed=0,draws=[],failed=false;
 globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id;};globalThis.cancelAnimationFrame=i=>frames.delete(i);
 globalThis.__floorScene=()=>{if(failed)throw Error('no GPU');alloc++;return{ready:async()=>{},draw:s=>draws.push(s),dispose(){disposed++;}};};
 await build({entryPoints:['client/src/ui/dungeonFloor/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'scene-fixture',setup(b){
  b.onResolve({filter:/^\.\/stage$/},()=>({path:'stage',namespace:'fixture'}));
  b.onResolve({filter:/^\.\.\/cardView$/},()=>({path:'card',namespace:'fixture'}));
  b.onResolve({filter:/^\.\.\/sound$/},()=>({path:'sound',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='stage'?'export class Stage {constructor(){return globalThis.__floorScene()}}':a.path==='card'?'export function cardEl(c){const e=document.createElement("div");e.className="card";e.dataset.uid=c.uid;return e;}':'export function sfx(){}'}));
 }}]});
 const R=await import(path.join(dir,'runtime.mjs')),flush=()=>new Promise(r=>setTimeout(r,0));
 const cards=Array.from({length:3},(_,i)=>({...E.DB.MIMIC,uid:'new'+i}));
 const reset=()=>{for(const z of document.querySelectorAll('.zone-mon'))z.innerHTML='<div class="slot"></div>'.repeat(7);};
 const advance=ms=>{for(let x=0;x<ms;x+=50){clock+=50;for(const [i,f]of [...frames]){frames.delete(i);f(clock);}}};
 for(const mine of [true,false]){
  reset();const s=R.createDungeonFloor(cards,mine,new AbortController().signal);const first=s.land(cards[0].uid);await flush();advance(2200 * .75);assert.equal((await first).dataset.uid,cards[0].uid);
  advance(2000 * .75);assert.equal(document.querySelectorAll('.card').length,1,'next arrival waits for event ownership');
  const second=s.land(cards[1].uid);advance(100 * .75);await second;
  const third=s.land(cards[2].uid);advance(7000 * .75);await third;await s.done;
  assert.equal(document.querySelectorAll('.card').length,3);assert.equal(draws.at(-1).side,mine?0:1);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('canvas').length,0);
 }
 for(const mode of ['abort','resize','hidden','detached','reduced','gpu-failure','context-lost']){
  reset();reduced=mode==='reduced';failed=mode==='gpu-failure';const abort=new AbortController();const s=R.createDungeonFloor(cards,true,abort.signal);const landed=s.land(cards[0].uid);await flush();
  if(mode==='abort')abort.abort();if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='hidden')document.dispatchEvent(new Event('visibilitychange'));if(mode==='detached'){document.querySelector('[data-reserved-uid]').remove();advance(100 * .75);}if(mode==='context-lost')document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost'));
  await landed;await s.done;assert.equal(frames.size,0);assert.equal(document.querySelectorAll('canvas').length,0);
 }
 assert.equal(alloc,disposed);dom.window.close();console.log(`PASS ${cases} reducer roll/side/capacity cases; exact source ownership; sequential landing barriers; both directions; abort/resize/visibility/detachment/reduced/GPU failure/context loss; renderer and RAF cleanup`);
}finally{await rm(dir,{recursive:true,force:true});}
