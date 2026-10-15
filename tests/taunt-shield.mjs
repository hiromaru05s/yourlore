import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-taunt-'));
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
try{
 const entry={contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/taunt/timing';",resolveDir:process.cwd()};
 await build({stdin:entry,bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 // Legacy taunt resolution is an independent oracle; other rules use current code.
 const currentEngine=readFileSync('client/src/shared/engine.ts','utf8');
 const start=currentEngine.indexOf('    const tauntRollIndex = ctx.ev.length;'),end=currentEngine.indexOf('\n  }\n  if (treeStage',start);assert(start>0&&end>start);
 const baseline=currentEngine.slice(0,start)+`    const tauntRollIndex = ctx.ev.length;
    if (orig && !hasPassive(orig, "taunt") && taunts.length > 0 && diceChance(g, ctx, o, { id: taunts[0].id, player: side(g, o) }, 50)) {
      const tnt = taunts[randInt(g, taunts.length)];
      const rollEvent = ctx.ev[tauntRollIndex];
      if (rollEvent?.type === "dice") rollEvent.source = { id: tnt.id, player: side(g, o) };
      targetUid = tnt.uid;
      if (attackEvent) attackEvent.targetUid = targetUid;
      ctx.log(\`  └ <span class="dmg">도발!</span> \${cn(tnt)} 이(가) 대신 공격을 받는다\`, \`  └ <span class="dmg">挑発！</span> \${cn(tnt)} が代わりに攻撃を受ける\`);
    }`+currentEngine.slice(end);
 await build({stdin:entry,bundle:true,platform:'node',format:'esm',outfile:dir+'/baseline.mjs',plugins:[{name:'baseline',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},()=>({contents:baseline,loader:'ts'}));}}]});
 const {createGame,reduce,DB,tauntRollIndex,DURATION,SELECTED_SHIELD}=await import(dir+'/rules.mjs'),before=await import(dir+'/baseline.mjs');
 assert.equal(DURATION,1000);assert.equal(SELECTED_SHIELD,2);
 const natural=Object.values(DB).find(c=>c.passive?.includes('taunt'));assert(natural,'natural taunt exists');
 let successes=0,failures=0;
 for(const side of [0,1])for(const granted of [false,true])for(let seed=1;seed<=20;seed++){
  const g=createGame({mode:'bot',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.cur=side;g.turn=5;g.phase='main';g.pending={kind:'oppMon',reason:'attack',hint:'',data:{attackerUid:'attacker'}};
  for(const p of g.players){p.field=[];p.hand=[];p.enchants=[];p.traps=[];p.quests=[];p.openingDrawReady=false;p.hp=80;p.mana=12;p.maxMana=12;}
  const mon=(id,uid)=>({...DB[id],uid,dmg:0,defMod:50,exhausted:false,summonedTurn:0});
  g.players[side].field=[mon('M4','attacker')];
  g.players[1-side].field=[mon('ELF','target'),...['same-card-1','same-card-2'].map(uid=>({...mon(granted?'ELF':natural.id,uid),...granted?{passivesG:['taunt']}:{}}))];
  const action={type:'chooseTarget',uid:'target'},result=reduce(g,action),original=before.reduce(g,action);
  assert.deepEqual(result.state,original.state,'gameplay and RNG state stay unchanged');
  const strip=events=>events.map(({taunt,...e})=>e);assert.deepEqual(strip(result.events),strip(original.events));
  const i=result.events.findIndex(e=>e.type==='attack'),j=tauntRollIndex(result.events,i),roll=result.events[j];
  assert(j>i);assert.equal(roll.taunt.attackerUid,'attacker');assert.equal(roll.player,1-side);assert.equal(result.events.filter(e=>e.taunt).length,1);
  if(roll.success){successes++;assert.equal(result.events[i].targetUid,roll.taunt.sourceUid);assert(['same-card-1','same-card-2'].includes(roll.taunt.sourceUid));}
  else{failures++;assert.equal(roll.taunt.sourceUid,'same-card-1');assert.equal(result.events[i].targetUid,'target');}
  assert.equal(tauntRollIndex([result.events[i],{type:'attack',uid:'next',player:side,targetUid:null},roll],0),-1);
  const direct=reduce(g,{type:'chooseTarget',uid:'same-card-1'});assert(!direct.events.some(e=>e.taunt),'direct attack on taunt has no roll');
  g.players[1-side].field=g.players[1-side].field.slice(0,1);assert(!reduce(g,action).events.some(e=>e.taunt),'no taunter no prelude');
 }
 assert(successes>10&&failures>10);
 const dom=new JSDOM('<body><div class="zone-mon"><div class="card" data-uid="target"></div><div class="card" data-uid="other"></div></div></body>',{pretendToBeVisual:true});
 for(const k of ['window','document','HTMLElement','HTMLCanvasElement','Event'])globalThis[k]=dom.window[k];
 let reduced=false,now=0,serial=0;const frames=new Map();
 globalThis.matchMedia=()=>({matches:reduced});globalThis.performance={now:()=>now};globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;globalThis.innerHeight=800;
 globalThis.DOMMatrix=class{translate(){return this}multiply(){return this}};
 globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,setTransform(){},clearRect(){}};};
 globalThis.checks={created:0,disposed:0,released:0,draws:[],hold:false,fail:false};
 await build({entryPoints:['client/src/ui/taunt/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/runtime.mjs',plugins:[{name:'taunt-gpu-spy',setup(b){
  b.onResolve({filter:/^\.\/surface$/},()=>({path:'surface',namespace:'spy'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'spy'}));b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'spy'}));
  b.onLoad({filter:/.*/,namespace:'spy'},a=>({contents:a.path==='surface'?`export function prepareSurface(){return {ready:(async()=>{if(checks.hold)await new Promise(r=>checks.unhold=r);if(checks.fail)throw Error('capture');return document.createElement('canvas')})(),cancel(){}}}`:a.path==='projection'?`export function projectedPlacement(){return {}}export function layoutRect(){return {width:72}}`:`export class Renderer{constructor(){checks.created++}renderBoard(c,f,ms,w,h,m){if(checks.drawFail)throw Error('draw');checks.draws.push({ms})}releaseFace(){checks.released++}dispose(){checks.disposed++}}`}));
 }}]});
 const {prepareTaunt:prepare,cancelTaunts:cancel}=await import(dir+'/runtime.mjs');
 const source=document.querySelector('[data-uid="target"]'),other=document.querySelector('[data-uid="other"]');
 for(const node of [source,other])node.getBoundingClientRect=()=>new dom.window.DOMRect(600,300,72,112);
 const step=async t=>{now+=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));await settle();};
 for(const side of ['me','opp'])for(const success of [false,true]){
  source.style.visibility='visible';const job=prepare(source,{side,success});await settle();assert.equal(source.style.visibility,'visible','preparation cannot hide target');
  let ended=false;const p=job.play().then(v=>{ended=true;return v;});await settle();assert.equal(source.style.visibility,'visible');assert.equal(source.dataset.tauntActive,'3');assert.equal(checks.draws.at(-1).ms,0);
  await step(999);assert.equal(ended,false);assert.equal(checks.draws.at(-1).ms,999);
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
 reduced=true;const noGpu=checks.created,r=prepare(source,{side:'me',success:true}).play();await settle();assert.equal(source.style.visibility,'visible');await step(1000);assert.equal(await r,true);assert.equal(checks.created,noGpu);reduced=false;
 const warn=console.warn;console.warn=()=>{};
 checks.fail=true;const fallback=prepare(source,{side:'me',success:true}).play();await settle();await step(1000);assert.equal(await fallback,true);checks.fail=false;
 checks.drawFail=true;const failure=prepare(source,{side:'me',success:true}).play();await settle();assert.equal(await failure,false);checks.drawFail=false;console.warn=warn;
 assert.equal(await prepare(null,{side:'me',success:true}).play(),false);
 assert.equal(checks.created,checks.disposed);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.taunt-shield,.taunt-capture').length,0);
 dom.window.close();console.log(`PASS taunt 03: ${successes+failures} engine parity cases; exact UID; 1000ms boundary; preparation, concurrency, cancellation, reduced motion and fallback`);
}finally{await rm(dir,{recursive:true,force:true});}
