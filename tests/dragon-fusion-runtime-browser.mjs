import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import('/tmp/dragon-fusion-qa/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const checks=[],errors=[],warnings=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name)};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{errors.push(String(e));console.error('PAGE',String(e))});page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text())});
 await page.goto('http://127.0.0.1:5497/dragon-spiral-five.html?runtime',{timeout:120000});await page.waitForFunction(()=>window.fusionRuntime?.state.ready,null,{timeout:120000});
 for(const id of ['DRAGON_RIDER','ANTIQUE_DK'])for(const side of [0,1]){
  await page.evaluate(async({id,side})=>{await fusionRuntime.setup(id,side);window.playDone=false;fusionRuntime.play().then(()=>window.playDone=true)},{id,side});
  await page.waitForSelector('.dragon-fusion-summon',{state:'attached',timeout:60000});
  check(`${id}/${side}: single selected renderer`,await page.locator('.dragon-fusion-summon[data-variant="04"]').count()===1);
  check(`${id}/${side}: material cards removed`,await page.locator('.zone-mon .card[data-uid="dragon"],.zone-mon .card[data-uid="mate"]').count()===0);
  check(`${id}/${side}: no graveyard flight`,await page.locator('.fx-card-flight').count()===0);

  await page.waitForFunction(()=>window.playDone,null,{timeout:60000}).catch(async e=>{console.log(await page.evaluate(()=>({state:fusionRuntime.state,canvas:document.querySelector('.dragon-fusion-summon')?.dataset.time,body:document.body.innerText.slice(-600)})));throw e;});await page.waitForTimeout(100);
  console.log('COMPLETE',id,side);check(`${id}/${side}: cleanup`,await page.locator('.dragon-fusion-summon').count()===0);
  check(`${id}/${side}: one visible result`,await page.locator(`.zone-mon .card[data-card-id="${id}"]:visible`).count()===1);
 }
 for(const reason of ['skip','resize','reduced','auto']){
  await page.emulateMedia({reducedMotion:reason==='reduced'?'reduce':'no-preference'});
  await page.evaluate(async reason=>{await fusionRuntime.setup('DRAGON_RIDER',0,reason==='auto');window.playDone=false;fusionRuntime.play().then(()=>window.playDone=true)},reason);
  if(reason!=='reduced'){await page.waitForSelector('.dragon-fusion-summon',{state:'attached',timeout:60000});if(reason==='skip')await page.evaluate(()=>fusionRuntime.skip());if(reason==='resize')await page.setViewportSize({width:1100,height:800});}
  await page.waitForFunction(()=>window.playDone,null,{timeout:40000});await page.waitForTimeout(100);
  check(`${reason}: settled without residue`,await page.locator('.dragon-fusion-summon').count()===0&&await page.locator('.zone-mon .card[data-card-id="DRAGON_RIDER"]:visible').count()===1);
 }
 check('no browser errors',errors.length===0);check('no native fallback',!warnings.some(w=>w.includes('[dragon-fusion]')));
 await fs.writeFile('/tmp/dragon-fusion-runtime-qa.json',JSON.stringify({checks,errors,warnings},null,2));console.log(JSON.stringify({passed:checks.length,errors,warnings}));
}finally{await browser.close()}
