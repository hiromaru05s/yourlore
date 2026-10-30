import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-cosmetics-tools/node_modules/playwright/index.mjs');
const files=['cardFinishCrystal','cardEffects/prismVeil'];
for(const [i,file] of files.entries())await fs.writeFile(`client/src/dev/effect-baseline-${i}.ts`,execFileSync('git',['show',`5839a8bd:client/src/ui/${file}.ts`]));
await fs.mkdir('/tmp/lore-cosmetics-perf',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5296')+'/frame-material-five.html');
 const results=await page.evaluate(async()=>{
  const {CrystalRenderer:OldCrystal}=await import('/src/dev/effect-baseline-0.ts'),{PrismVeilMaterial:OldPrism}=await import('/src/dev/effect-baseline-1.ts');
  const {CrystalRenderer:NewCrystal}=await import('/src/ui/cardFinishCrystal.ts'),{PrismVeilMaterial:NewPrism}=await import('/src/ui/cardEffects/prismVeil.ts');
  const {cardEl}=await import('/src/ui/cardView.ts'),{STARTERS}=await import('/src/shared/cards.ts');document.body.replaceChildren();const results=[];
  for(const kind of ['crystal','prism'])for(const size of ['mkt','field']){
   const a=cardEl({...STARTERS.STARTER_CHEST,uid:'same'},{size,frame:'default'}),b=cardEl({...STARTERS.STARTER_CHEST,uid:'same'},{size,frame:'default'});document.body.append(a,b);
   const old=kind==='crystal'?new OldCrystal():new OldPrism(a,42),next=kind==='crystal'?new NewCrystal():new NewPrism(b,42);
   if(kind==='crystal'){old.attach(a,2);next.attach(b,2);}
   await new Promise(r=>setTimeout(r,500));
   for(const t of [1.5,2.75,4]){
    old.draw(t);next.draw(t);let max=0,total=0;
    const ac=[...a.querySelectorAll('.card-effect-surface')],bc=[...b.querySelectorAll('.card-effect-surface')];
    for(let i=0;i<ac.length;i++){const x=ac[i].getContext('2d').getImageData(0,0,ac[i].width,ac[i].height).data,y=bc[i].getContext('2d').getImageData(0,0,bc[i].width,bc[i].height).data;for(let j=0;j<x.length;j++){const d=Math.abs(x[j]-y[j]);max=Math.max(max,d);total+=d;}}
    results.push({kind,size,t,max,total,layers:ac.length});
   }old.dispose();next.dispose();a.remove();b.remove();
  }return results;
 });
 await fs.writeFile('/tmp/lore-cosmetics-perf/effect-pixels.json',JSON.stringify(results,null,2));
 for(const r of results){assert(r.layers>0);assert.equal(r.max,0,JSON.stringify(r));}console.log('PASS: crystal geometry and cached prism relief retain identical pixels at 12 full/field card samples');
}finally{await browser.close();for(let i=0;i<files.length;i++)await fs.rm(`client/src/dev/effect-baseline-${i}.ts`,{force:true});}
