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
 globalThis.matchMedia=()=>({matches:false});
 let now=0,next=0;const frames=new Map();
 globalThis.performance={now:()=>now};
 globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 await build({stdin:{contents:"export {winModal,closeOverlay} from './client/src/ui/modal';export {RankPresentation} from './client/src/ui/rankPresentation';export {setLang} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(tmp,'ui.mjs'),loader:{'.css':'empty'}});
 const {winModal,closeOverlay,RankPresentation,setLang}=await import(join(tmp,'ui.mjs'));
 setLang('ja');const calls=[];const open=won=>winModal(won,'<span id="winExperience">EXP +20</span>',()=>calls.push('again'),()=>calls.push('home'),()=>calls.push('review'));
 const tick=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
 for(const [won,title,after] of [[true,'勝利',1198],[false,'敗北',1164],[null,'引き分け',1180]]){
  now=0;document.querySelector('#origin').focus();open(won);
  const dialog=document.querySelector('[role=dialog]');assert.equal(dialog.querySelector('h2').textContent,title);
  assert.equal(dialog.getAttribute('aria-labelledby'),dialog.querySelector('h2').id);
  assert.equal(dialog.querySelector('#winExperience').textContent,'EXP +20');
  const rank=new RankPresentation();rank.set({before:1180,after,season:'2026-10'});rank.mount(dialog.querySelector('#winRankDelta'));
  tick(1000);const mid=Number(dialog.querySelector('.rank-score b').textContent);
  if(after!==1180)assert(mid>Math.min(1180,after)&&mid<Math.max(1180,after),'MMR still counts between values');
  tick(3000);assert.equal(dialog.querySelector('.rank-score b').textContent,String(after));
  assert.equal(dialog.querySelectorAll('.rank-result-header,.rank-previous').length,0);
  assert(!dialog.textContent.includes('2026-10'));assert(!dialog.textContent.includes('ランクマッチ'));
  dialog.querySelector('.finale-review').click();await Promise.resolve();assert.equal(document.querySelector('[role=dialog]'),null);
  assert.equal(document.activeElement.id,'origin');rank.destroy();assert.equal(frames.size,0);
 }
 open(true);document.querySelector('.finale-home').click();open(false);document.querySelector('.finale-again').click();
 assert.deepEqual(calls,['review','review','review','home','again']);
 winModal(null,'',()=>{},()=>{});assert.equal(document.querySelectorAll('.finale-actions button').length,2);closeOverlay();
 console.log('PASS: victory/defeat/draw, native MMR count, removed metadata, rewards, review/home/rematch, focus restore, cleanup.');
}finally{dom.window.close();await rm(tmp,{recursive:true,force:true});}
