import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5318';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-home-ready-fade';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={origin,api:'fixture account and quests; real current artwork',cases:[]};
try{
 for(const [width,height,reduced] of [[1280,720,false],[390,844,false],[390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out+'/video',size:{width,height}}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));page.setDefaultTimeout(120000);
  await apiFixture(page,async r=>{
   const name=new URL(r.url).pathname;
   if(name==='/api/auth/me')return {user:{id:'fade-test-user',display:'SEEKER',email:'preview@example.test',credits:1200,avatar:'SEEKER_BLUE',wins:47,losses:19}};
   if(name==='/api/rewards/tutorial')return {offered:true,keys:[],credits:1200};
   if(name==='/api/rewards/progression')return {credits:1200,ranked:0,online:0,bot:{},resetsAt:Date.now()+86400000,dailies:['rift','buyMonster','heal'].map((kind,i)=>({day:'2026-10-28',slot:i,revision:0,rerollsLeft:3,progress:0,claimed:false,quest:{kind,target:[30,20,40][i],reward:300}}))};
   if(name==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
   if(name==='/api/gifts')return {items:[],unreadCount:0};
   return {ok:true,country:'JP',entries:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};
  });
  await page.addInitScript(()=>{
   localStorage.setItem('lore_lang','ja');window.__fadeSamples=[];window.__repaints=0;
   const sample=()=>{
    const home=document.querySelector('.lounge-home'),cover=document.querySelector('.screen-loader'),stage=document.querySelector('.home-entrance-stage');
    if(home&&cover){
     const t=stage?Number(stage.dataset.elapsed):null;
     if(window.__repaints<2&&(!stage||t>1000)){document.dispatchEvent(new Event('lore:user'));window.__repaints++;}
     const opacity=el=>{let result=1;for(let p=el;p;p=p.parentElement)result*=Number(getComputedStyle(p).opacity);return result;};
     window.__fadeSamples.push({t,values:['.lounge-user','.home-sound','.home-daily-reward','.lounge-rail','.lounge-home-main','.home-companion','.lounge-atmosphere'].map(s=>{const el=home.querySelector(s);return {s,opacity:el?opacity(el):null};})});
    }
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   if(!reduced){
    await page.waitForFunction(()=>Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed)>1200);
    await page.screenshot({path:`${out}/${width}-before-fade.png`});
    await page.waitForFunction(()=>Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed)>3000);
    await page.screenshot({path:`${out}/${width}-during-fade.png`});
   }
   await page.waitForSelector('.lounge-home');
   await page.waitForSelector('.screen-loader',{state:'detached'});
   await page.waitForSelector('#startup',{state:'detached'});
   const result=await page.evaluate(()=>({samples:window.__fadeSamples,repaints:window.__repaints,inert:document.querySelector('#app').inert,opacity:getComputedStyle(document.querySelector('.lounge-home')).opacity}));
   assert(result.samples.length>0);assert(result.repaints>0);
   for(const frame of result.samples.filter(f=>f.t===null||!reduced&&f.t<2500))for(const item of frame.values){assert.notEqual(item.opacity,null,item.s+' exists');assert.equal(item.opacity,0,item.s+' must stay hidden before the shared fade');}
   if(!reduced){const middle=result.samples.filter(f=>f.t>2800&&f.t<3400);assert(middle.length>0);for(const f of middle)for(const item of f.values){assert(item.opacity>0&&item.opacity<1,item.s+' fades');assert(Math.abs(item.opacity-f.values[0].opacity)<.001,item.s+' shares the reveal clock');}}
   assert.equal(result.inert,false);assert.equal(result.opacity,'1');assert.deepEqual(errors,[]);
   await page.screenshot({path:`${out}/${width}-${reduced?'reduced':'ready'}.png`});
   await page.locator('[data-nav=deck]').click();await page.waitForSelector('.lounge-deck');await page.locator('[data-nav=home]').click();await page.waitForSelector('.lounge-home');
   assert.equal(await page.locator('.screen-loader,.home-entrance-stage').count(),0,'ordinary navigation does not replay the entrance');
   report.cases.push({width,height,reduced,samples:result.samples.length,repaints:result.repaints,errors});
  }finally{await context.close();}
 }
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('PASS whole HOME stays hidden through header refresh, fades together, unlocks and does not replay',report);
}finally{await browser.close();}
