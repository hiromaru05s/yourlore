import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Worker as Thread} from 'node:worker_threads';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-worker-'));
const seedRandom=()=>{let seed=83;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);};
let live=0,constructed=0;
try{
 await build({entryPoints:['client/src/game/botPlanner.worker.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'worker.mjs')});
 await writeFile(path.join(dir,'bridge.mjs'),`import {parentPort} from 'node:worker_threads';globalThis.postMessage=data=>parentPort.postMessage(data);await import('./worker.mjs');parentPort.on('message',data=>{(${seedRandom.toString()})();globalThis.onmessage({data});});`);
 await build({stdin:{contents:`export {BotPlanner} from './client/src/game/botPlanner';export {botDecide} from './client/src/shared/bot';export {createGame,reduce} from './client/src/shared/engine';export {BOT_NPCS} from './client/src/shared/botNpcs';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs')});
 class BrowserWorker{
  constructor(){live++;constructed++;this.thread=new Thread(path.join(dir,'bridge.mjs'));this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',()=>this.onerror?.({preventDefault(){}}));}
  postMessage(data){this.thread.postMessage(data);}
  terminate(){if(this.thread){live--;void this.thread.terminate();this.thread=null;}}
 }
 globalThis.Worker=BrowserWorker;
 const {BotPlanner,botDecide,createGame,reduce,BOT_NPCS}=await import(path.join(dir,'test.mjs'));
 const planner=new BotPlanner();let cases=0,heartbeats=0,maxMainMs=0,maxWorkerMs=0;
 const pulse=setInterval(()=>heartbeats++,10);
 let fixture;
 for(const npc of BOT_NPCS)for(const deck of npc.decks){
  let g=createGame({mode:'bot',seed:71,starting:1,p0:{id:'me',name:'YOU'},p1:{id:'bot',name:'BOT',isBot:true,deck:deck.cards}}).state;
  g.players[1].botTune={...deck.tune};fixture=g;
  // Compare both the opening decision and its successor with identical randomness.
  for(let i=0;i<2;i++){
   const snapshot=structuredClone(g);seedRandom();let started=performance.now();const expected=botDecide(g,npc.difficulty);maxMainMs=Math.max(maxMainMs,performance.now()-started);
   const before=heartbeats;started=performance.now();const actual=await planner.decide(g,npc.difficulty);const elapsed=performance.now()-started;maxWorkerMs=Math.max(maxWorkerMs,elapsed);
   assert.deepEqual(actual,expected,`${npc.difficulty}/${deck.name}/${i}`);assert.deepEqual(g,snapshot,'Planning does not mutate caller state');
   if(elapsed>100)assert(heartbeats>before,'UI event loop progresses during a heavy search');
   g=reduce(g,actual).state;cases++;
  }
 }
 clearInterval(pulse);assert.equal(constructed,1,'Reuse one worker per match');
 const cancelled=planner.decide(fixture,'hell');planner.dispose();assert.equal(await cancelled,undefined);assert.equal(live,0);assert.equal(await planner.decide(fixture,'hell'),undefined);
 const superseded=new BotPlanner();const old=superseded.decide(fixture,'hell');const next=superseded.decide(fixture,'normal');assert.equal(await old,undefined);assert(await next);superseded.dispose();assert.equal(live,0);
 globalThis.Worker=class{constructor(){throw Error('Workers blocked');}};
 seedRandom();const expected=botDecide(fixture,'normal');seedRandom();const fallback=new BotPlanner();assert.deepEqual(await fallback.decide(fixture,'normal'),expected);fallback.dispose();
 console.log(JSON.stringify({cases,heartbeats,maxMainMs,maxWorkerMs,cancellation:true,supersession:true,fallback:true}));
}finally{await rm(dir,{recursive:true,force:true});}
