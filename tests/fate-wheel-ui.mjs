import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body></body>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
let reduced=true;globalThis.matchMedia=()=>({matches:reduced});
globalThis.__wheel={disposed:0,replays:0,rewinds:0,wait:null};
const dir=await mkdtemp(path.join(tmpdir(),'wheel-ui-'));
const mocks={
 i18n:'export const getLang=()=>"ja";',
 cardView:'export const cardEl=()=>document.createElement("div");',
 anim:'export const enchantActivation=()=>{};',sound:'export const sfx=()=>{};',
 diceScene:'export async function mountDiceScene(){if(__wheel.wait)await __wheel.wait;return {finished:Promise.resolve(),dispose(){__wheel.disposed++},async replay(values,prepare){__wheel.replays++;await prepare({dice:[{}]});}}}',
 fateWheelRewind:'export const wheelTime=async()=>{};export const rewindDice=async()=>{__wheel.rewinds++};'
};
try{
 await build({entryPoints:['client/src/ui/fateWheel.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'ui.mjs'),loader:{'.css':'empty'},plugins:[{name:'ui-boundaries',setup(b){b.onResolve({filter:/.*/},a=>{const key=a.path.split('/').at(-1);return mocks[key]?{path:key,namespace:'test'}:null;});b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:mocks[a.path]}));}}]});
 const {openWheelDice}=await import(path.join(dir,'ui.mjs'));
 const roll={type:'dice',player:0,source:{player:0,id:'STARTER_CHEST'},rolls:[1]};
 for(const mine of [true,false]){
  let answers=0;const session=openWheelDice(roll,mine,()=>answers++);await session.ready;
  assert.match(document.querySelector('.d3-cap').textContent,/1.*未確定/);assert.equal(document.querySelectorAll('.wheel-choice button').length,mine?2:0);
  window.dispatchEvent(new Event('resize'));document.dispatchEvent(new Event('visibilitychange'));assert(document.querySelector('.wheel-choice'));assert.equal(answers,0,'no implicit decision on lifecycle events');
  if(mine){const button=document.querySelector('[data-wheel="reroll"]');button.click();button.click();assert.equal(answers,1,'one submission');}
  await session.finish();assert.equal(document.querySelector('.wheel-decision'),null);
 }
 reduced=false;let session=openWheelDice(roll,true,()=>{});await session.ready;await session.finish({...roll,rolls:[6]});assert.equal(__wheel.replays,1);assert.equal(__wheel.rewinds,1,'selected rewind runs on retained stage');assert.equal(document.querySelector('.wheel-decision'),null);
 let release;__wheel.wait=new Promise(r=>release=r);session=openWheelDice(roll,true,()=>{});session.close();release();await session.ready;assert.equal(document.querySelector('.wheel-decision'),null,'cancel while loading');__wheel.wait=null;
 session=openWheelDice(roll,false,()=>{},true);await session.ready;session.close();assert.equal(document.querySelectorAll('.wheel-decision').length,0,'reconnect cleanup');
 console.log('PASS Fate Wheel UI: explicit single choice, opponent observer, retained replay, reduced motion, resize/background preservation, cancellation and reconnect');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
