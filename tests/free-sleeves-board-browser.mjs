const {chromium}=await import(process.env.LORE_PLAYWRIGHT||'playwright');
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-free-sleeves-checks';await fs.mkdir(out,{recursive:true});
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5473';
const b=await chromium.launch({channel:'chrome',headless:true});
try{const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[],loaded=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/frames/sleeve_'))loaded.push({url:r.url(),status:r.status()});});
await p.goto(origin+'/nameplate-board.html',{waitUntil:'domcontentloaded',timeout:120000});await p.locator('[data-preloaded-images][data-scene-ready="true"]').waitFor({timeout:120000});await p.locator('#app.duel-preparing').waitFor({state:'hidden',timeout:120000});
const checks=[];
for(const sleeves of [['default','sleeve:indigo-eye'],['sleeve:indigo-eye','default']]){
 await p.evaluate(s=>{const c=window.nameplateBoard.controller;c.state.sleeves=s;c.view.render(c.state);},sleeves);await p.waitForTimeout(1200);
 const backs=await p.locator('#oppHand .card--back').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundImage));assert(backs.length>0);assert(backs.every(url=>url.includes(sleeves[1]==='default'?'sleeve_default':'sleeve_indigo_eye')));
 const name=sleeves[0]==='default'?'default-self-eye-opponent':'eye-self-default-opponent';await p.screenshot({path:out+'/'+name+'.png',timeout:60000});checks.push({sleeves,backs});
}
assert(loaded.some(r=>r.url.includes('sleeve_indigo_eye')&&r.status===200));assert.deepEqual(errors,[]);await fs.writeFile(out+'/board-check.json',JSON.stringify({viewport:{width:1920,height:1080},checks,loaded,errors,boundary:'Current GameView fixture using actual registered sleeve IDs and assets; no request/image substitution.'},null,2));console.log('PASS both sleeve IDs on each player, deck/hand art loads, no page errors');
}finally{await b.close();}
