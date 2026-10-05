import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.STUDIO_ORIGIN||'http://127.0.0.1:5336',out=process.env.STUDIO_QA_OUT||'/tmp/lore-thickness-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const p=await browser.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 for(const scale of [1,3])for(const side of ['self','opponent']){
  await p.goto(`${origin}/cosmetic-studio.html?board=1&polish=1&set=tidal&side=${side}&thickness=${scale}`);await p.waitForSelector('[data-scene-ready=true]',{timeout:90000});
  const dimensions=await p.evaluate(()=>atelier.dimensions());assert.equal(dimensions.scale,scale);assert(Math.abs(dimensions.stock-.0008/.110*scale)<1e-9);
  await p.screenshot({path:`${out}/${scale}x-${side}-rest.jpg`,type:'jpeg',quality:92});
  for(const action of ['draw','purchase','summon','attack','shuffle']){
   await p.evaluate(a=>{window.replayPromise=atelier.replay(a)},action);
   if(action==='draw'){
    await p.waitForSelector('.native-draw-card[data-thickness]',{timeout:15000});const t=await p.locator('.native-draw-card').first().evaluate(e=>({w:parseFloat(e.style.width),thickness:Number(e.dataset.thickness)}));assert(Math.abs(t.thickness/t.w-.024*scale)<.001);rows.push({scale,side,action,...t});
   }else if(action==='purchase')await p.waitForSelector('[data-motion=arrival]',{timeout:15000});
   else if(action==='summon')await p.waitForSelector('.fx-field-ghost',{timeout:15000,state:'attached'});
   await p.waitForTimeout(action==='summon'?450:120);await p.screenshot({path:`${out}/${scale}x-${side}-${action}.jpg`,type:'jpeg',quality:91});
   await p.evaluate(()=>window.replayPromise);assert.equal(await p.locator('.native-draw-layer,.draw-stock-canvas,.fx-field-ghost').count(),0);console.log('PASS',scale,side,action);
  }
 }
 for(const scale of [1,3]){
  await p.goto(`${origin}/cosmetic-studio.html?inspect=1&stock=1&set=tidal&thickness=${scale}`);await p.waitForSelector('[data-ready=true]',{timeout:90000});await p.screenshot({path:`${out}/${scale}x-cross-section.jpg`,type:'jpeg',quality:95});
 }
 await p.goto(`${origin}/cosmetic-studio.html?set=tidal&thickness=3`);let f=await(await p.waitForSelector('#board')).contentFrame();await f.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 await p.locator('[data-thickness="1"]').click();await p.waitForTimeout(150);f=await(await p.waitForSelector('#board')).contentFrame();await f.waitForFunction(()=>window.atelier?.dimensions?.().scale===1);await f.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 await p.locator('[data-action=draw]').click();await p.waitForFunction(()=>document.getElementById('replay-status').textContent.includes('再生完了'),{timeout:15000});assert.equal(await p.locator('[data-thickness="3"]').isDisabled(),false);
 await p.locator('#stock-inspect').click();f=await(await p.waitForSelector('#board')).contentFrame();await f.waitForSelector('[data-ready=true]',{timeout:90000});assert.equal(await p.locator('#count').isDisabled(),false);await p.locator('#count').selectOption('1');await p.waitForTimeout(400);assert.equal(await f.evaluate(()=>atelier.state().count),1);
 await p.locator('#stock-inspect').click();f=await(await p.waitForSelector('#board')).contentFrame();await f.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 for(const [width,height]of [[1600,1000],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(500);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${out}/studio-${width}.jpg`,type:'jpeg',quality:90,fullPage:true});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,rows,errors},null,2));
}finally{await browser.close();if(errors.length)console.error(errors)}
