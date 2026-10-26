import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
// Delayed frame transport exercises readiness independently of the opening movie.
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5521';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({serviceWorkers:'block'});let release,requested;
 const gate=new Promise(resolve=>release=resolve),seen=new Promise(resolve=>requested=resolve);
 await page.route('**/__reward_readiness',route=>route.fulfill({contentType:'text/html',body:'<html><body><main id="host"></main></body></html>'}));
 await page.route('**/base-spell-print.webp',async route=>{requested();await gate;await route.continue();});
 await page.goto(origin+'/__reward_readiness');
 await page.evaluate(async()=>{const m=await import('/src/ui/gachaRewardStage.ts');const host=document.getElementById('host'),rewards=[{id:'STARTER_CHEST',owned:1,refund:0}];window.stopGallery=m.mountRewardGallery(host,rewards);});
 await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(new Error("frame request missing")),15000))]);await page.waitForTimeout(150);
 assert.equal(await page.locator('.reward-tile-art').getAttribute('data-ready'),'false');
 assert.equal(await page.locator('.reward-tile-art>.card').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 release();
 await page.waitForSelector('.reward-tile-art[data-ready="true"]');
 assert.equal(await page.locator('.reward-tile-art>.card').evaluate(el=>getComputedStyle(el).visibility),'visible');
 await page.evaluate(()=>{window.stopGallery();});assert.equal(await page.locator('.reward-gallery').count(),0);assert.equal(await page.locator('.reward-stage').count(),0);
 console.log('PASS delayed frame keeps the incomplete face hidden, then reveals and disposes the complete card');
}finally{await browser.close();}
