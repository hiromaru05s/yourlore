// Exercise the real result modal with the native rank presenter and navigation.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tmp=await mkdtemp(join(tmpdir(),'lore-finale-'));
const dom=new JSDOM('<button id="origin">Play</button>',{url:'http://localhost',pretendToBeVisual:true});
try{
 for(const key of ['window','document','HTMLElement','Element','Node','MutationObserver','localStorage','sessionStorage'])globalThis[key]=dom.window[key];
 let reduced=false;globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});globalThis.innerWidth=1280;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;globalThis.getComputedStyle=dom.window.getComputedStyle;dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
 let now=0,next=0;const frames=new Map();
 globalThis.performance={now:()=>now};
 globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 await build({stdin:{contents:"export {winModal,closeOverlay} from './client/src/ui/modal';export {RankPresentation} from './client/src/ui/rankPresentation';export {setLang} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(tmp,'ui.mjs'),loader:{'.css':'empty'}});
 const {winModal,closeOverlay,RankPresentation,setLang}=await import(join(tmp,'ui.mjs'));
 setLang('ja');const calls=[];const open=won=>winModal(won,'<span id="winExperience">EXP +20</span>',()=>calls.push('again'),()=>calls.push('home'),()=>calls.push('review'));
 const tick=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
 for(const [won,title,after] of [[true,'VICTORY',1198],[false,'DEFEAT',1164],[null,'DRAW',1180]]){
  now=0;document.querySelector('#origin').focus();open(won);
  const dialog=document.querySelector('[role=dialog]');assert.equal(dialog.querySelector('h2').textContent,title);
  assert.equal(dialog.getAttribute('aria-labelledby'),dialog.querySelector('h2').id);
  assert.equal(dialog.querySelector('#winExperience').textContent,'EXP +20');
  const rank=new RankPresentation();rank.set({before:1180,after,season:'2026-10'});rank.mount(dialog.querySelector('#winRankDelta'));
  tick(16);tick(4500);const mid=Number(dialog.querySelector('.rank-score b').textContent.replaceAll(',',''));
  if(after!==1180)assert(mid>Math.min(1180,after)&&mid<Math.max(1180,after),'MMR still counts between values');
  tick(6200);assert.equal(dialog.querySelector('.rank-score b').textContent,after.toLocaleString('en-US'));
  assert.equal(dialog.querySelectorAll('.rank-result-header,.rank-previous').length,0);
  assert(!dialog.textContent.includes('2026-10'));assert(!dialog.textContent.includes('ランクマッチ'));
  dialog.querySelector('.finale-review').click();await Promise.resolve();assert.equal(document.querySelector('[role=dialog]'),null);
  assert.equal(document.activeElement.id,'origin');rank.destroy();assert.equal(frames.size,0);
 }
 open(true);document.querySelector('.finale-home').click();open(false);document.querySelector('.finale-again').click();
 assert.deepEqual(calls,['review','review','review','home','again']);
 winModal(null,'',()=>{},()=>{});assert.equal(document.querySelectorAll('.finale-actions button').length,2);closeOverlay();
 await Promise.resolve();assert.equal(frames.size,0);
 // A server receipt arriving after the result must still animate exactly once.
 now=0;open(true);let late=new RankPresentation();late.mount(document.querySelector('#winRankDelta'),()=>{});tick(16);tick(7600);
 assert(document.querySelector('.rank-pending'));late.pending(true);assert(document.querySelector('.rank-retry'));
 late.set({before:1090,after:1107,matchId:'late-receipt'});tick(8400);assert.equal(document.querySelector('.ceremony-rank').dataset.phase,'count');tick(9500);assert.equal(document.querySelector('.rank-score b').textContent,'1,107');
 late.set({before:1090,after:1130,matchId:'duplicate'});assert.equal(document.querySelector('.rank-score b').textContent,'1,107');closeOverlay();late.destroy();
 now=0;open(true);late=new RankPresentation();late.set({before:1090,after:1107,matchId:'late-receipt'});late.mount(document.querySelector('#winRankDelta'));assert.equal(document.querySelector('.ceremony-rank').dataset.phase,'settled');closeOverlay();late.destroy();
 reduced=true;now=0;open(false);late=new RankPresentation();late.set({before:1,after:0});late.mount(document.querySelector('#winRankDelta'));assert.equal(document.querySelector('.rank-score b').textContent,'0');assert.equal(document.querySelector('.result-ceremony').dataset.time,'7400');closeOverlay();late.destroy();reduced=false;
 await Promise.resolve();assert.equal(frames.size,0);
 console.log('PASS: victory/defeat/draw, native MMR count, removed metadata, rewards, review/home/rematch, focus restore, cleanup.');
}finally{dom.window.close();await rm(tmp,{recursive:true,force:true});}
