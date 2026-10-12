import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_PATH||'playwright');const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1000,height:650}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5268/elemental-seven.html?stage=1&effect=meteor');await page.waitForFunction(()=>window.elementStage?.ready);
 await page.evaluate(()=>{elementStage.play();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await page.evaluate(()=>elementStage.playing),false);await page.evaluate(()=>delete document.hidden);
 await page.evaluate(()=>{elementStage.seek(2150);elementStage.fx.fire.canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext()});await page.waitForTimeout(120);await page.evaluate(()=>elementStage.seek(2300));assert.equal(await page.evaluate(()=>elementStage.status().renderer),'fallback-2d');await page.screenshot({path:new URL('./qa/fallback.png',import.meta.url).pathname});
 await page.evaluate(()=>{elementStage.dispose();elementStage.dispose()});assert.equal(await page.locator('.element-overlay,.element-surface').count(),0);assert.equal(await page.evaluate(()=>elementStage.playing),false);
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('./qa/lifecycle.json',import.meta.url),JSON.stringify({errors,checks:['hidden document stops clock','GPU context loss uses explicit 2D fallback','dispose clears all local layers and stops animation','repeat disposal is safe']},null,2));console.log('PASS lifecycle');
}finally{await browser.close()}
