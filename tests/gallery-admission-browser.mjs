import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5488';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-gallery-admission';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report=[];
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(60000);
 await apiFixture(p,r=>new URL(r.url).pathname==='/api/auth/me'?{user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE'}}:{ok:true,offered:true,entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],gifts:[],unread:0});
 await p.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10))});
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached'});
 const start=Date.now();await p.locator('[data-nav="cards"]').click();await p.waitForSelector('#grid .card');await p.waitForSelector('.screen-loader,.asset-tray',{state:'detached'});
 const readyMs=Date.now()-start;
 const state=await p.evaluate(()=>{
  const grid=document.querySelector('#grid'),bounds=grid.getBoundingClientRect(),cards=[...grid.querySelectorAll('.card')];
  const visible=cards.filter(c=>{const r=c.getBoundingClientRect();return r.top<Math.min(bounds.bottom,innerHeight)&&r.bottom>Math.max(0,bounds.top)});
  return {total:cards.length,lazy:grid.querySelectorAll('img[loading="lazy"]').length,visible:visible.length,broken:visible.filter(c=>{const i=c.querySelector('.card-art-img');return !i||!i.complete||!i.naturalWidth}).map(c=>c.dataset.cardId),cardRequests:performance.getEntriesByType('resource').filter(r=>/\/art\/cards-(sm|xs)\//.test(r.name)).length};
 });
 assert(state.total>100);assert(state.lazy>state.total/2,'Later gallery rows retain lazy loading');assert.deepEqual(state.broken,[],'Every visible card is ready when the cover opens');
 await p.screenshot({path:`${out}/cards-${width}.png`});
 await p.locator('#grid .card').last().scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>{const i=document.querySelector('#grid .card:last-child .card-art-img');return i?.complete&&i.naturalWidth});
 await p.locator('#search').fill('ゴブリン');await p.waitForSelector('.asset-tray',{state:'detached'});assert(await p.locator('#grid .card').count()>0);
 assert.deepEqual(errors,[]);report.push({width,readyMs,...state,scrollAndFilter:true,errors});console.log(JSON.stringify(report.at(-1)));await context.close();
}}finally{await fs.writeFile(out+'/report.json',JSON.stringify({origin,api:'fixture',report},null,2));await browser.close()}
