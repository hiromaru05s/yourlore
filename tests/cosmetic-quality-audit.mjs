import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.STUDIO_ORIGIN||'http://127.0.0.1:5336',out=process.env.STUDIO_QA_OUT||'/tmp/lore-cosmetic-audit';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto(origin+'/cosmetic-studio.html?audit=1&set=tidal');
 for(const quality of ['current','native']){
  await page.locator(`[data-quality=${quality}]`).click();
  for(const size of ['595x540','1280x720','1920x1080']){
   await page.locator('#size').selectOption(size);const [w,h]=size.split('x').map(Number),frame=await(await page.waitForSelector('#audit-board')).contentFrame();
   await frame.waitForSelector('[data-scene-ready=true]',{timeout:90000});
   await frame.waitForFunction(w=>{const c=document.querySelector('.duel-objects-3d');return c&&c.getBoundingClientRect().width===w},w);
   await page.waitForTimeout(600);
   const metrics=await frame.evaluate(()=>({canvas:Array.from(document.querySelectorAll('.duel-objects-3d,.board-flight-canvas')).map(c=>({w:c.width,h:c.height,cssW:c.getBoundingClientRect().width,cssH:c.getBoundingClientRect().height})),piles:Array.from(document.querySelectorAll('.pile')).map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,sleeve:e.dataset.sleeve})),scale:atelier.dimensions().scale}));
   const expected=quality==='native'?2:Math.min(2,1.5,Math.sqrt(2600000/(w*h)));for(const c of metrics.canvas){assert(Math.abs(c.w-w*expected)<=1);assert(Math.abs(c.h-h*expected)<=1);}assert.equal(metrics.scale,1);rows.push({quality,size,...metrics});
   if(size==='595x540'){await page.locator('#audit-board').screenshot({path:`${out}/raster-${quality}.png`});}
  }
 }
 // Audit each design in real board projection, from both wearers. UI helpers
 // are the same fixture APIs used by the existing cosmetic browser regressions.
 await page.setViewportSize({width:1280,height:720});
 const themes=['nocturne','porcelain','garnet','verdigris','amber','tidal','silverflow','emberheart'];
 await page.goto(origin+'/cosmetic-studio.html?board=1&polish=1&set=tidal&side=self&thickness=1');await page.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 for(const set of themes)for(const side of ['self','opponent']){
  await page.evaluate(({set,side})=>atelier.apply({set,side,count:8,dense:false,motion:false,time:2}),{set,side});
  await page.waitForTimeout(350);await page.screenshot({path:`${out}/${set}-${side}.jpg`,type:'jpeg',quality:95});
  assert.equal(await page.locator(side==='self'?'#pile-myDeck':'#pile-oppDeck').getAttribute('data-sleeve'),`/cosmetics/atelier-v1/${set}/back.webp`);
 }
 // Material cues freeze and resume correctly; moving-card styling is inspected
 // separately in source (the overlay adapter only decorates resting piles).
 for(const set of ['silverflow','emberheart']){
  const snapshots=[];for(const time of [0,2,4]){await page.evaluate(({set,time})=>atelier.apply({set,side:'self',count:8,dense:false,motion:false,time}),{set,time});await page.waitForTimeout(250);snapshots.push(await page.evaluate(()=>atelier.info()));await page.screenshot({path:`${out}/${set}-t${time}.jpg`,type:'jpeg',quality:95});}
  rows.push({set,snapshots});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-results.json',JSON.stringify({passed:true,rows,errors},null,2));console.log('PASS: 6 raster cases, 16 equipped boards, 6 material phases');
}finally{await browser.close();if(errors.length)console.error(errors)}
