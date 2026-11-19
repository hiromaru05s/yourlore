import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import sharp from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=new URL('./qa/r10',import.meta.url).pathname;await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],checks=[];
try{
 for(const width of [1024,390]){
  const context=await browser.newContext({viewport:{width,height:600},recordVideo:undefined}),page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5298/cinematic-vfx-scene.html?controlled');await page.waitForFunction(()=>window.vfx?.info().ready);
  for(const side of[0,1])for(const count of[1,2,4]){
   await page.evaluate(async o=>{await window.vfx.set({...o,kind:'draw',loop:false,speed:1});window.vfx.seek(10)}, {side,drawCount:count});
   const baseline=await page.evaluate(async side=>{const {handCardMatrix}=await import('/src/ui/handGeometry.ts');const cards=[...document.querySelectorAll(`${side?'#oppHand':'#hand'} > .card,${side?'#oppHand':'#hand'} > .card--back`)];window.__prints=cards.map(n=>[...n.children]);window.__sources=cards.flatMap(n=>[...n.querySelectorAll('img,canvas')].map(c=>({n:c,src:c.src,w:c.width,h:c.height})));return {quads:cards.map(n=>{const m=handCardMatrix(n),cs=getComputedStyle(n),w=parseFloat(cs.width),h=parseFloat(cs.height);return [[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{const p=m.transformPoint(new DOMPoint(x,y));return [p.x/p.w,p.y/p.w]})}),cards:cards.length,hand:document.querySelector(side?'#oppHand':'#hand').getBoundingClientRect().toJSON()};},side);
   assert.equal(baseline.cards,3+count);
   await page.evaluate(()=>window.vfx.seek(.8));
   const mid=await page.evaluate(()=>({nativePrint:window.__prints.every(layers=>layers.every(n=>n.isConnected&&n.parentElement.matches('.card,.card--back'))),sourcesStable:window.__sources.every(o=>o.n.src===o.src&&o.n.width===o.w&&o.n.height===o.h),flights:document.querySelectorAll('[data-study-draw][data-incoming="true"]').length,cardClip:[...document.querySelectorAll('[data-study-draw].card')].map(n=>getComputedStyle(n).overflow),opponentFaces:document.querySelectorAll('[data-study-draw][data-incoming="true"] .card-art').length}));
   assert.ok(mid.nativePrint);assert.ok(mid.sourcesStable);assert.equal(mid.flights,count);assert.ok(mid.cardClip.every(v=>v==='visible'));if(side)assert.equal(mid.opponentFaces,0);
   if(count===4)await page.screenshot({path:`${dir}/${width}-${side}-flight.png`});
   const landing=(1.38+(count-1)*.24)/1.15;
   await page.evaluate(t=>{window.vfx.seek(t);for(const a of document.getAnimations()){a.pause();a.currentTime=1000;}},landing-.00001);
   const beforeRects=await page.evaluate(side=>[...document.querySelectorAll(`${side?'#oppHand':'#hand'} > .card,${side?'#oppHand':'#hand'} > .card--back`)].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),side);const before=await page.screenshot();
   await page.evaluate(t=>{window.vfx.seek(t);for(const a of document.getAnimations()){a.pause();a.currentTime=1000;}},landing+.00001);
   const afterRects=await page.evaluate(side=>[...document.querySelectorAll(`${side?'#oppHand':'#hand'} > .card,${side?'#oppHand':'#hand'} > .card--back`)].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),side);const geometryDelta=Math.max(...beforeRects.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-afterRects[i][j]))));assert.ok(geometryDelta<.05,`geometry ${geometryDelta}`);const after=await page.screenshot();
   const r=baseline.hand,left=Math.max(0,Math.floor(r.x-50)),top=Math.max(0,Math.floor(r.y-60)),region={left,top,width:Math.min(width-left,Math.ceil(r.width+100)),height:Math.min(600-top,Math.ceil(r.height+120))};
   const a=await sharp(before).extract(region).removeAlpha().raw().toBuffer(),b=await sharp(after).extract(region).removeAlpha().raw().toBuffer();let changed=0,total=0,channels=0;
   const inside=(x,y,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))hit=!hit;}return hit;};
   for(let i=0;i<a.length;i++){const pixel=Math.floor(i/3),x=left+pixel%region.width+.5,y=top+Math.floor(pixel/region.width)+.5;if(!baseline.quads.some(q=>inside(x,y,q)))continue;channels++;const d=Math.abs(a[i]-b[i]);if(d>20)changed++;total+=d;}
   const continuity={changedChannels:changed,channelFraction:changed/channels,meanDelta:total/channels,geometryDelta};
   if(count===4){await fs.writeFile(`${dir}/${width}-${side}-before.png`,before);await fs.writeFile(`${dir}/${width}-${side}-after.png`,after);}
   const restored=await page.evaluate(()=>({prints:window.__prints.every(layers=>layers.every(n=>n.isConnected&&!n.closest('.study-draw-layer'))),layers:document.querySelectorAll('.study-draw-layer').length}));assert.ok(restored.prints);assert.equal(restored.layers,0);
   assert.ok(continuity.channelFraction<.005,`handoff ${width}/${side}/${count}: ${continuity.channelFraction}`);checks.push({width,side,count,mid,continuity});console.log(width,side,count,continuity.channelFraction);
  }
  await page.evaluate(async()=>{await window.vfx.set({kind:'draw',side:0,drawCount:4,loop:false});window.vfx.replay()});await page.waitForFunction(()=>!window.vfx.info().playing);assert.equal(await page.locator('.study-draw-layer').count(),0);
  await page.evaluate(async()=>{window.vfx.seek(.7);await window.vfx.set({kind:'summon'});window.vfx.seek(2.085)});assert.equal(await page.locator('.study-draw-layer').count(),0);
  await page.evaluate(async()=>{await window.vfx.set({kind:'draw',drawCount:2});window.vfx.seek(.7);window.vfx.dispose()});assert.equal(await page.locator('.study-draw-layer').count(),0);
  await context.close();
 }
 assert.equal(errors.length,0);await fs.writeFile(dir+'/report.json',JSON.stringify({errors,checks},null,2));console.log(JSON.stringify({errors,checks},null,2));
}finally{await browser.close()}
