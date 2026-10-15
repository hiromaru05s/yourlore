import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const tmp=await mkdtemp(path.join(tmpdir(),'market-crash-'));
const dom=new JSDOM('<div id="board"><div id="supplyMarket"><div class="card" data-uid="a"></div><div class="card" data-uid="b"></div><div class="slot"></div></div><button id="refreshBtn"></button></div>',{pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLButtonElement','Event','MouseEvent','KeyboardEvent'])globalThis[key]=dom.window[key];
let time=0,next=0,frames=new Map(),allocated=0,disposed=0,draws=[],failed=false;
const media=new dom.window.EventTarget();media.matches=false;
Object.assign(globalThis,{innerWidth:1000,innerHeight:800,devicePixelRatio:1,ResizeObserver:class{observe(){}disconnect(){}},matchMedia:()=>media,requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id)});
const savedPerf=globalThis.performance;globalThis.performance={now:()=>time};
globalThis.__iris=class{constructor(){if(failed)throw Error('GPU unavailable');allocated++;}draw(...args){draws.push(args);}dispose(){disposed++;}};
globalThis.__lang='ja';
const flush=async()=>{await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));};
const step=ms=>{time+=ms;for(const [id,f]of [...frames]){frames.delete(id);f(time);}};
const root=document.querySelector('#board');
for(const el of document.querySelectorAll('*'))el.getBoundingClientRect=()=>({x:100,y:200,left:100,top:200,right:170,bottom:300,width:70,height:100});
try{
 await build({entryPoints:['client/src/ui/marketCrash/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(tmp,'runtime.mjs'),plugins:[{name:'renderer-fixture',setup(b){
  b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onResolve({filter:/i18n$/},()=>({path:'lang',namespace:'fixture'}));b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='renderer'?'export const MarketCrashIris=globalThis.__iris;':a.path==='lang'?'export const getLang=()=>globalThis.__lang;':''}));
 }}]});
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine'; export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(tmp,'engine.mjs')});
 const {MarketCrashPresentation,crashTurn,crashReason}=await import(path.join(tmp,'runtime.mjs'));
 const E=await import(path.join(tmp,'engine.mjs'));
 for(const side of [0,1]){
  const s=E.createGame({mode:'bot',seed:81,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;s.opening=undefined;s.cur=side;s.turn=7;s.phase='main';s.pending=null;
  for(const [i,p]of s.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.field=[];p.traps=[];p.enchants=[];p.quests=[];p.hand=[{...E.DB.S5,uid:'crash'+i}];}
  const cast=E.reduce(s,{type:'play',idx:0}).state;assert.equal(crashTurn(cast),null);assert.equal(cast.players[1-side].refreshBlockNext,true);
  const active=E.reduce(cast,{type:'endTurn'}).state;assert.equal(crashTurn(active),`${active.turn}:${1-side}`);assert.equal(active.players[1-side].supply.filter(Boolean).length,2);
  const before=JSON.stringify(active.players[1-side].supply),mana=active.players[1-side].mana;const refused=E.reduce(active,{type:'refresh'}).state;assert.equal(JSON.stringify(refused.players[1-side].supply),before);assert.equal(refused.players[1-side].mana,mana);
  const done=E.reduce(active,{type:'endTurn'}).state;assert.equal(crashTurn(done),null);assert.equal(done.players[side].supply.filter(Boolean).length,3);
  const presentation=new MarketCrashPresentation(root);presentation.sync(cast);await flush();const count=allocated;assert.equal(document.querySelectorAll('.market-crash-hit').length,0);
  presentation.sync(active);await flush();assert.equal(allocated,count+1);assert.equal(document.querySelectorAll('.market-crash-canvas').length,1);assert(document.querySelector('#refreshBtn').disabled);
  step(1700);assert.equal(frames.size,0,'settled effect stops RAF');const settled=draws.at(-1)[1];presentation.sync(refused);step(1);assert.equal(draws.at(-1)[1],settled,'same turn rerender does not restart');assert.equal(allocated,count+1);
  const hit=document.querySelector('[data-target=refresh]'),tip=document.querySelector('[role=tooltip]');hit.dispatchEvent(new Event('pointerenter'));assert(!tip.hidden);assert.match(tip.textContent,/更新できません/);hit.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));assert(tip.hidden);
  presentation.sync(done);assert(hit.hidden);assert(tip.hidden);step(600);assert(draws.at(-1)[1]>=4600);step(800);assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);assert.equal(frames.size,0);presentation.dispose();assert.equal(document.querySelectorAll('.market-crash-hit').length,0);
  // Restore an active game without replaying the entrance. Handle visibility and resource release.
  const reconnect=new MarketCrashPresentation(root);reconnect.sync(active);await flush();assert.equal(draws.at(-1)[1],2400);assert.equal(frames.size,0);
  Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);
  Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(document.querySelectorAll('.market-crash-canvas').length,1);document.querySelector('.market-crash-canvas').dispatchEvent(new Event('webglcontextlost'));assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);assert(document.querySelector('.market-crash-fallback'));reconnect.dispose();
  const cancel=new MarketCrashPresentation(root);cancel.sync(active);cancel.dispose();await flush();assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);
  media.matches=true;const low=new MarketCrashPresentation(root);low.sync(active);await flush();assert.equal(draws.at(-1)[4],true);low.sync(done);assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);low.dispose();media.matches=false;
  failed=true;const fallback=new MarketCrashPresentation(root);fallback.sync(active);await flush();assert(document.querySelector('.market-crash-fallback'));assert.equal(document.querySelectorAll('.market-crash-canvas').length,0);fallback.dispose();failed=false;
 }
 assert.equal(allocated,disposed);assert.equal(frames.size,0);
 for(const lang of ['ja','en','ko']){globalThis.__lang=lang;assert(crashReason(true).length>10);assert(crashReason(false).length>10);}
 const view=await readFile('client/src/ui/boardView.ts','utf8');assert.match(view,/this\.marketCrash\.sync\(g\)/);assert.match(view,/this\.marketCrash\.dispose\(\)/);assert.match(view,/rb.disabled = .*owner.refreshBlockTurn/);
 console.log('PASS Market Crash: real engine next-turn timing, both sides, two offers, refused refresh, release, one owner across rerenders, hover/Escape, restored active game, idle RAF stop, hidden/resume, async disposal, reduced motion, GPU fallback, balanced allocation.');
}finally{globalThis.performance=savedPerf;dom.window.close();await rm(tmp,{recursive:true,force:true});}
