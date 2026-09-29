import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-09-29/playback',origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5279';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/duel-lab.html?polish');await page.waitForSelector('[data-scene-ready=true]');
 // The same production scene runs all motions, including independent flight
 // overlays and the cached board underneath. Keep normal wall-clock playback.
 for(const label of ['ドロー3枚','相手ドロー','デッキ再構成','マナ増加','相手マナ増加','場から虚無','手札から虚無']){
  const button=page.getByRole('button',{name:label,exact:true});await button.click();await page.waitForFunction(label=>[...document.querySelectorAll('[data-polish-controls] button')].find(b=>b.textContent===label)?.disabled===false,label);
  assert.equal(await page.locator('.rift-fold-canvas,.rift-silver-source,.native-draw-layer,.is-shuffling').count(),0,label+' cleanup');checks.push(label);
 }
 // Both sides animate together on the unchanged board, then settle to counts.
 await page.getByRole('button',{name:'マナ増加',exact:true}).click();await page.getByRole('button',{name:'相手マナ増加',exact:true}).click();await page.waitForTimeout(1900);
 for(const side of ['Me','Opp']){const state=await page.locator('#portrait'+side+' .pt-mana').evaluate(e=>({max:+e.dataset.maximum,total:+e.dataset.crystalsReady+(+e.dataset.crystalsSpent),forming:+e.dataset.formingCrystals}));assert.equal(state.max,state.total);assert.equal(state.forming,0);}checks.push('simultaneous mana counts');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 for(const label of ['ドロー3枚','デッキ再構成','場から虚無']){const button=page.getByRole('button',{name:label,exact:true});await button.click();await page.waitForFunction(label=>[...document.querySelectorAll('[data-polish-controls] button')].find(b=>b.textContent===label)?.disabled===false,label);checks.push('mobile '+label);}
 await page.screenshot({path:out+'/mobile.png',style:'[data-polish-controls]{visibility:hidden!important}'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'デッキ再構成',exact:true}).click();await page.waitForTimeout(350);assert.equal(await page.locator('.is-shuffling').count(),0);checks.push('reduced motion return');
 // Leaving a match removes both WebGL canvases and releases their contexts.
 const disposal=await page.evaluate(async()=>{const {mountDuelScene}=await import('/src/ui/duelScene.ts');const root=document.createElement('div');document.body.append(root);const dispose=mountDuelScene(root),canvas=root.querySelector('canvas'),gl=canvas.getContext('webgl2');dispose();root.remove();await new Promise(r=>setTimeout(r,30));return {connected:canvas.isConnected,lost:gl.isContextLost()};});assert.equal(disposal.connected,false);assert.equal(disposal.lost,true);checks.push('renderer context disposal');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks);
}finally{await context.close();await fs.rename(await page.video().path(),out+'/continuous.webm');await browser.close();}
