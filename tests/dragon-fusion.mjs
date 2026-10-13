import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'dragon-fusion-'));
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/ui/dragonFusion/selection';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
 const {createGame,reduce,DB,hasPassive,fusionPairs,DRAGON_FUSION_VARIANT}=await import(path.join(dir,'engine.mjs'));assert.equal(DRAGON_FUSION_VARIANT,3);
 let checks=0;
 for(const side of [0,1])for(const [mate,id]of [['SOLDIER2','DRAGON_RIDER'],['INFKNIGHT','ANTIQUE_DK']])for(const auto of [false,true])for(const token of [false,true]){
  const g=createGame({mode:'online',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.phase='main';g.pending=null;g.turn=3;g.cur=side;
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,maxHp:200,mana:30,maxMana:30});
  const mon=(id,uid)=>({...structuredClone(DB[id]),uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0,token});
  g.players[side].field=[mon('M4','neighbor'),mon(mate,'mate')];
  if(auto)g.players[side].hand=[{...DB.GM6_0,uid:'dragon'}];
  else {g.players[side].field.push(mon('GM6_0','dragon'));g.pending={kind:'giantShop',reason:'dragonFuse',allowCancel:false,hint:'',data:{ids:[id],free:true,dragonUid:'dragon',soldierUid:'mate',knightUid:'mate'}};}
  const r=reduce(g,auto?{type:'play',idx:0}:{type:'pick',uid:id}),event=r.events.find(e=>e.type==='summon'&&e.id===id);assert(event,`${side} ${id} auto=${auto}`);assert.deepEqual(event.fusionFrom,{dragon:{uid:'dragon',id:'GM6_0'},mate:{uid:'mate',id:mate}});assert.equal(fusionPairs(r.events).size,1);
  assert.equal(r.state.players[side].field.at(-1).id,id);assert.equal(r.events.filter(e=>e.type==='destroy'&&e.cause==='fusion').length,2);
  assert(r.state.players[side][token||hasPassive(DB[mate],'void')?'removed':'discard'].some(c=>c.uid==='mate'));assert.equal(g.players[side].field.at(-1).uid,auto?'mate':'dragon');
  for(const malformed of [[event],r.events.map(e=>e===event?{...e,fusionFrom:undefined}:e),r.events.map(e=>e===event?{...e,id:'M1'}:e),r.events.map(e=>e.type==='destroy'?{...e,cause:undefined}:e),r.events.map(e=>e.type==='destroy'?{...e,player:1-side}:e)])assert.equal(fusionPairs(malformed).size,0);
  checks++;
 }
 const dom=new JSDOM('<div class="game"><div class="zone-mon"></div></div>',{pretendToBeVisual:true});
 for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
 globalThis.innerWidth=1440;globalThis.innerHeight=1000;
 globalThis.matchMedia=()=>({matches:globalThis.reduced??false});let now=0,next=0;const frames=new Map();globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next};globalThis.cancelAnimationFrame=i=>frames.delete(i);globalThis.metrics={created:0,disposed:0,fail:false,impacts:0};
 await build({entryPoints:['client/src/ui/dragonFusion/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'gpu',setup(b){
  b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'mock'}));b.onResolve({filter:/cardSurface$/},()=>({path:'capture',namespace:'mock'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='projection'?`export const layoutRect=n=>({left:0,top:0,width:90,height:140.625});export const projectBoardDOM=()=>{};export const boardMatrix=()=>({scale(){return this}});`:a.path==='capture'?`export async function captureCardSurface(){return {face:document.createElement('canvas')}}`:`export class FusionRenderer{constructor(onLoss,variants){if(variants.join()!=='3')throw Error('Wrong selection');metrics.created++;this.canvas=document.createElement('canvas')}drawBoard(){if(metrics.fail)throw Error('GPU')}dispose(){metrics.disposed++}}`}));
 }}]});
 const {playDragonFusion:play}=await import(path.join(dir,'runtime.mjs'));const zone=document.querySelector('.zone-mon');
 const reset=()=>{zone.innerHTML='<div class="card" data-uid="dragon"></div><div class="card" data-uid="mate"></div><div class="slot"></div>';const face=document.createElement('div');face.className='card';face.dataset.uid='result';face.dataset.cardId='DRAGON_RIDER';return{dragon:zone.children[0],mate:zone.children[1],face}};
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};const advance=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now))};
 for(const reason of ['complete','abort','skip','reduced','missing','failure']){
  const {dragon,mate,face}=reset(),ac=new AbortController();globalThis.reduced=reason==='reduced';metrics.fail=reason==='failure';
  const warn=console.warn;console.warn=()=>{};
  const p=play(reason==='missing'?undefined:dragon,mate,face,zone,['dragon','mate'],ac.signal,reason==='skip',()=>metrics.impacts++);await flush();
  if(reason==='abort')ac.abort();else advance(4000);
  await p;console.warn=warn;
  assert.equal(document.querySelectorAll('.dragon-fusion-summon').length,0,reason);assert.equal(zone.querySelectorAll('.card').length,1,reason);assert.equal(face.style.visibility,'',reason);assert.equal(frames.size,0,reason);assert.equal(metrics.created,metrics.disposed,reason);
 }
 assert.equal(metrics.impacts,1);globalThis.reduced=false;metrics.fail=false;
 const {dragon,mate,face}=reset(),ac=new AbortController();const pending=play(dragon,mate,face,zone,['dragon','mate'],ac.signal);ac.abort();await pending;assert.equal(face.style.visibility,'');assert.equal(zone.querySelectorAll('.card').length,1);dom.window.close();
 console.log(`PASS dragon fusion 04: ${checks} engine cases (both outcomes/sides, automatic/choice, token/real), zones preserved, explicit event pairing excludes ordinary destruction; runtime completion, cancellation, reduced, skip, missing source and GPU failure cleanup`);
}finally{await rm(dir,{recursive:true,force:true})}
