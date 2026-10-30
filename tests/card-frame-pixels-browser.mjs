import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-cosmetics-tools/node_modules/playwright/index.mjs');
const baseline='client/src/dev/cosmetics-perf-baseline.ts';
await fs.writeFile(baseline,execFileSync('git',['show','5839a8bd:client/src/ui/cardFrameMaterial.ts']));
await fs.mkdir('/tmp/lore-cosmetics-perf',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5296')+'/frame-material-five.html');
 const results=await page.evaluate(async()=>{
  const {CardFrameMaterial:Old}=await import('/src/dev/cosmetics-perf-baseline.ts');
  const {CardFrameMaterial:New}=await import('/src/ui/cardFrameMaterial.ts');
  const {cardEl}=await import('/src/ui/cardView.ts');const {STARTERS,DB}=await import('/src/shared/cards.ts');
  document.body.replaceChildren();const results=[];
  for(let kind=0;kind<5;kind++)for(const [card,size] of [[STARTERS.STARTER_MANA,'mkt'],[STARTERS.STARTER_TRASH,'field'],[DB.ELF,'mkt']]){
   const a=cardEl({...card,uid:'before'},{frame:'default',size}),b=cardEl({...card,uid:'after'},{frame:'default',size});document.body.append(a,b);
   const old=new Old(),next=new New();await old.attach(a,kind,()=>true);await next.attach(b,kind,()=>true);
   for(const t of [1.5,2.75,4]){
    old.draw(t,true);next.draw(t,true);const ac=[...a.querySelectorAll('.card-frame-material')],bc=[...b.querySelectorAll('.card-frame-material')];
    let max=0,total=0,different=0;
    for(let i=0;i<ac.length;i++){
     const x=ac[i].getContext('2d').getImageData(0,0,ac[i].width,ac[i].height).data,y=bc[i].getContext('2d').getImageData(0,0,bc[i].width,bc[i].height).data;
     for(let j=0;j<x.length;j++){const d=Math.abs(x[j]-y[j]);max=Math.max(max,d);total+=d;if(d)different++;}
    }
    results.push({kind,card:card.id,size,t,layers:ac.length,max,total,different});
   }
   old.dispose();next.dispose();a.remove();b.remove();
  }return results;
 });
 await fs.writeFile('/tmp/lore-cosmetics-perf/pixels.json',JSON.stringify(results,null,2));
 for(const r of results){assert(r.layers>=2);assert.equal(r.max,0,JSON.stringify(r));}
 console.log('PASS: 45 original/new material comparisons, identical RGBA pixels across 5 metals, seals, field and full card prints.');
 await fs.writeFile('/tmp/lore-cosmetics-perf/pixels.json',JSON.stringify(results,null,2));
}finally{await browser.close();await fs.rm(baseline,{force:true});}
