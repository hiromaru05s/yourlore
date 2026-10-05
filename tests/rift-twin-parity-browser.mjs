const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-05-rift-twin/qa';
await fs.mkdir(out,{recursive:true});
const ref=await build({entryPoints:[process.env.RIFT_APPROVED_RENDERER||'../../rift-detail-six/LORE_TCG/docs/vfx-prototypes/2026-10-03-rift-detail-six/renderer.ts'],bundle:true,write:false,format:'esm'});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
const page=await browser.newPage();await page.route('**/approved02.js',r=>r.fulfill({contentType:'text/javascript',body:ref.outputFiles[0].text}));
await page.route('**/parity-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5317')+'/parity-fixture');
const results=await page.evaluate(async()=>{
const {RiftRenderer,disposeMaterial}=await import('/approved02.js');const {acquireSilverInk}=await import('/src/ui/riftInkRenderer.ts');
const ref=new RiftRenderer(),current=acquireSilverInk();
const face=document.createElement('canvas');face.width=192;face.height=288;const f=face.getContext('2d');f.fillStyle='#341245';f.fillRect(0,0,192,288);f.fillStyle='#eeddae';f.fillRect(8,8,176,10);for(let i=0;i<16;i++){f.fillStyle=`hsl(${i*19} 55% 55%)`;f.fillRect(12+i*10,40+i*8,10,150);}
const canvases=[0,1].map(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;return c;}),cs=canvases.map(c=>c.getContext('2d',{willReadFrequently:true})),results=[];
try{for(const width of [96,160])for(const bg of ['#f5f3ee','#14101c'])for(const ms of [0,580,800,1110,1260,1450,1660,1860,1940,1990,2160,2370,2600,2800]){
 cs.forEach(c=>{c.fillStyle=bg;c.fillRect(0,0,640,480);});const p={x:260,y:240},sink={x:560,y:120};ref.draw(cs[0],face,'membrane',p,sink,width,ms);current.renderer.draw(cs[1],face,p,sink,width,ms);
 const [a,b]=cs.map(c=>c.getImageData(0,0,640,480).data);let sum=0,max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);if(d>4)changed++;}results.push({width,bg,ms,mae:sum/a.length,max,over4:changed/a.length});
}return results;}finally{current.release();disposeMaterial();}
});
await fs.writeFile(out+'/prototype-parity.json',JSON.stringify({reference:'2eceb799 membrane',cases:results},null,2));
assert(results.every(r=>r.mae<.12&&r.over4<.003));console.log('PASS',results.length,'cases; maximum mean channel difference',Math.max(...results.map(r=>r.mae)),'maximum >4 ratio',Math.max(...results.map(r=>r.over4)));
}finally{await browser.close();}
