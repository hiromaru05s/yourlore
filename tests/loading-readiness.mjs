import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['document','window','location','HTMLElement','HTMLImageElement','MutationObserver','localStorage','CustomEvent'])globalThis[key]=dom.window[key];
const timer=globalThis.setTimeout;
// Exercise a 20s caller deadline against the longer shared transfer deterministically.
globalThis.setTimeout=(fn,ms,...args)=>timer(fn,ms===20000?20:ms===60000?500:ms,...args);
const temp=await mkdtemp(path.join(tmpdir(),'lore-readiness-'));
let behavior,created=0;
globalThis.Image=class {naturalWidth=64;naturalHeight=64;constructor(){created++;}decode(){return behavior(this.src);}};
const host=()=>{const el=document.createElement('div');document.body.append(el);return el;};
const until=async condition=>{for(let i=0;i<100&&!condition();i++)await new Promise(r=>timer(r,2));assert(condition());};
try {
 await build({stdin:{contents:`export {waitAssets,imageUrls} from './client/src/ui/assetReadiness';export {prepareDuel,waitForDuel} from './client/src/ui/duelReadiness';`,resolveDir:process.cwd()},bundle:true,loader:{'.css':'empty'},platform:'node',format:'esm',outfile:path.join(temp,'ready.mjs')});
 const {waitAssets,imageUrls,prepareDuel,waitForDuel}=await import(path.join(temp,'ready.mjs'));
 globalThis.getComputedStyle=(el,pseudo)=>pseudo?{display:'none',content:'none'}:dom.window.getComputedStyle(el);
 const visibility=host();visibility.innerHTML='<div style="display:none;background-image:url(/hidden.webp)"><div style="background-image:url(/hidden-child.webp)"></div></div><div style="visibility:hidden;background-image:url(/opening.webp)"></div><div style="opacity:0;background-image:url(/transparent.webp)"></div>';
 const visibleUrls=imageUrls(visibility);assert(!visibleUrls.some(url=>url.includes('hidden')));assert(visibleUrls.some(url=>url.includes('opening')));assert(visibleUrls.some(url=>url.includes('transparent')));visibility.remove();
 let attempts=0;behavior=()=>++attempts===1?Promise.reject(Error('transient')):Promise.resolve();
 const a=host();await waitAssets(['/retry.webp'],a);assert.equal(attempts,2);assert.equal(a.querySelector('.asset-retry'),null);a.remove();
 const before=created;let complete;behavior=()=>new Promise(r=>complete=r);const b=host();const slow=waitAssets(['/slow.webp'],b);
 await until(()=>!!complete);await new Promise(r=>timer(r,30));assert.equal(created-before,1,'caller timeout must not restart the shared download');complete();await slow;assert.equal(b.querySelector('.asset-retry'),null);b.remove();
 behavior=()=>Promise.reject(Error('offline'));const c=host(),abort=new AbortController(),cancel=waitAssets(['/offline.webp'],c,undefined,abort.signal);
 await until(()=>!!c.querySelector('.asset-retry'));abort.abort();await cancel;assert.equal(c.querySelector('.asset-retry'),null);c.remove();
 const d=host(),detached=waitAssets(['/detached.webp'],d);await until(()=>!!d.querySelector('.asset-retry'));d.remove();await detached;
 HTMLImageElement.prototype.decode=()=>Promise.resolve();Object.defineProperty(document,'fonts',{value:{ready:Promise.resolve()}});globalThis.requestAnimationFrame=fn=>timer(()=>fn(performance.now()),0);
 let offline=true;behavior=url=>offline&&url.includes('mask-self')?Promise.reject(Error('offline')):Promise.resolve();const duel=host();duel.dataset.boardRendered='true';duel.dataset.sceneReady='true';prepareDuel(duel,Promise.resolve());await until(()=>!!duel.querySelector('.asset-retry'));await new Promise(r=>timer(r,5));assert.equal(duel.querySelectorAll('.asset-retry').length,1,'only the final readiness pass owns retry UI');offline=false;duel.querySelector('.asset-retry').click();await waitForDuel(duel);assert.equal(duel.querySelector('.duel-loader'),null);duel.remove();
 console.log('PASS single duel retry owner, transient retry, shared slow transfer, abort while awaiting manual retry, detached host cleanup');
} finally {globalThis.setTimeout=timer;dom.window.close();await rm(temp,{recursive:true,force:true});}
