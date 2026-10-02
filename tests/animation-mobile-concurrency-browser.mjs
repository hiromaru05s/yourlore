import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/performance/2026-10-02/playback';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out+'/mobile-video',size:{width:390,height:844}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.goto((process.env.LORE_MIMIC_URL||'http://127.0.0.1:5396')+'/src/dev/mimic-runtime/index.html');await page.waitForFunction(()=>window.mimicQA?.ready);
 for(const side of [0,1]){
  const play=page.evaluate(side=>mimicQA.play('MIMIC_KING2',side),side);await page.waitForFunction(()=>Number(document.querySelector('.mimic-summon-rig')?.dataset.open)>.7);await page.screenshot({path:`${out}/mobile-normal-${side}.png`});await play;assert.equal(await page.locator('.mimic-summon-rig').count(),0);
 }
 const simultaneous=page.evaluate(async()=>{
  const {playMimic}=await import('/src/ui/mimic/runtime.ts');const sources=[document.querySelector('#meRow .zone-mon .card'),document.querySelector('#oppRow .zone-mon .card')],visibility=sources.map(n=>n.style.visibility);
  const results=await Promise.all(sources.map((n,i)=>playMimic(n,n,i?'MIMIC_KING2':'AWAKENED_MIMIC',new AbortController().signal)));
  return{results,restored:sources.every((n,i)=>n.style.visibility===visibility[i]),remaining:document.querySelectorAll('.mimic-summon-rig').length};
 });
 await page.waitForFunction(()=>document.querySelectorAll('.mimic-summon-rig').length===2);await page.screenshot({path:out+'/mobile-simultaneous.png'});const result=await simultaneous;assert.deepEqual(result,{results:[true,true],restored:true,remaining:0});assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/mobile-report.json',JSON.stringify({normalBothSides:true,simultaneous:result,errors},null,2));console.log('PASS normal mobile both sides and simultaneous reveals');
}finally{await context.close();await browser.close();}
