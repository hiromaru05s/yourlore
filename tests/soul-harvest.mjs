import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'soul-harvest-'));const dom=new JSDOM('<div id="source"></div><div id="target"></div>',{pretendToBeVisual:true});
const realPerformance=globalThis.performance;for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];globalThis.innerWidth=900;globalThis.innerHeight=700;
let clock=0,frames=new Map(),next=0,reduced=false,alloc=0,disposed=0,draws=[],fail=false,lost=false,hits=0;
globalThis.performance={now:()=>clock};globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next;};globalThis.cancelAnimationFrame=n=>frames.delete(n);
globalThis.__soulScene=()=>{if(fail)throw Error('no GPU');alloc++;return {get lost(){return lost;},draw:(_c,o)=>draws.push(o),dispose(){disposed++;}};};
const flush=()=>new Promise(r=>setTimeout(r,0));const advance=ms=>{clock+=ms;for(const [id,f] of [...frames]){frames.delete(id);f(clock);}};
try{
 await build({entryPoints:['client/src/ui/soulHarvest/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'controlled-scene',setup(b){b.onResolve({filter:/^\.\/scene$/},()=>({path:'scene',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createRenderer=()=>globalThis.__soulScene();'}));}}]});
 const R=await import(path.join(dir,'runtime.mjs'));const source=document.querySelector('#source'),target=document.querySelector('#target');target.getBoundingClientRect=()=>({left:400,top:60,width:90,height:120});source.getBoundingClientRect=()=>({left:200,top:400,width:90,height:120});target.style.filter='contrast(1.1)';target.style.rotate='2deg';
 const opts={source,target,damage:17,onImpact:()=>hits++};R.warmSoulHarvest();await flush();assert.equal(alloc,0);
 let pending=R.playSoulHarvest(opts);await flush();advance(1119 * .75);assert.equal(hits,0);advance(1 * .75);assert.equal(hits,1);assert.equal(draws.at(-1).damage,17);assert.equal(draws.at(-1).variant,0);advance(2780 * .75);assert.equal(await pending,true);assert.equal(hits,1);assert.equal(target.style.rotate,'2deg');assert.equal(target.style.filter,'contrast(1.1)');assert.equal(document.querySelectorAll('.soul-harvest-fx').length,0);assert.equal(frames.size,0);
 const signal=new AbortController();pending=R.playSoulHarvest({...opts,signal:signal.signal});await flush();advance(400 * .75);signal.abort();assert.equal(await pending,false);assert.equal(hits,1);assert.equal(frames.size,0);
 pending=R.playSoulHarvest(opts);R.cancelSoulHarvest();assert.equal(await pending,false);await flush();assert.equal(document.querySelectorAll('.soul-harvest-fx').length,0);
 fail=true;assert.equal(await R.playSoulHarvest(opts),false);fail=false;
 reduced=true;pending=R.playSoulHarvest({...opts,damage:27});await flush();advance(1120 * .75);assert.equal(draws.at(-1).reduced,true);assert.equal(draws.at(-1).damage,27);assert.equal(hits,2);window.dispatchEvent(new Event('resize'));assert.equal(await pending,false);assert.equal(target.style.rotate,'2deg');reduced=false;
 pending=R.playSoulHarvest(opts);await flush();lost=true;advance(20 * .75);assert.equal(await pending,false);lost=false;
 pending=R.playSoulHarvest(opts);await flush();const replacement=R.playSoulHarvest(opts);assert.equal(await pending,false);await flush();source.remove();advance(20 * .75);assert.equal(await replacement,false);document.body.append(source);
 pending=R.playSoulHarvest(opts);await flush();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));assert.equal(await pending,false);Object.defineProperty(document,'hidden',{configurable:true,value:false});
 assert.equal(await R.playSoulHarvest({...opts,damage:0}),false);assert.equal(alloc,disposed);assert.equal(frames.size,0);
 await build({stdin:{contents:"export * from './client/src/ui/soulHarvest/events';export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
 const E=await import(path.join(dir,'engine.mjs'));
 for(const owner of [0,1]){
  const s=E.createGame({mode:'bot',seed:92,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  s.cur=owner;s.opening=undefined;s.turn=3;s.pending=null;
  for(const p of s.players)Object.assign(p,{openingDrawReady:false,mana:10,maxMana:12,hp:60,enchants:[],field:[],hand:[],deck:[]});
  s.players[owner].hand=[{...E.DB.SOUL_HARVEST,uid:'cast'}];
  s.players[1-owner].field=[{...E.DB.M1,uid:'victim',passivesG:['void','aura'],exhausted:false,tempAtk:0,atkMod:0,defMod:0}];
  const r=E.reduce(s,{type:'play',idx:0,sourceUid:'cast',targets:['victim']});
  assert.equal(r.state.players[1-owner].hp,60);assert(r.state.players[1-owner].removed.some(c=>c.uid==='victim'));
  assert.equal(E.soulHarvestDamageIndex(r.events,0),-1);
 }
 const foreign={type:'damage',player:1,amount:24,srcKo:'other'};assert.equal(E.isSoulHarvestDamage(foreign),false);assert.equal(E.soulHarvestDamageIndex([{type:'playSpell'},{type:'playSpell'}, {type:'damage',player:1,amount:4,srcKo:'<b data-card="SOUL_HARVEST">x</b>'}],0),-1);
 console.log('PASS selected 01 / authoritative 17 and 27 damage / contact once at 1120ms / full tail / reset styles / preload / abort / failure / reduced / resize / context loss / replacement / detached source / hidden / zero / no leaked GPU or RAF; reworked Void/Aura removal leaves player HP unchanged.');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=realPerformance;delete globalThis.__soulScene;}
