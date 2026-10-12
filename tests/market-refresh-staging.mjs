import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-08-market-reroll';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('lore_lang','ja');});
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'reroll-staging-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default'}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:p==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
 await page.goto(origin);await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();if(await page.locator('#ranked').isVisible())await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();await page.locator('#diffStart').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening,.fx-turnbanner',{state:'detached'});await page.waitForSelector('#hand .card');
 const observations=[];
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(350);assert(!(await page.locator('#refreshBtn').isDisabled()));
  const before=await page.evaluate(()=>({fixed:[...document.querySelectorAll('#fixedMarket>.card')].map(e=>e.dataset.uid),supply:[...document.querySelectorAll('#supplyMarket>.card')].map(e=>e.dataset.uid),mana:document.querySelector('#portraitMe .mana-readout>b').textContent}));
  await page.evaluate(()=>{window.rerollMounted=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Deployed refresh did not mount'));},10000);const observer=new MutationObserver(()=>{const layer=document.querySelector('.market-refresh-layer');if(!layer)return;observer.disconnect();clearTimeout(timeout);const rects=s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});resolve({targets:rects('#supplyMarket>.card'),faces:rects('.market-refresh-front:first-child>.card'),margin:getComputedStyle(layer).marginLeft,gap:getComputedStyle(document.querySelector('#supplyMarket')).gap});});observer.observe(document.querySelector('#app'),{subtree:true,childList:true});});});
  await page.locator('#refreshBtn').click();const mounted=await page.evaluate(()=>window.rerollMounted);assert.equal(mounted.margin,'0px');assert.notEqual(mounted.gap,'0px');
  const drift=Math.max(...mounted.targets.flatMap((r,i)=>Object.keys(r).map(k=>Math.abs(r[k]-mounted.faces[i][k]))));assert(drift<1,JSON.stringify(mounted));
  await page.waitForSelector('.market-refresh-layer',{state:'detached'});
  const after=await page.evaluate(()=>({fixed:[...document.querySelectorAll('#fixedMarket>.card')].map(e=>e.dataset.uid),supply:[...document.querySelectorAll('#supplyMarket>.card')].map(e=>e.dataset.uid),mana:document.querySelector('#portraitMe .mana-readout>b').textContent,overflow:document.documentElement.scrollWidth>innerWidth,inert:document.querySelector('#supplyMarket').inert}));
  assert.deepEqual(after.fixed,before.fixed);assert.notDeepEqual(after.supply,before.supply);assert.equal(Number(after.mana),Number(before.mana)-1);assert(!after.overflow&&!after.inert);
  await page.screenshot({path:`${out}/staging-${width}.png`});observations.push({width,height,before,after,mounted,drift});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/staging-browser.json',JSON.stringify({origin,observations,errors,boundary:'Deployed production bundle, real BOT gameplay and reroll button. Only authentication/account API responses are fixtures; not an authenticated online duel.'},null,2)+'\n');console.log('PASS staging BOT reroll on desktop and mobile: aligned cards, correct mana and cleanup');
}finally{await browser.close();}
