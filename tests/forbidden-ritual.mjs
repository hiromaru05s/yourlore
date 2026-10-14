import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(path.join(tmpdir(),'forbidden-ritual-'));
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/ui/forbiddenRitual/selection';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
 const {createGame,reduce,DB,forbiddenBatches}=await import(path.join(dir,'engine.mjs'));
 const mon=(id,uid)=>({...structuredClone(DB[id]),uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0});
 const fixture=(side,seed,ids)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.phase='main';g.pending=null;g.turn=3;g.cur=side;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:28,maxHp:200,mana:40,maxMana:40,tribesFired:['마족:2','마족:3','마족:4']});g.players[side].hand=[{...DB.FORBIDDEN,uid:'spell'}];g.players[side].field=ids.map((id,i)=>mon(id,'initial-'+i));return g;};
 for(const side of [0,1])for(const ids of [['TDE1'],['TDE1','TDE2','TDE3'],['TDE1','TDE2','TDE3','TDE4']]){
  const seen=new Set();
  for(let seed=1;seed<100&&seen.size<6;seed++){
   const g=fixture(side,seed,ids),r=reduce(g,{type:'play',idx:0});
   const dice=r.events.find(e=>e.type==='dice'&&e.source?.id==='FORBIDDEN');assert(dice,'ritual must roll');seen.add(dice.rolls[0]);
   const paid=r.events.findIndex(e=>e.type==='damage'&&e.player===side);assert(paid>=0&&paid<r.events.indexOf(dice),'pay before roll');assert.equal(r.state.players[side].hp,1);assert.equal(g.players[side].hp,28);
   const summons=r.events.filter(e=>e.type==='summon'&&e.ritual),n=dice.rolls[0]>=5?4-ids.length:0;
   assert.equal(summons.length,n);assert.equal(new Set(summons.map(e=>e.uid)).size,n);
   assert(summons.every(e=>e.player===side&&!ids.includes(e.id)&&r.state.players[side].field.some(m=>m.uid===e.uid)));
   const batches=forbiddenBatches(r.events);assert.equal(batches.size,n?1:0);if(n)assert.deepEqual(batches.get(summons[0].uid),summons);
  }assert.equal(seen.size,6,'all six outcomes covered');
 }
 for(const side of [0,1])for(const slots of [6,7]){
  let found=false;for(let seed=1;seed<100;seed++){
   const r=reduce(fixture(side,seed,Array(slots).fill('TDE1')),{type:'play',idx:0});if(!r.events.some(e=>e.type==='dice'&&e.source.id==='FORBIDDEN'&&e.success))continue;
   assert.equal(r.events.filter(e=>e.type==='summon'&&e.ritual).length,7-slots);assert.equal(r.state.players[side].field.length,7);found=true;break;
  }assert(found);
 }
 const general=Object.values(DB).find(c=>c.aura==='general');assert(general);let reacted=false;
 for(let seed=1;seed<100;seed++){
  const g=fixture(0,seed,['TDE1']);g.players[1].field=[mon(general.id,'general')];const r=reduce(g,{type:'play',idx:0});
  if(!r.events.some(e=>e.type==='summon'&&e.player===1))continue;
  reacted=true;assert(r.events.filter(e=>e.type==='summon'&&e.player===1).every(e=>!e.ritual));assert([...forbiddenBatches(r.events).values()].flat().every(e=>e.player===0));break;
 }assert(reacted,'counter-summon fixture exercised');
 const s={type:'summon',player:0,id:'TDE2',uid:'one',ritual:'batch'};
 const batch=forbiddenBatches([s,{...s,uid:'reaction',ritual:undefined},{...s,uid:'two'},{...s,player:1,uid:'opp'},{...s,uid:'next',ritual:'later'}]);
 assert.deepEqual([...batch.values()].map(v=>v.map(x=>x.uid)),[['one','two'],['opp'],['next']]);
 const dom=new JSDOM('<div id="source"></div><div id="target"></div>',{pretendToBeVisual:true});for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
 Object.assign(globalThis,{innerWidth:800,innerHeight:700});let reduced=false,now=0,next=0;const frames=new Map();globalThis.matchMedia=()=>({get matches(){return reduced}});globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next};globalThis.cancelAnimationFrame=i=>frames.delete(i);
 globalThis.checks={created:0,disposed:0,fail:false,capture:undefined};dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 await build({entryPoints:['client/src/ui/forbiddenRitual/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'gpu',setup(b){b.onResolve({filter:/cardSurface$/},()=>({path:'surface',namespace:'mock'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='surface'?`export const CARD_PADDING=.1;export async function captureCardSurface(){if(checks.capture)await checks.capture;return {face:{width:300,height:450}}}`:`export function createRenderer(){checks.created++;return {canvas:document.createElement('canvas'),draw(){if(checks.fail)throw Error('GPU')},dispose(){checks.disposed++}}}`}));}}]});
 const {playForbiddenRitual:play,cancelForbiddenRituals:cancel,FORBIDDEN_RITUAL_SELECTION}=await import(path.join(dir,'runtime.mjs'));assert.equal(FORBIDDEN_RITUAL_SELECTION,'spiral-blood-pact-03');
 const source=document.getElementById('source'),target=document.getElementById('target');for(const el of [source,target])el.getBoundingClientRect=()=>({x:20,y:20,width:80,height:120});
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();},advance=ms=>{now+=ms;const fs=[...frames.values()];frames.clear();fs.forEach(f=>f(now))};
 const first=play(source,[target],'me');await flush();assert(document.querySelector('.forbidden-ritual'));assert.equal(source.style.visibility,'hidden');advance(6200);assert.equal(await first,true);assert.equal(source.style.visibility,'');
 for(const reason of ['abort','cancel','resize','disconnect','pagehide','visibilitychange']){const ac=new AbortController(),p=play(source,[target],'opp',ac.signal);await flush();if(reason==='abort')ac.abort();if(reason==='cancel')cancel();if(reason==='resize'||reason==='pagehide')window.dispatchEvent(new Event(reason));if(reason==='visibilitychange')document.dispatchEvent(new Event(reason));if(reason==='disconnect'){target.remove();advance(16);}assert.equal(await p,false);assert.equal(source.style.visibility,'');document.body.append(target);assert.equal(document.querySelector('.forbidden-ritual'),null);}
 reduced=true;assert.equal(await play(source,[target],'me'),true);reduced=false;checks.fail=true;assert.equal(await play(source,[target],'me'),false);checks.fail=false;
 let release;checks.capture=new Promise(r=>release=r);const ac=new AbortController(),pending=play(source,[target],'me',ac.signal);ac.abort();release();assert.equal(await pending,false);await flush();assert.equal(document.querySelector('.game'),null);
 assert.equal(checks.created,checks.disposed);assert.equal(frames.size,0);assert.equal(document.querySelector('.forbidden-ritual'),null);dom.window.close();
 console.log('PASS Forbidden 03: both sides / all dice outcomes / 0,1,3 summons; payment order; explicit batch identity; complete, reduced, abort, resize, hidden, disconnect, GPU failure and capture cancellation cleanup');
}finally{await rm(dir,{recursive:true,force:true})}
