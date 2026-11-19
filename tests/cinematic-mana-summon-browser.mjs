import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out='docs/ui-rework/2026-11-19-normal-summon-two/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1100,height:680}});
page.setDefaultTimeout(90000);
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5298/cinematic-vfx-scene.html?controlled');
 await page.waitForFunction(()=>window.vfx?.info().ready);
 for(const width of [1100,390])for(const variant of ['resonance','weave'])for(const side of [0,1]){
  await page.setViewportSize({width,height:680});
  await page.waitForTimeout(150);
  await page.evaluate(async ({variant,side})=>{
   await vfx.set({kind:'summon',summonVersion:variant,mode:'board',side,loop:false});
   vfx.seek(3.2);
   const n=document.querySelector(`[data-uid="field-${side}-0"]`);
   window.before={node:n,parent:n.parentElement,children:[...n.children],style:n.style.cssText,classes:n.className,frame:n.querySelector('.card-frame').style.cssText,art:n.querySelector('.card-art').style.cssText,images:[...n.querySelectorAll('img')].map(i=>i.currentSrc),box:n.getBoundingClientRect().toJSON()};
  },{variant,side});
  for(const time of [.6,1.22,1.66,1.779,1.78,1.85,2.4,3.2]){
   await page.evaluate(t=>vfx.seek(t),time);
   const state=await page.evaluate(()=>{
    const n=before.node,cs=getComputedStyle(n);
    return {same:[...n.children].every((child,i)=>child===before.children[i]),body:n.parentElement===document.body,parent:n.parentElement===before.parent,overflow:cs.overflow,z:Number(cs.zIndex),opacity:Number(cs.opacity),box:n.getBoundingClientRect().toJSON(),frame:n.querySelector('.card-frame').style.cssText===before.frame,art:n.querySelector('.card-art').style.cssText===before.art,images:[...n.querySelectorAll('img')].map(i=>i.currentSrc),count:document.querySelectorAll(`[data-uid="${n.dataset.uid}"]`).length};
   });
   assert(state.same&&state.art);assert.deepEqual(state.images,await page.evaluate(()=>before.images));assert.equal(state.count,1);
   if(time<1.78){assert(state.body);assert(state.frame);assert.equal(state.overflow,'visible');}
   else assert(state.parent);
   if(time===.6){assert(Math.abs(state.box.x+state.box.width/2-width/2)<1);assert(Math.abs(state.box.y+state.box.height/2-340)<1);assert(state.box.width>90);}
   if(time===1.66){assert.equal(state.z,135);assert.equal(await page.locator('#material').evaluate(n=>getComputedStyle(n).zIndex),'136');}
   if(time===1.779){const baseline=await page.evaluate(()=>before.box);assert(Math.abs(state.box.x-baseline.x)<.15,JSON.stringify({width,variant,side,state,baseline}));assert(Math.abs(state.box.y-baseline.y)<.15);assert(Math.abs(state.box.width-baseline.width)<.15);assert(state.opacity>.999);}
   if(time>=2.4){assert(state.frame);assert(await page.evaluate(()=>before.node.style.cssText===before.style&&before.node.className===before.classes));}
   if(width===390&&(time===1.22||time===1.85))await page.screenshot({path:`${out}/${width}-${variant}-${side}-${time}.png`});
  }
  checks.push({width,variant,side,nativeIdentity:true,landingContinuity:true,restoration:true});
 }
 await page.setViewportSize({width:1100,height:680});
 for(const variant of ['resonance','weave'])for(const mode of ['white','focus']){
  await page.evaluate(async ({variant,mode})=>{await vfx.set({summonVersion:variant,mode,side:0});vfx.seek(1.22);},{variant,mode});
  const visible=await page.locator('[data-uid="field-0-0"]').evaluate(n=>getComputedStyle(n).visibility);
  assert.equal(visible,'visible');await page.screenshot({path:`${out}/${variant}-${mode}.png`});
 }
 const gpu=[];
 for(let i=0;i<4;i++){
  await page.evaluate(async i=>{await vfx.set({summonVersion:i%2?'weave':'resonance',mode:'board',side:i%2});vfx.seek(1.22);},i);
  gpu.push(await page.evaluate(()=>vfx.info().gpu));
 }
 assert.deepEqual(gpu[0],gpu[3]);checks.push({reprepareGpu:gpu});
 for(const variant of ['resonance','weave']){
  await page.evaluate(async variant=>{
   await vfx.set({summonVersion:variant,mode:'board',side:0,speed:1,loop:false});
   window.frameTimes=[];window.previousFrame=0;window.keepFrames=true;
   const sample=t=>{if(previousFrame)frameTimes.push(t-previousFrame);previousFrame=t;if(keepFrames)window.sampleId=requestAnimationFrame(sample);};
   window.sampleId=requestAnimationFrame(sample);vfx.replay();
  },variant);
  await page.waitForFunction(()=>vfx.info().time===3.2&&!vfx.info().playing);
  const timing=await page.evaluate(()=>{keepFrames=false;cancelAnimationFrame(sampleId);const a=frameTimes.slice(2).sort((a,b)=>a-b);return{frames:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]};});
  checks.push({variant,livePlayback:timing});
 }
 await page.evaluate(async()=>{vfx.seek(1.3);await vfx.set({kind:'draw'});vfx.seek(3.2);});
 assert.equal(await page.locator('body > .card[data-uid^="field-"]').count(),0);
 checks.push({interruptionToDraw:true});
 await page.evaluate(async()=>{await vfx.set({kind:'summon',summonVersion:'weave'});vfx.seek(1.3);vfx.dispose();});
 assert.equal(await page.locator('body > .card[data-uid^="field-"]').count(),0);
 checks.push({disposeDuringFlight:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5298/cinematic-vfx-scene.html');
 await page.waitForFunction(()=>window.vfx?.info().ready);
 assert.equal(await page.evaluate(()=>vfx.info().playing),false);
 checks.push({reducedMotionAutoplayOff:true});
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({errors,checks,scope:'Local adopted-board fixture; no live event queue, PvP or visual approval asserted.'},null,2));
 console.log(JSON.stringify({errors,checks},null,2));
}finally{await browser.close();}
