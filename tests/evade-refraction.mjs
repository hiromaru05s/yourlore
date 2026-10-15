import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-evade-'));
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/evade/timing';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 const {createGame,reduce,DB,evasionRollIndex,EVADE_DURATION}=await import(dir+'/rules.mjs');
 assert.equal(EVADE_DURATION,700);
 let successes=0,failures=0;
 for(const side of [0,1])for(const granted of [false,true])for(let seed=1;seed<=20;seed++){
  const g=createGame({mode:'bot',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.cur=side;g.turn=5;g.phase='main';g.pending={kind:'oppMon',reason:'attack',hint:'',data:{attackerUid:'attacker'}};
  for(const p of g.players){p.field=[];p.hand=[];p.enchants=[];p.traps=[];p.quests=[];p.openingDrawReady=false;p.hp=80;p.mana=12;p.maxMana=12;}
  const mon=(id,uid)=>({...DB[id],uid,dmg:0,exhausted:false,summonedTurn:0});
  g.players[side].field=[mon('M4','attacker')];
  g.players[1-side].field=[mon(granted?'ELF':'HIGH_ELF','same-card-1'),mon(granted?'ELF':'HIGH_ELF','chosen-target')];
  for(const m of g.players[1-side].field){m.defMod=50;if(granted)m.passivesG=['evade'];}
  const result=reduce(g,{type:'chooseTarget',uid:'chosen-target'});
  const i=result.events.findIndex(e=>e.type==='attack'),j=evasionRollIndex(result.events,i),roll=result.events[j];
  assert(j>i,'declaration is linked to its later authoritative roll');
  assert.equal(roll.evasion.targetUid,'chosen-target');assert.equal(roll.evasion.attackerUid,'attacker');assert.equal(roll.player,1-side);
  assert.equal(roll.success,roll.rolls[0]>=4);assert.equal(result.events.filter(e=>e.evasion).length,1);
  assert.equal(result.state.players[1-side].field[0].dmg,0,'identical neighbor is untouched');
  const defender=result.state.players[1-side].field.find(m=>m.uid==='chosen-target');
  if(roll.success){successes++;assert.equal(defender.dmg,0);assert.equal(result.events.some(e=>e.type==='hit'),false);}
  else {failures++;assert(defender.dmg>0);assert(result.events.some(e=>e.type==='hit'&&e.uid==='chosen-target'));}
  assert.equal(result.state.players[side].field[0].attacksUsed,1);
  assert.equal(evasionRollIndex([result.events[i],{type:'attack',uid:'next',player:side,targetUid:null},roll],0),-1,'never steal a later attack roll');
 }
 assert(successes>10&&failures>10);
 for(const side of [0,1]){
  let g=createGame({mode:'bot',seed:71,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.cur=side;g.turn=5;g.phase='main';g.pending={kind:'oppMon',reason:'attack',hint:'',data:{attackerUid:'tree-attacker'}};
  for(const [i,p]of g.players.entries()){
   p.hand=[];p.enchants=[];p.traps=[];p.quests=[];p.openingDrawReady=false;p.dew=1;
   p.field=[{...DB.WORLD_TREE,uid:'tree-'+i,dmg:0,exhausted:false,summonedTurn:0}];
  }
  g.players[side].field.push({...DB.M4,uid:'tree-attacker',exhausted:false,summonedTurn:0});
  g.players[1-side].field.push({...DB.HIGH_ELF,uid:'tree-target',dmg:0,defMod:50,exhausted:false,summonedTurn:0});
  let result=reduce(g,{type:'chooseTarget',uid:'tree-target'});
  assert.equal(result.state.pending.reason,'WORLD_TREE_ATTACK');assert(!result.events.some(e=>e.type==='attack'),'no strike before attacker choice');
  result=reduce(result.state,{type:'pick',uid:'pass'});
  assert.equal(result.state.pending.reason,'WORLD_TREE_DEFEND');assert(!result.events.some(e=>e.type==='attack'),'no strike before defender choice');
  result=reduce(result.state,{type:'pick',uid:'pass'});
  const i=result.events.findIndex(e=>e.type==='attack'),j=evasionRollIndex(result.events,i);
  assert(i>=0&&j>i);assert.equal(result.events[j].evasion.targetUid,'tree-target');
  assert.equal(result.events.filter(e=>e.type==='attack').length,1,'one resolved attack after both choices');
 }
 const dom=new JSDOM('<body><div class="zone-mon"><div class="card" data-uid="target"></div><div class="card" data-uid="other"></div></div></body>',{pretendToBeVisual:true});
 for(const k of ['window','document','HTMLElement','HTMLCanvasElement','Event'])globalThis[k]=dom.window[k];
 let reduced=false,now=0,serial=0;const frames=new Map();
 globalThis.matchMedia=()=>({matches:reduced});globalThis.performance={now:()=>now};globalThis.devicePixelRatio=1;
 globalThis.DOMMatrix=class{translate(){return this}multiply(){return this}};
 globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,setTransform(){},clearRect(){}};};
 globalThis.checks={created:0,disposed:0,released:0,draws:[],hold:false,fail:false};
 await build({entryPoints:['client/src/ui/evade/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/runtime.mjs',plugins:[{name:'evade-gpu-spy',setup(b){
  b.onResolve({filter:/^\.\/surface$/},()=>({path:'surface',namespace:'spy'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'spy'}));b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'spy'}));
  b.onLoad({filter:/.*/,namespace:'spy'},a=>({contents:a.path==='surface'?`export function prepareSurface(){return {ready:(async()=>{if(checks.hold)await new Promise(r=>checks.unhold=r);if(checks.fail)throw Error('capture');return document.createElement('canvas')})(),cancel(){}}}`:a.path==='projection'?`export function projectedPlacement(){return {}}`:`export class Renderer{constructor(){checks.created++}drawBoard(c,f,ms,m,w,h,success,reduced,direction){if(checks.drawFail)throw Error('draw');checks.draws.push({ms,success,direction})}releaseFace(){checks.released++}dispose(){checks.disposed++}}`}));
 }}]});
 const {prepareEvade:prepare,cancelEvades:cancel}=await import(dir+'/runtime.mjs');
 const source=document.querySelector('[data-uid="target"]'),other=document.querySelector('[data-uid="other"]');
 for(const node of [source,other])node.getBoundingClientRect=()=>new dom.window.DOMRect(600,300,72,112);
 const step=async t=>{now+=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));await settle();};
 for(const side of ['me','opp'])for(const success of [false,true]){
  source.style.visibility='visible';const job=prepare(source,{side,success});await settle();assert.equal(source.style.visibility,'visible','preparation cannot hide target');
  let ended=false;const p=job.play().then(v=>{ended=true;return v;});await settle();assert.equal(source.style.visibility,'hidden');assert.equal(checks.draws.at(-1).ms,0);
  await step(699);assert.equal(ended,false);assert.equal(checks.draws.at(-1).direction,side==='me'?1:-1);
  await step(1);assert.equal(await p,true);assert.equal(source.style.visibility,'visible');
 }
 for(const reason of ['cancel','abort','resize','pagehide','hidden','removed','replacement']){
  const ac=new AbortController(),job=prepare(source,{side:'me',success:true,signal:ac.signal}),p=job.play();await settle();
  if(reason==='cancel')cancel();if(reason==='abort')ac.abort();if(['resize','pagehide'].includes(reason))window.dispatchEvent(new Event(reason));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}
  if(reason==='removed'){source.remove();await step(10);}
  if(reason==='replacement'){const next=prepare(source,{side:'opp',success:true});next.cancel();}
  assert.equal(await p,false,reason);assert.equal(source.style.visibility,'visible');Object.defineProperty(document,'hidden',{configurable:true,value:false});document.querySelector('.zone-mon').append(source);
 }
 checks.hold=true;const pending=prepare(source,{side:'me',success:true}),late=pending.play();await settle();pending.cancel();checks.unhold();await settle();assert.equal(await late,false);checks.hold=false;
 const created=checks.created,multi=[prepare(source,{side:'me',success:true}),prepare(other,{side:'opp',success:true})];await settle();const all=multi.map(j=>j.play());await settle();assert.equal(checks.created,created+1);cancel();assert.deepEqual(await Promise.all(all),[false,false]);
 reduced=true;const noGpu=checks.created,r=prepare(source,{side:'me',success:true}).play();await settle();assert.equal(source.style.visibility,'visible');await step(700);assert.equal(await r,true);assert.equal(checks.created,noGpu);reduced=false;
 const warn=console.warn;console.warn=()=>{};
 checks.fail=true;const fallback=prepare(source,{side:'me',success:true}).play();await settle();await step(700);assert.equal(await fallback,true);checks.fail=false;
 checks.drawFail=true;const failure=prepare(source,{side:'me',success:true}).play();await settle();assert.equal(await failure,false);checks.drawFail=false;console.warn=warn;
 assert.equal(await prepare(null,{side:'me',success:true}).play(),false);
 assert.equal(checks.created,checks.disposed);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.evade-refraction,.evade-capture').length,0);
 dom.window.close();console.log(`PASS evade 03: ${successes+failures} authoritative combat cases, 700ms boundary, both sides, granted/duplicate targets, preparation, concurrency, cancellation, reduced motion and fallback`);
}finally{await rm(dir,{recursive:true,force:true});}
