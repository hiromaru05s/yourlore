import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5793',out=process.env.LORE_TEST_OUT||'/tmp/lore-startup-failures';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[];
async function page(options={}){
 const p=await browser.newPage({viewport:{width:1280,height:900},...options});p.setDefaultTimeout(120000);
 await apiFixture(p,r=>{const n=new URL(r.url).pathname;return n==='/api/auth/me'?{user:{id:'local-guest-user',display:'QA',credits:100}}:n==='/api/rewards/tutorial'?{offered:true,keys:[]}:n==='/api/rank/me'?{rating:{tier:'bronze',mmr:1000,wins:0,losses:0}}:{ok:true,country:'JP',gifts:[],unread:0,entries:[],friends:[],incoming:[],outgoing:[],challenges:[]};});return p;
}
try{
 const p=await page(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('.lounge-home-main').waitFor();await p.locator('.screen-loader').waitFor({state:'detached'});
 let release;const held=new Promise(r=>release=r);await p.route(/\/art\/cards-(xs|sm)\//,async r=>{await held;await r.continue();});
 await p.locator('[data-nav=cards]').click();await p.locator('#grid[aria-busy=true]').waitFor({state:'attached'});
 assert.equal(await p.locator('.screen-loader').count(),0);assert.equal(await p.locator('#app').evaluate(e=>e.inert),false);
 await p.locator('[data-nav=home]').click();await p.locator('.lounge-home-main').waitFor();release();await p.unrouteAll({behavior:'wait'});
 assert.equal(await p.locator('.asset-tray,.screen-loader').count(),0);
 await p.locator('[data-nav=deck]').click();await p.locator('#deckCur .deck-hand-action').first().click();assert.equal(await p.locator('#deckCur .card').count(),8);
 await p.locator('#deckUndo').click();assert.equal(await p.locator('#deckCur .card').count(),9);
 await p.locator('#deckPool .card').first().click();await p.locator('.inspect-close').waitFor();assert.equal(await p.locator('#zoomOverlay img[src*=deck-display]').count(),0);await p.locator('.inspect-close').click();
 await p.locator('#poolSearch').fill('カル');assert(await p.locator('#deckPool .card').count()>0);await p.locator('#poolSearch').fill('');
 await p.locator('[data-nav=home]').click();await p.locator('.lounge-home-main').waitFor();checks.push('deck removal/undo, search and full-art inspection remain functional');checks.push('slow gallery assets do not lock navigation; leaving cancels the pending reveal');
 await p.waitForSelector('#ranked[data-ready=true]');await p.evaluate(()=>document.querySelector('.home-duel-ink').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await p.waitForSelector('#ranked[data-motion=static]');await p.locator('#bot').click();
 assert.equal(await p.locator('.home-duel-fallback').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await p.locator('.home-duel-ink').evaluate(e=>getComputedStyle(e).opacity),'0');checks.push('context loss retains static pigment through a mode change');
 assert.deepEqual(errors,[]);await p.close();
 const q=await page();await q.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'&&this.classList.contains('home-duel-ink')?null:get.call(this,type,...args);};});
 await q.goto(base);await q.locator('.lounge-home-main').waitFor();await q.locator('.screen-loader').waitFor({state:'detached'});
 for(const id of ['bot','online','rankedMode']){await q.locator('#'+id).click();assert.equal(await q.locator('.home-duel-fallback').evaluate(e=>getComputedStyle(e).opacity),'1');}
 await q.locator('#bot').click();await q.locator('#ranked').click();await q.locator('.bot-diff-ov').waitFor();await q.locator('#diffCancel').click();checks.push('no WebGL still shows all three modes and opens opponent selection');await q.close();
 console.log(checks);await fs.writeFile(out+'/report.json',JSON.stringify({base,checks,errors:[]},null,2));
}finally{await browser.close();}
