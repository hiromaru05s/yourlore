import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'https://yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-11-04-mana-glow/production';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={origin,mode:'served production application and assets; isolated local guest API and visual 2/6 fixture; no real account or server game records',cases:[]};
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],assets=new Set();let glowBundle='';const pending=[];
 page.on('response',r=>{if(/\/assets\/.*\.js(?:\?|$)/.test(r.url())){assets.add(r.url());pending.push(r.text().then(text=>{if(text.includes('mana-sapphire-core-v1'))glowBundle=r.url();}).catch(()=>{}));}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE|GL_INVALID/.test(m.text()))errors.push(m.text());});page.setDefaultTimeout(120000);
 await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
  if(p==='/api/auth/me')return {user:{id:'local-guest-user',display:'MANA QA',email:'qa@example.test',credits:0,avatar:'SEEKER_BLUE',wins:0,losses:0}};
  if(p==='/api/rewards/tutorial')return {offered:true,keys:[],credits:0};
  if(p==='/api/rewards/progression')return {credits:0,ranked:0,online:0,bot:{},dailies:[],resetsAt:Date.now()+86400000};
  if(p==='/api/rank/me')return {rating:{season:'2026-11',mmr:1000,tier:'bronze',wins:0,losses:0}};
  if(p==='/api/gifts')return {items:[],unreadCount:0};
  return {ok:true,country:'KR',entries:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};
 });
 await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 try{
  await page.clock.install();await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('#diffStart').click();await page.waitForFunction(()=>document.querySelector('[data-scene-ready="true"]'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.pt-mana')].length===2&&[...document.querySelectorAll('.pt-mana')].every(n=>n.dataset.glowingCrystals!==undefined));await page.waitForFunction(()=>!document.querySelector('.duel-opening,.opening-pending,.duel-intro-active'));await page.locator('#hand .card').first().waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.pt-mana[data-gain-start]')&&document.querySelector('#endBtn')?.disabled===false);await page.waitForTimeout(2000);await page.waitForFunction(()=>!document.querySelector('.fx-turn-sigil,.duel-opening,.pt-mana[data-gain-start]'));await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  const initial=await page.locator('.pt-mana').evaluateAll(ns=>ns.map(n=>({mana:Number(n.dataset.mana),glow:Number(n.dataset.glowingCrystals),ready:Number(n.dataset.crystalsReady),spent:Number(n.dataset.crystalsSpent)})));for(const s of initial)assert.equal(s.glow,s.ready);
  await page.screenshot({path:out+`/initial-${viewport.width}.png`});
  for(const current of [2,0,6]){
   await page.locator('.pt-mana').evaluateAll((ns,current)=>ns.forEach(n=>{n.dataset.mana=String(current);n.dataset.maximum='6';n.querySelector('.mana-readout b').textContent=String(current);n.querySelector('.pt-mana-max').textContent='/6';}),current);
   await page.clock.runFor(96);
   const values=await page.locator('.pt-mana').evaluateAll(ns=>ns.map(n=>({ready:Number(n.dataset.crystalsReady),spent:Number(n.dataset.crystalsSpent),glow:Number(n.dataset.glowingCrystals)})));for(const s of values){assert.equal(s.ready,current);assert.equal(s.spent,6-current);assert.equal(s.glow,current);}
   await page.screenshot({path:out+`/${current}-of-6-${viewport.width}.png`});
  }
  await Promise.all(pending);assert(glowBundle,'new glow shader present in served production game bundle');assert.deepEqual(errors,[]);report.cases.push({viewport,initial,counts:'2/6,0/6,6/6 both sides',glowBundle,errors,assets:[...assets]});
 }finally{await context.close();}
}await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser.close();}
