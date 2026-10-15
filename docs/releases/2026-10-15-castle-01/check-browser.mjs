import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import sharp from 'sharp';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out='docs/releases/2026-10-15-castle-01/qa';const b=await chromium.launch({channel:'chrome',headless:true});
const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});const errors=[],checks=[];p.on('pageerror',e=>errors.push(String(e)));
try{
await p.goto('http://127.0.0.1:5474/castle-four.html?board',{timeout:120000});await p.waitForFunction(()=>window.castleBoard?.state.ready,null,{timeout:120000});
await p.addStyleTag({content:'*,*::before,*::after{animation-play-state:paused!important;transition:none!important}'});
await p.evaluate(async()=>{
 window.cardData=(await import('/src/shared/cards.ts')).DB.CASTLE;window.prodMonster=await import('/src/ui/monster/runtime.ts');window.prodAnim=await import('/src/ui/anim.ts');window.prodCastle=await import('/src/ui/castleSummon/runtime.ts');
 await import('/src/ui/castleSummon/renderer.ts');
 window.realFrame=requestAnimationFrame;window.realCancel=cancelAnimationFrame;window.realNow=performance.now.bind(performance);
 window.freeze=()=>{window.ms=0;window.q=new Map();window.seq=0;performance.now=()=>window.ms;window.requestAnimationFrame=f=>{window.q.set(++window.seq,f);return window.seq};window.cancelAnimationFrame=n=>window.q.delete(n)};
 window.step=t=>{window.ms=t;const q=[...window.q.values()];window.q.clear();q.forEach(f=>f(t))};
 window.unfreeze=()=>{window.requestAnimationFrame=window.realFrame;window.cancelAnimationFrame=window.realCancel;performance.now=window.realNow};
});
for(const width of [1280,390]){await p.setViewportSize({width,height:800});for(const side of [0,1]){
 await p.evaluate(async side=>{await window.castleBoard.configure({v:0,side,dark:false});window.castleBoard.seek(2600)},side);await p.waitForTimeout(500);
 const card=p.locator(`.zone-mon .card[data-uid^="castle-target-${side}-"]`).first();
 await p.evaluate(()=>{window.native=document.querySelector('.zone-mon .card[data-card-id="CASTLE"]');window.freeze();window.done=window.prodMonster.playMonster(window.native,'summon')});
 await p.waitForSelector('.castle-summon');
 assert.equal(await p.evaluate(()=>document.querySelectorAll('.castle-summon').length),1);
 await p.evaluate(()=>window.step(1100));await p.screenshot({path:`${out}/${width}-${side}-active.png`});
 const box=await card.boundingBox(),clip={x:box.x-3,y:box.y-3,width:box.width+6,height:box.height+6},shots=[];
 for(const t of [2450,2599,2600]){await p.evaluate(t=>window.step(t),t);await p.waitForTimeout(100);assert.deepEqual(await card.boundingBox(),box);shots.push(await p.screenshot({clip,path:`${out}/${width}-${side}-${t}.png`}))}
 const pixels=await Promise.all(shots.map(s=>sharp(s).raw().toBuffer()));let maxDelta=0;for(let k=1;k<pixels.length;k++)for(let i=0;i<pixels[k].length;i++)maxDelta=Math.max(maxDelta,Math.abs(pixels[k][i]-pixels[0][i]));assert.ok(maxDelta<=1,`${width}-${side} raster delta ${maxDelta}`);
 assert.equal(await p.evaluate(async()=>await window.done),true);assert.equal(await p.evaluate(()=>window.native===document.querySelector('.zone-mon .card[data-card-id="CASTLE"]')),true);assert.equal(await p.locator('.castle-summon').count(),0);
 checks.push({width,side,route:'playMonster',maxChannelDelta:maxDelta,sameNativeNode:true});await p.evaluate(()=>window.unfreeze());
}}
await p.setViewportSize({width:1280,height:800});
for(const route of ['hand','generated']){
 await p.evaluate(async route=>{await window.castleBoard.configure({v:0,side:0,dark:false});if(route==='hand')window.castleBoard.seek(2600);window.freeze();window.done=route==='hand'?window.prodAnim.summonFromHand({...window.cardData,id:'CASTLE',uid:'castle-target-0-0'},'castle-target-0-0','me'):window.prodAnim.ghostSummon({...window.cardData,id:'CASTLE',uid:'castle-generated'},'me',1)},route);
 await p.waitForSelector('.castle-summon');await p.evaluate(()=>window.step(1600));await p.screenshot({path:`${out}/${route}-active.png`});
 const uid=route==='hand'?'castle-target-0-0':'castle-generated';const card=p.locator(`.zone-mon .card[data-uid="${uid}"]`);assert.equal(await card.count(),1);const box=await card.boundingBox();
 await p.evaluate(()=>window.step(3040));await p.evaluate(async()=>{await window.done;window.unfreeze()});assert.deepEqual(await card.boundingBox(),box);assert.equal(await p.locator('.castle-summon').count(),0);assert.equal(await p.locator('.fx-field-ghost').count(),0);
 checks.push({route,nativeCompletion:true,noGhost:true});
}
assert.equal(errors.length,0);await fs.writeFile(out+'/browser.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await b.close()}
