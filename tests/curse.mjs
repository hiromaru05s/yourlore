import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'curse-test-'));
const dom=new JSDOM('<div id="source"></div><div id="meRow"><div class="zone-mon"></div></div><div id="oppRow"><div class="zone-mon"></div></div>'+['my','opp'].map(x=>`<div id="pile-${x}Disc"><div class="pile-print"><span>original</span></div><b class="pile-count">7</b></div>`).join(''),{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
Object.assign(globalThis,{innerWidth:1000,innerHeight:800,devicePixelRatio:2,matchMedia:()=>({matches:false})});
let time=0,next=0,frames=new Map(),alloc=0,freed=0,draws=[],failure=false;const perf=globalThis.performance;
globalThis.performance={now:()=>time};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.__curseRenderer=()=>{if(failure)throw Error('no GPU');alloc++;return{draw:(c,o)=>draws.push(o),dispose:()=>freed++};};
const flush=()=>new Promise(r=>setTimeout(r,0));const advance=t=>{time+=t;for(const [id,f]of [...frames]){frames.delete(id);f(time);}};
try{
 await build({entryPoints:['client/src/ui/curse/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onResolve({filter:/^\.\/assets$/},()=>({path:'assets',namespace:'fixture'}));b.onResolve({filter:/^\.\.\/cardView$/},()=>({path:'card',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='renderer'?'export const createRenderer=()=>globalThis.__curseRenderer();':a.path==='assets'?'export async function loadCurseAssets(){return {faces:[],skull:{}}}':'export function cardEl(card){const n=document.createElement("div");n.textContent=card.id;return n}'}));
 }}]});
 const R=await import(path.join(dir,'runtime.mjs')),source=document.querySelector('#source');
 for(const n of document.querySelectorAll('*'))n.getBoundingClientRect=()=>({left:100,top:200,width:100,height:150});
 const count=()=>document.querySelector('#pile-oppDisc .pile-count').textContent;
 let pending=R.playCurse(source,'me',undefined,undefined,7);await flush();await flush();advance(650 * .75);const held=source.style.cssText;advance(450 * .75);assert.equal(source.style.cssText,held);assert.equal(source.style.filter,'none');assert(!source.hidden);assert.equal(draws.at(-1).hideSource,true);assert.equal(draws.at(-1).pixelRatio,2);
 advance(650 * .75);assert(source.hidden);advance(1750 * .75);assert.equal(count(),'8');advance(920 * .75);assert.equal(count(),'12');advance(1380 * .75);assert.equal(await pending,true);assert.equal(count(),'7');assert.equal(source.style.cssText,'');assert.equal(document.querySelectorAll('.curse-fx').length,0);
 const ac=new AbortController();pending=R.playCurse(source,'opp',ac.signal);await flush();ac.abort();assert.equal(await pending,false);assert.equal(frames.size,0);
 pending=R.playCurse(source,'me');R.cancelCurse();assert.equal(await pending,false);await flush();
 pending=R.playCurse(source,'me');await flush();window.dispatchEvent(new Event('resize'));assert.equal(await pending,false);
 pending=R.playCurse(source,'me');await flush();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));assert.equal(await pending,false);Object.defineProperty(document,'hidden',{configurable:true,value:false});
 failure=true;assert.equal(await R.playCurse(source,'me'),false);failure=false;assert.equal(alloc,freed);assert.equal(frames.size,0);
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
 const E=await import(path.join(dir,'engine.mjs'));
 for(const side of [0,1])for(const blocked of [false,true,'echo']){
  const s=E.createGame({mode:'bot',seed:72,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;s.opening=undefined;s.cur=side;s.turn=3;s.pending=null;
  for(let i=0;i<2;i++){const p=s.players[i];p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.field=[];p.enchants=[];p.traps=[];p.hand=[{...E.DB.BLACK_CURSE,uid:`c${i}`},{...E.DB.BLACK_NOVA,uid:`n${i}`}];p.discard=Array.from({length:7},(_,j)=>({...E.DB.S1,uid:`d${i}-${j}`}));}
  if(blocked===true)s.players[1-side].traps=[{card:{id:'legacy-null',uid:'null',t:'trap',cost:0,react:'nullspell',name:'Null'},setTurn:0}];
  if(blocked==='echo'){const echo=Object.values(E.DB).find(c=>c.ench==='runeEcho');s.players[side].enchants=[{card:{...echo,uid:'echo'},turns:99}];}
  const r=E.reduce(s,{type:'play',idx:0}),ev=r.events.filter(e=>e.type==='curseGenerated');assert.equal(ev.length,blocked===true?0:blocked==='echo'?2:1);
  if(blocked!==true){assert.equal(ev[0].player,side);assert.equal(ev[0].before,7);assert.equal(ev[0].after,12);assert.equal(ev[0].sourceUid,`c${side}`);assert.equal(r.state.players[1-side].discard.filter(c=>c.id==='CURSE').length,blocked==='echo'?10:5);if(blocked==='echo'){assert.equal(ev[1].before,12);assert.equal(ev[1].after,17);}}
 }
 console.log('PASS Curse: native stable face; DPR2; five synchronized arrivals; source exit; cancellation, hidden, resize, GPU failure cleanup; both engine sides and nullification.');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=perf;delete globalThis.__curseRenderer;}
