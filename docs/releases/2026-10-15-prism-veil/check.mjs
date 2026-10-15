import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build,transform} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const source=await fs.readFile(new URL('./selected-reference.ts.txt',import.meta.url),'utf8');
const reference=await transform(source,{loader:'ts',format:'iife',globalName:'Reference',target:'es2022'});
const module=await build({entryPoints:['client/src/ui/cardEffects/prismVeil.ts'],bundle:true,write:false,format:'iife',globalName:'Runtime',target:'es2022'});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.setContent('<style>.card{position:relative;width:320px;height:500px}.card-art{position:absolute;inset:0}.card img{position:absolute;width:85%;height:77%;left:7.5%;top:18%}</style>');
 await page.addScriptTag({content:reference.code});await page.addScriptTag({content:module.outputFiles[0].text});
 const report=await page.evaluate(async()=>{
  const texture=document.createElement('canvas');texture.width=346;texture.height=512;const ctx=texture.getContext('2d');const gradient=ctx.createLinearGradient(0,0,346,512);gradient.addColorStop(0,'#13283b');gradient.addColorStop(1,'#e2d5a4');ctx.fillStyle=gradient;ctx.fillRect(0,0,346,512);ctx.strokeStyle='white';ctx.lineWidth=9;ctx.strokeRect(55,140,170,230);const url=texture.toDataURL();
  const fixture=async(field=false)=>{const card=document.createElement('div');card.className='card'+(field?' card--field':'');card.innerHTML='<div class="card-art"><img></div>';const img=card.querySelector('img');img.src=url;await img.decode();document.body.append(card);return card;};
  const comparisons=[];
  for(const field of [false,true])for(const seed of [0,5]){
   const a=await fixture(field),b=await fixture(field);const ref=new Reference.Coating(a,0,seed),actual=Runtime.createPrismVeil(b,seed);await new Promise(r=>setTimeout(r,25));
   for(const t of [0,.37,1.5,3,6,9]){ref.draw(t);actual.draw(t);const p=ref.canvas.getContext('2d').getImageData(0,0,320,500).data,q=actual.canvas.getContext('2d').getImageData(0,0,320,500).data;let differing=0;for(let i=0;i<p.length;i++)if(p[i]!==q[i])differing++;comparisons.push({field,seed,seconds:t,differing});}
   actual.draw(9,0);if(actual.canvas.getContext('2d').getImageData(0,0,320,500).data.some(v=>v))throw Error('Zero intensity leaves pixels');actual.dispose();actual.dispose();actual.draw(20);if(b.querySelector('canvas'))throw Error('Disposed canvas remains');ref.dispose();a.remove();b.remove();
  }
  const hidden=document.createElement('div');hidden.className='card card--back';let rejected=false;try{Runtime.createPrismVeil(hidden);}catch{rejected=true;}if(!rejected||hidden.querySelector('canvas'))throw Error('Hidden card accepted');
  const pending=await fixture();const late=Runtime.createPrismVeil(pending);late.dispose();await new Promise(r=>setTimeout(r,30));late.draw(3);if(pending.querySelector('canvas')||late.canvas.width!==0)throw Error('Decode revived disposed material');pending.remove();
  const tile=document.createElement('div');tile.className='buff-icon';tile.innerHTML='<span class="buff-art card-art"></span>';tile.firstChild.style.backgroundImage=`url("${url}")`;document.body.append(tile);const miniature=Runtime.createPrismVeil(tile);await new Promise(r=>setTimeout(r,30));if(!miniature.ready)throw Error('CSS tile image relief was not decoded');miniature.draw(3);if(!miniature.canvas.getContext('2d').getImageData(0,0,320,500).data.some(v=>v))throw Error('Tile is blank');miniature.dispose();tile.remove();
  return {comparisons,hiddenRejected:rejected,zeroIntensity:true,idempotentDispose:true,decodeAfterDispose:true,backgroundArtTile:true};
 });
 assert(report.comparisons.every(x=>x.differing===0));assert.deepEqual(errors,[]);
 await fs.writeFile(new URL('./qa.json',import.meta.url),JSON.stringify({...report,errors},null,2));console.log('PASS: 24 pixel-exact matches against selected 2x preview; clear/dispose/hidden-card checks');
}finally{await browser.close();}
