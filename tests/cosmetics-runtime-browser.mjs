import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-cosmetics-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5296';
await fs.mkdir('/tmp/lore-cosmetics-perf',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('**/__cosmetics-runtime',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto(origin+'/__cosmetics-runtime');
 const results=await page.evaluate(async()=>{
  await import('/src/styles/card.css');
  const {cardEl}=await import('/src/ui/cardView.ts'),{STARTERS}=await import('/src/shared/cards.ts');
  const {ensureCardFrameReady,disposeCardFrames}=await import('/src/ui/cardFrame.ts');
  const {disposeCardEffects}=await import('/src/ui/cardFinish.ts');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));let gpu=0,paint=0;
  const draw=WebGLRenderingContext.prototype.drawArrays,clear=CanvasRenderingContext2D.prototype.clearRect;
  WebGLRenderingContext.prototype.drawArrays=function(...a){gpu++;return draw.apply(this,a);};
  CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.classList.contains('card-effect-surface'))paint++;return clear.apply(this,a);};
  const root=document.createElement('div');root.style.cssText='display:flex;gap:20px';document.body.append(root);
  for(const [i,effect] of ['effect:crystal-facets','effect:stardust-foil','effect:prism-veil'].entries()){
   const c=cardEl({...STARTERS.STARTER_MANA,uid:'perf-'+i},{size:'mkt',frame:'frame:flowing-gold',effect});root.append(c);await ensureCardFrameReady(c);
  }
  await sleep(400);gpu=paint=0;await sleep(500);const live={gpu,paint};
  root.hidden=true;root.style.display='none';await sleep(200);gpu=paint=0;await sleep(500);const hidden={gpu,paint};
  root.hidden=false;root.style.display='flex';await sleep(200);gpu=paint=0;await sleep(500);const resumed={gpu,paint};
  disposeCardFrames(root);disposeCardEffects(root);root.remove();await sleep(100);gpu=paint=0;await sleep(250);const disposed={gpu,paint,remaining:document.querySelectorAll('.card-effect-surface,.card-frame-material').length};
  return {live,hidden,resumed,disposed};
 });
 assert(results.live.gpu>0&&results.live.paint>0);assert.deepEqual(results.hidden,{gpu:0,paint:0});assert(results.resumed.gpu>0&&results.resumed.paint>0);assert.deepEqual(results.disposed,{gpu:0,paint:0,remaining:0});
 console.log('PASS: frame + all three effects stop when hidden, resume when visible, and free canvases on teardown',results);
 await fs.writeFile('/tmp/lore-cosmetics-perf/runtime.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
