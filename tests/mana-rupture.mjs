import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-mana-rupture-');
const dom=new JSDOM('<div class="portrait" id="portraitOpp"><span class="pt-hp"><b>3</b></span></div>',{pretendToBeVisual:true});
try {
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {lethalOutcomeSide} from './client/src/ui/manaRupture/plan';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/plan.mjs'});
 const {createGame,reduce,DB,lethalOutcomeSide}=await import(dir+'/plan.mjs');
 for(const side of [0,1]){
  const before=createGame({mode:'online',seed:71,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  before.turn=3;before.cur=side;before.pending=null;before.phase='main';
  for(const p of before.players)Object.assign(p,{openingDrawReady:false,field:[],shield:0,dew:0,hp:3});
  before.players[side].field=[{...DB.M4,uid:'lethal',exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}];
  const result=reduce(before,{type:'attack',uid:'lethal'});
  assert(result.state.over);assert.equal(result.state.winner,side);assert.equal(lethalOutcomeSide(before,result),1-side);
  assert.equal(lethalOutcomeSide(result.state,result),null,'reconnect/duplicate final snapshot');
  assert.equal(lethalOutcomeSide(before,{...result,events:[]}),null,'no invented damage for modal fixtures');
  assert.equal(lethalOutcomeSide(before,{...result,state:{...result.state,winner:null}}),null,'draw');
  assert.equal(lethalOutcomeSide(before,{...result,state:{...result.state,over:false}}),null,'nonlethal batch');
  const surrender=reduce(before,{type:'surrender',player:side});assert.equal(lethalOutcomeSide(before,surrender),null);
  const spell={state:structuredClone(result.state),events:[{type:'damage',player:1-side,amount:7},{type:'win',winner:side}]};
  assert.equal(lethalOutcomeSide(before,spell),1-side,'spell/reflection lethal uses the same rule');
 }
 for(const key of ['window','document','HTMLElement','Element','Node'])globalThis[key]=dom.window[key];
 globalThis.innerWidth=1280;globalThis.innerHeight=720;
 let now=0,seq=0,reduced=false,hidden=false;const frames=new Map(),timers=new Map(),changes=new Set();
 Object.defineProperty(document,'hidden',{get:()=>hidden,configurable:true});
 globalThis.matchMedia=()=>({get matches(){return reduced;},addEventListener:(_t,fn)=>changes.add(fn),removeEventListener:(_t,fn)=>changes.delete(fn)});
 globalThis.performance={now:()=>now};
 globalThis.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 window.setTimeout=(fn,delay)=>{timers.set(++seq,{fn,at:now+delay});return seq;};globalThis.clearTimeout=id=>timers.delete(id);
 const state=globalThis.__ruptureTest={surfaces:[],draws:[],disposed:0,closed:0,constructed:0,missing:false,fail:false,drawFail:false,captureWait:null};
 await build({entryPoints:['client/src/ui/manaRupture/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/runtime.mjs',loader:{'.css':'empty'},plugins:[{name:'native-boundary-fixtures',setup(b){
  b.onResolve({filter:/outcomeSurface$/},()=>({path:'surface',namespace:'test'}));
  b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'test'}));
  b.onResolve({filter:/^\.\/sound$/},()=>({path:'sound',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='surface'?`export async function captureOutcomeSurface(root,signal){const s=globalThis.__ruptureTest;if(s.captureWait)await s.captureWait;if(signal.aborted||s.missing)return null;const c=document.createElement('canvas');c.dataset.hp=root.querySelector('b').textContent;s.surfaces.push(c);return c;}export function outcomeAnchor(){return {x:200,y:100,width:120,height:120};}`:path==='renderer'?`export class ManaRuptureRenderer{constructor(source,canvas){const s=globalThis.__ruptureTest;if(s.fail)throw Error('GPU unavailable');s.constructed++;this.source=source;this.canvas=canvas;this.count=42;}updateSurface(surface){this.canvas.dataset.hp=surface.dataset.hp;}draw(w,h,time){const s=globalThis.__ruptureTest;if(s.drawFail)throw Error('context failed');s.draws.push(time);}dispose(){if(this.dead)return;this.dead=true;globalThis.__ruptureTest.disposed++;this.source.width=this.source.height=1;this.canvas.dispatchEvent(new window.Event('webglcontextlost'));}}`:`export function ruptureSound(){return {tick(){},close(){globalThis.__ruptureTest.closed++;}};}`}));
 }}]});
 const {prepareManaRupture,cancelManaRuptures}=await import(dir+'/runtime.mjs');
 const root=document.querySelector('.portrait');
 const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
 const tick=async time=>{now=time;for(const [id,{fn,at}] of [...timers])if(at<=now){timers.delete(id);fn();}const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));await flush();};
 const assertClean=()=>{assert.equal(document.querySelectorAll('.mana-rupture').length,0);assert.equal(frames.size,0);assert.equal(changes.size,0);assert.equal(timers.size,0);};
 let effect=prepareManaRupture(root);await effect.ready;
 assert.equal(state.constructed,1);assert.equal(document.querySelector('.mana-rupture'),null,'warmup cannot start an explosion');
 root.querySelector('b').textContent='0';await flush();assert.equal(document.querySelector('.mana-rupture'),null,'DOM mutation cannot invent a lethal event');
 let finished=false;effect.finished.then(()=>finished=true);effect.start();effect.start();await flush();
 assert.equal(document.querySelector('.mana-rupture canvas').dataset.hp,'0','contact capture has final HP');
 assert.equal(state.surfaces.length,2);await tick(2000);assert(!finished,'result remains gated through breakup');await tick(3549);assert(!finished);await tick(3550);await effect.finished;
 assert.equal(root.dataset.manaRuined,'true','native rerenders stay hidden beneath result');assert.equal(state.disposed,1);assert.equal(state.closed,1);assertClean();effect.cancel();effect.cancel();assert(!root.hasAttribute('data-mana-ruined'));
 for(const cancelBy of ['skip','resize','pagehide','visibility','reduced','context','detach']){
  now+=10000;effect=prepareManaRupture(root);await effect.ready;effect.start();await flush();
  if(cancelBy==='skip')cancelManaRuptures();
  else if(cancelBy==='visibility'){hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));hidden=false;}
  else if(cancelBy==='reduced'){for(const fn of [...changes])fn();}
  else if(cancelBy==='context')document.querySelector('.mana-rupture canvas').dispatchEvent(new window.Event('webglcontextlost'));
  else if(cancelBy==='detach'){root.remove();await tick(now+16);document.body.append(root);}
  else window.dispatchEvent(new window.Event(cancelBy));
  await effect.finished;assertClean();assert(!root.hasAttribute('data-mana-ruined'));
 }
 reduced=true;effect=prepareManaRupture(root);await effect.ready;await effect.finished;assertClean();reduced=false;
 for(const failure of ['missing','fail','drawFail']){state[failure]=true;effect=prepareManaRupture(root);await effect.ready;await effect.finished;assertClean();state[failure]=false;}
 let release;state.captureWait=new Promise(resolve=>release=resolve);effect=prepareManaRupture(root);await tick(now+2501);await effect.ready;await effect.finished;release();await flush();state.captureWait=null;assertClean();
 // Cancellation while an in-flight contact capture is waiting also settles the result gate.
 effect=prepareManaRupture(root);await effect.ready;state.captureWait=new Promise(resolve=>release=resolve);effect.start();await flush();effect.cancel();await effect.finished;release();await flush();state.captureWait=null;assertClean();
 assert.equal(state.constructed,state.disposed,'every successfully constructed GPU stage is released exactly once');
 console.log('PASS mana rupture: both authoritative lethal sides; spell/reflection, draw/forfeit/rejoin exclusions; contact HP capture; single playback; result gate; skip/resize/hidden/detach/reduced/context failure; bounded loading; GPU/audio cleanup.');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
