import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-opening-approved-');
const dom=new JSDOM('<body><main><div class="game"></div></main></body>',{url:'http://localhost'});
for(const k of ['window','document','localStorage','Image','Event'])globalThis[k]=dom.window[k];
dom.window.HTMLCanvasElement.prototype.getContext=()=>({});
let now=0,reduced=false,hidden=false,sequence=0;
const frames=new Map();globalThis.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.matchMedia=()=>({matches:reduced});globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
Object.defineProperty(document,'hidden',{get:()=>hidden});
const realPerformance=globalThis.performance;globalThis.performance={now:()=>now};
const qa=globalThis.openingQA={draws:[],disposed:0,cues:[],stops:0,load:()=>Promise.resolve()};
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
const step=async ms=>{now=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));await flush();};
try{
 await build({stdin:{contents:"export * from './client/src/ui/duelOpeningDirector';export {setLang} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/director.mjs',plugins:[{name:'isolate-gpu-and-audio',setup(b){
  b.onResolve({filter:/opening\/renderer$/},()=>({path:'renderer',namespace:'fixture'}));
  b.onResolve({filter:/openingSound$/},()=>({path:'sound',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='renderer'?`export function createOpeningRenderer(){return {loadAssets:()=>globalThis.openingQA.load(),draw:(c,t,o)=>globalThis.openingQA.draws.push({t,o}),dispose:()=>globalThis.openingQA.disposed++};}`:`export async function warmOpeningSound(){};export function openingAudio(){return{play:c=>globalThis.openingQA.cues.push(c),stop:()=>globalThis.openingQA.stops++}}` }));
 }}]});
 const {playDuelOpening,setLang}=await import(dir+'/director.mjs');setLang('ja');
 const root=document.querySelector('main');let deals=0,starts=0;
 const options=(abort,first=true)=>({root,me:{name:'A',avatar:'SEEKER_BLUE'},opp:{name:'B',avatar:'SEEKER_RED'},firstIsMe:first,signal:abort.signal,elapsed:()=>now,onStart:()=>starts++,onDeal:async()=>{deals++;}});
 for(const first of [true,false]){
  now=-350;const abort=new AbortController(),before=deals,p=playDuelOpening(options(abort,first));await flush();
  await step(0);await step(1460);await step(3220);
  assert.equal(document.querySelector('[role=status]').textContent,first?'あなたが先攻':'相手が先攻');
  assert(!document.body.textContent.includes('BATTLE START'));assert(!document.body.textContent.includes('ターンです'));
  await step(5120);assert(document.querySelector('.game').classList.contains('intro-docked'));
  await step(5580);assert.equal(deals,before+1);assert.equal(document.querySelector('[role=status]').textContent,'');
  await step(6929);assert(document.querySelector('.duel-opening'),'input gate remains until the complete opening deadline');
  await step(6930);await p;assert(!document.querySelector('.duel-opening'));assert(!document.querySelector('.game').classList.contains('duel-intro-active'));
 }
 assert.equal(starts,2);assert(!qa.cues.includes('reveal'),'no duplicated turn cue');
 // A deployed room can still carry the earlier persisted deadline.
 now=0;let abort=new AbortController();let p=playDuelOpening({...options(abort),durationMs:10450});await flush();await step(6930);assert(document.querySelector('.duel-opening'));await step(10450);await p;
 // Online backgrounding skips visuals, never the authoritative gate.
 now=0;abort=new AbortController();p=playDuelOpening(options(abort));await flush();hidden=true;document.dispatchEvent(new Event('visibilitychange'));await step(4000);assert(document.querySelector('.duel-opening'));await step(6930);await p;hidden=false;
 // Abort while artwork is pending releases promptly, and late completion owns no resources.
 let finishLoad;qa.load=()=>new Promise(r=>finishLoad=r);abort=new AbortController();now=0;p=playDuelOpening(options(abort));await flush();const disposed=qa.disposed;abort.abort();await p;assert.equal(qa.disposed,disposed+1);finishLoad();await flush();assert(!document.querySelector('.duel-opening'));qa.load=()=>Promise.resolve();
 // Reduced motion still reveals the authoritative winner, without spinning or a new banner.
 reduced=true;now=0;abort=new AbortController();p=playDuelOpening(options(abort,false));await flush();assert.equal(document.querySelector('[role=status]').textContent,'相手が先攻');assert(qa.draws.at(-1).o.reduced);await step(6930);await p;
 assert.equal(frames.size,0,'no pending frame after completion/abort');
 console.log('PASS: both outcomes, no duplicated turn/start banner or cue, one deal, server deadline, old room, hidden tab, pending load abort, reduced motion, cleanup');
}finally{globalThis.performance=realPerformance;delete globalThis.openingQA;dom.window.close();await rm(dir,{recursive:true,force:true});}
