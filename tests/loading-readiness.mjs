import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['document','window','location','HTMLElement','HTMLImageElement','MutationObserver','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
const timer=globalThis.setTimeout;
// Exercise a 20s caller deadline against the longer shared transfer deterministically.
globalThis.setTimeout=(fn,ms,...args)=>timer(fn,ms===20000?20:ms===30000?30:ms===60000?500:ms,...args);
const temp=await mkdtemp(path.join(tmpdir(),'lore-readiness-'));
let behavior,created=0;
globalThis.Image=class {naturalWidth=64;naturalHeight=64;constructor(){created++;}decode(){return behavior(this.src);}};
const host=()=>{const el=document.createElement('div');document.body.append(el);return el;};
const until=async condition=>{for(let i=0;i<100&&!condition();i++)await new Promise(r=>timer(r,2));assert(condition());};
try {
 await build({stdin:{contents:`export {waitAssets,imageUrls,coverScreen} from './client/src/ui/assetReadiness';export {galleryCards} from './client/src/ui/assetHints';export {prepareDuel,waitForDuel} from './client/src/ui/duelReadiness';`,resolveDir:process.cwd()},bundle:true,loader:{'.css':'empty'},platform:'node',format:'esm',outfile:path.join(temp,'ready.mjs')});
 const {waitAssets,imageUrls,coverScreen,galleryCards,prepareDuel,waitForDuel}=await import(path.join(temp,'ready.mjs'));
 globalThis.getComputedStyle=(el,pseudo)=>pseudo?{display:'none',content:'none'}:dom.window.getComputedStyle(el);
 const visibility=host();visibility.innerHTML='<div style="display:none;background-image:url(/hidden.webp)"><div style="background-image:url(/hidden-child.webp)"></div></div><div style="visibility:hidden;background-image:url(/opening.webp)"></div><div style="opacity:0;background-image:url(/transparent.webp)"></div>';
 const visibleUrls=imageUrls(visibility);assert(!visibleUrls.some(url=>url.includes('hidden')));assert(visibleUrls.some(url=>url.includes('opening')));assert(visibleUrls.some(url=>url.includes('transparent')));visibility.remove();
 const gallery=host();gallery.style.overflowY='auto';gallery.getBoundingClientRect=()=>({left:0,top:100,right:500,bottom:400,width:500,height:300});
 for(const [name,top] of [['first',110],['later',500]]){const card=document.createElement('div'),img=document.createElement('img');img.src='/'+name+'.webp';img.loading='lazy';card.append(img);card.getBoundingClientRect=()=>({left:10,top,right:110,bottom:top+120,width:100,height:120});galleryCards.add(card);gallery.append(card);}
 const admitted=imageUrls(gallery);assert(admitted.some(u=>u.endsWith('/first.webp')));assert(!admitted.some(u=>u.endsWith('/later.webp')),'Gallery rows outside the scrollport must not block admission');assert.equal(gallery.lastChild.firstChild.loading,'lazy');gallery.remove();
 let attempts=0;behavior=()=>++attempts===1?Promise.reject(Error('transient')):Promise.resolve();
 const a=host();await waitAssets(['/retry.webp'],a);assert.equal(attempts,2);assert.equal(a.querySelector('.asset-retry'),null);a.remove();
 const before=created;let complete;behavior=()=>new Promise(r=>complete=r);const b=host();const slow=waitAssets(['/slow.webp'],b);
 await until(()=>!!complete);await new Promise(r=>timer(r,30));assert.equal(created-before,1,'caller timeout must not restart the shared download');complete();await slow;assert.equal(b.querySelector('.asset-retry'),null);b.remove();
 behavior=()=>Promise.reject(Error('offline'));const c=host(),abort=new AbortController(),cancel=waitAssets(['/offline.webp'],c,undefined,abort.signal);
 await until(()=>!!c.querySelector('.asset-retry'));abort.abort();await cancel;assert.equal(c.querySelector('.asset-retry'),null);c.remove();
 const d=host(),detached=waitAssets(['/detached.webp'],d);await until(()=>!!d.querySelector('.asset-retry'));d.remove();await detached;
 HTMLImageElement.prototype.decode=()=>Promise.resolve();Object.defineProperty(document,'fonts',{value:{ready:Promise.resolve()}});globalThis.requestAnimationFrame=fn=>timer(()=>fn(performance.now()),0);
 const chapter=host();chapter.innerHTML='<img src="/visible.webp"><section style="display:none"><img src="/lazy-hidden.webp"></section>';const hidden=chapter.querySelector('section img');hidden.loading='lazy';let hiddenDecodes=0;hidden.decode=()=>{hiddenDecodes++;return new Promise(()=>{});};behavior=()=>Promise.resolve();const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Visible HOME must not wait for the archive or shop');};assert.equal(await coverScreen(chapter,true).ready(),true);globalThis.fetch=originalFetch;assert.equal(hiddenDecodes,0,'Hidden lazy chapter images must not delay visible screen admission');chapter.remove();
 const home=host();home.innerHTML='<div data-atmosphere="loading"></div>';let revealed=false;const entrance=coverScreen(home,true,true,[]);const admission=entrance.ready().then(()=>{revealed=true;});await new Promise(r=>timer(r,10));assert.equal(revealed,false,'Visible HOME must wait for its first complete atmosphere frame');home.firstChild.dataset.atmosphere='ready';await admission;assert.equal(revealed,true);home.remove();
 const navigating=host();navigating.innerHTML='<div data-atmosphere="loading"></div><div class="home-companion" style="opacity:.8;transform:scale(.9)"></div>';const cancelledEntrance=coverScreen(navigating,true,true,[]),cancelledAdmission=cancelledEntrance.ready();await new Promise(r=>timer(r,10));cancelledEntrance.cancel();assert.equal(await cancelledAdmission,false);assert.equal(navigating.querySelector('.home-companion').style.opacity,'0.8');assert.equal(navigating.querySelector('.home-companion').style.transform,'scale(.9)');assert.equal(navigating.inert,false);navigating.remove();
 let offline=true;behavior=url=>offline&&url.includes('mask-self')?Promise.reject(Error('offline')):Promise.resolve();const duel=host();duel.dataset.boardRendered='true';duel.dataset.sceneReady='true';prepareDuel(duel,Promise.resolve());await until(()=>!!duel.querySelector('.asset-retry'));await new Promise(r=>timer(r,5));assert.equal(duel.querySelectorAll('.asset-retry').length,1,'only the final readiness pass owns retry UI');offline=false;duel.querySelector('.asset-retry').click();await waitForDuel(duel);assert.equal(duel.querySelector('.duel-loader'),null);duel.remove();
 behavior=()=>new Promise(()=>{});const bot=host();bot.innerHTML='<img src="/stalled-bot.webp">';bot.dataset.duelMode='bot';bot.dataset.boardRendered='true';bot.dataset.sceneReady='true';prepareDuel(bot,Promise.resolve());await waitForDuel(bot);assert.equal(bot.dataset.assetFallback,'true','BOT must not wait indefinitely for artwork');assert.equal(bot.querySelector('.duel-loader'),null);bot.remove();
 console.log('PASS single duel retry owner, transient retry, shared slow transfer, abort while awaiting manual retry, detached host cleanup');
} finally {globalThis.setTimeout=timer;dom.window.close();await rm(temp,{recursive:true,force:true});}
