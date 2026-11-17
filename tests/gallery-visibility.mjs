import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-gallery-visibility-'),dom=new JSDOM('<main id="grid"></main>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','HTMLImageElement','Element','getComputedStyle','location'])globalThis[k]=dom.window[k];
const observers=[];globalThis.IntersectionObserver=class{nodes=new Set();constructor(callback,options){this.callback=callback;this.options=options;observers.push(this)}observe(n){this.nodes.add(n)}disconnect(){this.nodes.clear()}emit(target,isIntersecting){this.callback([{target,isIntersecting}])}};
try{
 await build({stdin:{contents:"export {revealCards,cancelRevealCards} from './client/src/ui/assetReadiness';export {galleryCards,assetHints} from './client/src/ui/assetHints';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},outfile:dir+'/gallery.mjs'});
 const {revealCards,cancelRevealCards,galleryCards,assetHints}=await import(dir+'/gallery.mjs'),grid=document.querySelector('#grid');
 function card(){const n=document.createElement('div');n.className='card';galleryCards.add(n);assetHints.set(n,()=>[]);return n;}
 const a=card(),b=card();await revealCards(grid,[a,b],()=>true);const first=observers.at(-1);
 assert.equal(first.options.root,grid);assert.equal(first.nodes.size,2);assert(a.classList.contains('gallery-offscreen'));
 first.emit(a,true);assert(!a.classList.contains('gallery-offscreen'));assert(b.classList.contains('gallery-offscreen'));
 first.emit(a,false);assert(a.classList.contains('gallery-offscreen'));
 const c=card();await revealCards(grid,[c],()=>true);assert.equal(first.nodes.size,0,'filter changes release old cards');assert.equal(observers.at(-1).nodes.size,1);
 cancelRevealCards(grid);assert.equal(observers.at(-1).nodes.size,0,'screen disposal releases observer');assert(!c.classList.contains('gallery-offscreen'));
 console.log('PASS gallery visibility, scroll resume, replacement and disposal');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true})}
