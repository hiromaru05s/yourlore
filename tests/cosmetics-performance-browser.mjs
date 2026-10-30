import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-cosmetics-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5296',label=process.argv[2]||'after',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-cosmetics-perf';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const frames=['frame:mirror-silver','frame:flowing-gold','frame:obsidian-ember','frame:nacre-prism','frame:verdigris-runes'];
const effects=['effect:crystal-facets','effect:stardust-foil','effect:prism-veil'];
const user={id:'cosmetics-perf',display:'シーカー',needsUsername:false,avatar:'SEEKER_BLUE',credits:1000000,wins:0,losses:0,frames,effects,decks:null};
await apiFixture(page,r=>{const p=new URL(r.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',tier:'gold',mmr:1320}};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quests:[],day:'2026-10-29',revision:0,rerollsLeft:3},bot:{},online:0,ranked:0};
 if(p==='/api/gifts')return {items:[],now:Date.now(),pendingCount:0,pendingAmount:0,unreadCount:0};
 if(p==='/api/rewards/medals')return {entries:[]};if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/collection')return {credits:user.credits,starterCards:{},effects,cosmetics:frames};
 if(p==='/api/deck'){user.decks=r.body.decks;return {ok:true,decks:user.decks,deck:user.decks.list[user.decks.sel].cards};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
await page.addInitScript(()=>{
 localStorage.setItem('lore_lang','ja');
 window.perfCounts={draws:0,readPixels:0,resizes:0};window.longTasks=[];
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.longTasks.push(e.duration);}).observe({type:'longtask',buffered:true});
 const read=CanvasRenderingContext2D.prototype.getImageData;
 CanvasRenderingContext2D.prototype.getImageData=function(...a){window.perfCounts.readPixels+=a[2]*a[3];return read.apply(this,a);};
 const draw=WebGLRenderingContext.prototype.drawArrays;
 WebGLRenderingContext.prototype.drawArrays=function(...a){window.perfCounts.draws++;return draw.apply(this,a);};
 for(const key of ['width','height']){const desc=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);Object.defineProperty(HTMLCanvasElement.prototype,key,{...desc,set(v){window.perfCounts.resizes++;return desc.set.call(this,v);}});}
});
const results=[];
async function sample(name,action){
 await page.evaluate(()=>{window.perfCounts={draws:0,readPixels:0,resizes:0};window.longTasks=[];window.frameTimes=[];window.collectFrames=true;let last=performance.now();const tick=t=>{window.frameTimes.push(t-last);last=t;if(window.collectFrames)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 const start=Date.now();if(action)await action();await page.waitForTimeout(2000);
 const data=await page.evaluate(()=>{window.collectFrames=false;const f=window.frameTimes.sort((a,b)=>a-b);return {...window.perfCounts,longTasks:window.longTasks,p50:f[Math.floor(f.length*.5)],p95:f[Math.floor(f.length*.95)],max:f.at(-1),canvases:document.querySelectorAll('canvas').length,materials:document.querySelectorAll('.card-frame-material').length};});
 results.push({name,elapsed:Date.now()-start,...data});console.log(name,JSON.stringify(data));
}
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home');await page.waitForSelector('.lounge-entry-overlay',{state:'detached'});await page.locator('[data-nav=deck]').click();
 await sample('open-appearance',()=>page.locator('#appearanceTab').click());
 await page.evaluate(()=>window.originalFrameTile=document.querySelector('.deck-frame-preview .card'));
 for(const id of frames){
  await sample(id,()=>page.locator(`[data-cosmetic-kind=frame][data-cosmetic-id="${id}"]`).click());
  if(label!=='before')assert(await page.evaluate(()=>window.originalFrameTile===document.querySelector('.deck-frame-preview .card')),'selection must retain the frame catalog');
 }
 for(const id of effects)await sample(id,()=>page.locator(`[data-cosmetic-kind=effect][data-cosmetic-id="${id}"]`).click());
 await page.screenshot({path:out+'/'+label+'-appearance.png'});
 await sample('edit-equipped',()=>page.locator('#editTab').click());
 await page.screenshot({path:out+'/'+label+'-deck.png'});
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg').textContent.includes('保存完了'));
 await sample('return-home',()=>page.locator('[data-nav=home]').click());
 await page.waitForTimeout(500);assert.equal(await page.locator('.card-frame-material,.card-effect-surface').count(),0);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/'+label+'.json',JSON.stringify({origin,results,errors},null,2));
}finally{await browser.close();}
