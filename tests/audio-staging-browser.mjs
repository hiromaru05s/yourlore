import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-27-audio/staging-checks';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(120000);
const errors=[],audioRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/sfx\/|\/music\//.test(r.url()))audioRequests.push(r.url());});
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user:{id:'audio-qa',display:'シーカー',avatar:'SEEKER_BLUE',credits:0,sleeve:'default',furniture:'default'}};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:{season:'2026-09',tier:'bronze',mmr:1000}};return {ok:true};});
await page.addInitScript(()=>{window.qaTracks=[];window.qaSoundStarts=0;const OriginalAudio=window.Audio;window.Audio=class extends OriginalAudio{constructor(...args){super(...args);qaTracks.push(this);}};const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){qaSoundStarts++;return start.apply(this,args);};});
try{
 await page.goto(origin,{waitUntil:'commit'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.mouse.click(700,80);await page.waitForFunction(()=>qaTracks.length===1&&!qaTracks[0].paused&&qaTracks[0].currentTime>.1);
 const duration=await page.evaluate(()=>qaTracks[0].duration);assert(duration>217&&duration<219);
 await page.locator('[data-nav=cards]').click();await page.waitForFunction(()=>qaTracks[0].paused&&!qaTracks[0].hasAttribute('src'));
 await page.waitForTimeout(200);await page.locator('[data-nav=home]').click();await page.waitForFunction(()=>qaTracks.length===2&&!qaTracks[1].paused&&qaTracks[1].currentTime>.1);
 const starts=await page.evaluate(()=>qaSoundStarts);assert(starts>0);assert(audioRequests.some(u=>u.includes('/sfx/lore-v3/')));assert(!audioRequests.some(u=>/\/sfx\/(lore-v2|opening-v1)\//.test(u)));assert.deepEqual(errors,[]);
 await fs.mkdir(out,{recursive:true});await page.screenshot({path:out+'/home-audio.png'});await fs.writeFile(out+'/integrated-browser.json',JSON.stringify({origin,duration,starts,audioRequests,errors,checks:['deployed real home BGM plays','home departure releases BGM source','home revisit creates one playing track','deployed UI clicks trigger real Web Audio','only v3 SFX requested'],account:'explicit API fixture; deployed static app and real audio assets'},null,2)+'\n');console.log('PASS staging app SFX + home BGM playback/lifecycle');
}finally{await browser.close();}
