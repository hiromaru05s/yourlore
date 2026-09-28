import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const out='docs/ui-rework/2026-09-29-quest-fold/qa/';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});p.setDefaultTimeout(90000);
const errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5265/quest-play-lab.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.questPlay);await p.waitForTimeout(1000);
 await p.clock.install({time:new Date('2026-01-01T00:00:00Z')});await p.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
 const start=async(side,id,occupied=0)=>{await p.evaluate(({side,id,occupied})=>questPlay.reset(side,id,occupied),{side,id,occupied});await p.clock.runFor(50);await p.evaluate(()=>questPlay.play());await p.waitForSelector('.cast-reveal',{state:'attached'});await p.clock.runFor(700);await p.waitForSelector('.quest-fold-canvas',{state:'attached'});};
 const end=async(side)=>{await p.clock.runFor(3200);await p.waitForFunction(()=>!document.querySelector('.quest-fold-host'));assert.equal(await p.locator('.quest-fold-canvas,.fx-field-ghost').count(),0);assert.equal(await p.locator(`${side===0?'#meRow':'#oppRow'} .buff-icon--quest`).count(),1);};
 for(const [side,id,n] of [[0,'Q_RIFT',0],[1,'Q_WINTER',3],[0,'Q_MANA',8]]){
  await start(side,id,n);const uid=await p.locator('.quest-fold-canvas').getAttribute('data-card-uid');assert.match(uid,/played-quest-/);
  await p.clock.runFor(1150);await p.screenshot({path:out+`peak-${side}-${id}.png`});
  await p.clock.runFor(1700);
  const landed=await p.locator('.quest-fold-host .buff-icon').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
  await end(side);
  const native=await p.locator(`${side===0?'#meRow':'#oppRow'} .buff-icon--quest`).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,uid:e.dataset.uid};});
  assert.equal(native.uid,uid);for(const key of ['x','y','width','height'])assert.ok(Math.abs(native[key]-landed[key])<2,`${key}: ${native[key]} / ${landed[key]}`);
  await p.screenshot({path:out+`rest-${side}-${id}.png`});checks.push(`Actual reducer/controller play ${side} ${id}, occupied ${n}; UID and projected landing within 2 px, cleanup`);console.log(checks.at(-1));
 }
 await start(0,'Q_RIFT');await p.clock.runFor(900);await p.evaluate(()=>questPlay.skip());await end(0);checks.push('Midflight fast-forward restores native tile and removes resources');
 await start(1,'Q_RIFT');await p.setViewportSize({width:1200,height:900});await end(1);checks.push('Viewport change cancels safely');
 await p.setViewportSize({width:390,height:844});await start(1,'Q_BRAND');await p.clock.runFor(1150);await p.screenshot({path:out+'mobile-peak.png'});await end(1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390 px opponent play, no overflow');
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>questPlay.reset(0,'Q_TRIBE'));await p.clock.runFor(50);await p.evaluate(()=>questPlay.play());await p.waitForSelector('.cast-reveal',{state:'attached'});await p.clock.runFor(1000);await p.waitForFunction(()=>document.querySelector('#meRow .buff-icon--quest'));assert.equal(await p.locator('.quest-fold-canvas').count(),0);checks.push('Reduced motion places native quest without folding');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});
 await p.evaluate(()=>questPlay.reset(0,'Q_RIFT'));await p.clock.runFor(50);await p.evaluate(()=>questPlay.play());await p.waitForSelector('.cast-reveal',{state:'attached'});await p.clock.runFor(700);await p.waitForFunction(()=>document.querySelector('#meRow .buff-icon--quest'));await p.clock.runFor(100);assert.equal(await p.locator('.quest-fold-canvas,.quest-fold-host').count(),0);checks.push('WebGL unavailable: native tile and cleanup');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'report.json',JSON.stringify({status:'passed',checks,errors,clock:'Controlled browser clock; production renderer, actual reducer/controller and GameView'},null,2));console.log('PASS',checks.length);
}catch(e){await fs.writeFile(out+'report.json',JSON.stringify({status:'failed',checks,errors,error:String(e)},null,2));throw e;}finally{await b.close();}
