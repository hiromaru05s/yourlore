import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5586',out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-10-14-loading';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>performance.setResourceTimingBufferSize(10000));
 await page.goto(origin+'/duel-lab.html?polish',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('[data-scene-ready=true]',{timeout:120000});
 const tilt=await page.evaluate(async()=>{
  const {initCardTilt}=await import('/src/ui/tilt.ts');initCardTilt();
  const host=document.createElement('div');host.id='hand';const card=document.createElement('div');card.className='card';host.append(card);document.body.append(host);
  let reads=0;card.getBoundingClientRect=()=>{reads++;return new DOMRect(0,0,100,150);};
  card.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
  for(let i=0;i<200;i++)card.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:i/2,clientY:i/2}));
  const before=reads;await new Promise(requestAnimationFrame);const after=reads,rotation=card.style.getPropertyValue('--ry');
  card.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:50,clientY:50}));card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));await new Promise(requestAnimationFrame);
  const cleared=!card.classList.contains('tilt-live')&&!card.style.getPropertyValue('--ry');host.remove();return {events:200,before,after,rotation,cleared,finalReads:reads};
 });
 assert.equal(tilt.before,0);assert.equal(tilt.after,1);assert.equal(tilt.rotation,'6.93deg');assert(tilt.cleared);assert.equal(tilt.finalReads,1);
 // Prewarming and real loader share buffers even across independent scene disposal.
 const models=await page.evaluate(async()=>{
  const {loadReadingModel}=await import('/src/ui/readingModel.ts');const {readingBoardUrl}=await import('/src/ui/readingAssetCache.ts');
  const url=readingBoardUrl(false),count=()=>performance.getEntriesByType('resource').filter(r=>r.name===new URL(url,location.href).href).length;
  const before=count(),a=await loadReadingModel(url),b=await loadReadingModel(url);
  let first,second;a.scene.traverse(o=>{if(o.isMesh&&!first)first=o;});b.scene.traverse(o=>{if(o.isMesh&&!second)second=o;});
  const independent=first.geometry!==second.geometry&&first.material!==second.material;
  const geos=new Set(),mats=new Set(),maps=new Set(),bitmaps=new Set();for(const model of [a,b])model.scene.traverse(o=>{if(o.isMesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)maps.add(v);}}});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(m=>{if(m.image instanceof ImageBitmap)bitmaps.add(m.image);m.dispose();});bitmaps.forEach(b=>b.close());
  return {before,after:count(),independent};
 });assert(models.independent);assert.equal(models.before,1);assert.equal(models.before,models.after);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/interaction.json',JSON.stringify({tilt,models,errors},null,2));console.log(JSON.stringify({tilt,models,errors}));
}finally{await browser.close();}
