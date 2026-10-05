// Exercises the served production bundle through its normal BOT UI. Only the
// account API is a fixture; no game state, JS bundle or animation is replaced.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_URL||'https://test.yourlore.xyz';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-discard-release';
const broken=process.env.LORE_EXPECT_BROKEN==='1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'hand-discard-release-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0};
await apiFixture(page,r=>{const path=new URL(r.url).pathname;return path==='/api/auth/me'?{user}:path==='/api/geo'?{country:'JP'}:path==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:path==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
await page.addInitScript(()=>{
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 // Repeatable first player/BOT choices, without changing engine rules or state.
 let seed=47;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
});
let report;
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();await page.locator('#diffStart').click();
 await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});
 await page.evaluate(()=>{
  window.events=[];window.record=(type,uid)=>events.push({type,uid,t:performance.now()});
  new MutationObserver(ms=>{for(const m of ms){
   if(m.type==='attributes'&&m.target.id==='pile-oppDisc'&&m.target.classList.contains('is-shuffling')!==!!m.oldValue?.includes('is-shuffling'))record(m.target.classList.contains('is-shuffling')?'shuffle-start':'shuffle-end');
   for(const n of m.addedNodes)if(n instanceof HTMLElement){if(n.classList.contains('discard-flight'))record('flight-start',n.dataset.uid);if(n.dataset.discardFlight)record('replay',n.dataset.discardFlight);if(n.classList.contains('native-draw-layer'))record('draw-start');}
   for(const n of m.removedNodes)if(n instanceof HTMLElement&&n.classList.contains('discard-flight'))record('flight-end',n.dataset.uid);
  }}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
 });
 const picks=[];let observed=false;
 for(let turn=0;turn<10&&!observed;turn++){
  await page.waitForFunction(()=>document.querySelector('#endBtn')?.disabled===false&&!document.querySelector('.fx-playing,.duel-opening,.native-draw-layer'));
  await page.waitForTimeout(600);await page.locator('#endBtn').click();
  await page.waitForFunction(()=>document.querySelector('.choosing-discard')||document.querySelector('[data-reading-turn=opponent]'));
  if(!await page.locator('.choosing-discard').count())continue;
  const first=picks.length;
  while(await page.locator('.discard-draggable').count()){
   const n=await page.locator('#hand > .card').count(),c=page.locator('#hand > .card').nth(Math.floor(n/2)),uid=await c.getAttribute('data-uid'),from=await c.boundingBox(),to=await page.locator('#pile-myDisc').boundingBox();
   await page.mouse.move(from.x+from.width/2,from.y+from.height*.35);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:8});
   const started=await page.evaluate(()=>performance.now());await page.mouse.up();
   await page.waitForTimeout(80);
   const during=await page.evaluate(()=>({count:document.querySelectorAll('#hand > .card').length,flight:!!document.querySelector('.discard-flight')}));
   picks.push({uid,n,started,during});
   await page.waitForFunction(uid=>!document.querySelector('.discard-flight')&&![...document.querySelectorAll('#hand > .card')].some(c=>c.dataset.uid===uid)&&!document.querySelector('.fx-playing'),uid);
   await page.waitForTimeout(100);
  }
  const events=await page.evaluate(()=>events),selected=new Set(picks.slice(first).map(p=>p.uid));
  const lastEnd=events.filter(e=>e.type==='flight-end'&&selected.has(e.uid)).at(-1);
  const shuffle=events.find(e=>e.type==='shuffle-start'&&e.t>picks[first].started),shuffled=shuffle&&events.find(e=>e.type==='shuffle-end'&&e.t>shuffle.t),draw=lastEnd&&events.find(e=>e.type==='draw-start'&&e.t>lastEnd.t);
  observed=!!(shuffle&&shuffled&&draw);
  console.log(JSON.stringify({turn,picks:picks.length,observed,shuffle,shuffled,draw}));
  if(observed){
   const duplicates=events.filter(e=>e.type==='replay'&&picks.some(p=>p.uid===e.uid));
   report={origin,broken,picks,events,duplicates,errors,boundary:'Unmodified deployed bundles and normal BOT actions; API account fixture, not authenticated two-player play.'};
   await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
   if(broken){assert(duplicates.length>0);assert(picks.some(p=>p.during.count===p.n));}
   else{assert.deepEqual(duplicates,[]);assert(picks.every(p=>p.during.count===p.n-1&&p.during.flight));assert(shuffle.t>=lastEnd.t);assert(draw.t>=shuffled.t);assert.deepEqual(errors,[]);}
  }
 }
 assert(observed,'must observe a final overflow discard followed by opponent reshuffle and draw');
 await page.screenshot({path:out+'/complete.png'});console.log(broken?'REPRODUCED deployed old discard gap and duplicate':'PASS served bundle discard + alignment → shuffle → draw');
}catch(error){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,pages:await page.evaluate(()=>window.events||[])},null,2));await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();}
