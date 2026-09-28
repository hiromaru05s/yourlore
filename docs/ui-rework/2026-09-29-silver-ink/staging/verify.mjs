import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from '/Users/hiromaru05s/Desktop/LORE_TCG/tests/helpers/api-fixture.mjs';
const run=promisify(execFile),root=process.env.LORE_STAGE_BUILD||'/Users/hiromaru05s/.codex/worktrees/silver-ink-staging/LORE_TCG',out='/Users/hiromaru05s/Desktop/LORE_TCG/docs/ui-rework/2026-09-29-silver-ink/staging',origin='https://test.yourlore.xyz';
const names=await fs.readdir(root+'/client/dist/assets'),files=['index.html',...names.filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f),'models/reading-board/v1/board.glb','models/reading-board/v1/board-low.glb'];
const hash=b=>createHash('sha256').update(b).digest('hex'),hashes=[];
for(let i=0;i<files.length;i+=4)await Promise.all(files.slice(i,i+4).map(async file=>{const {stdout:bytes}=await run('curl',['--location','--fail','--silent','--show-error','--ipv4','--connect-timeout','10','--max-time','45','--retry','1',origin+'/'+file],{encoding:'buffer',maxBuffer:12*1024*1024});const sha=hash(bytes);assert.equal(sha,hash(await fs.readFile(root+'/client/dist/'+file)),file);hashes.push({file,sha256:sha,match:true});}));
await fs.writeFile(out+'/hashes.json',JSON.stringify(hashes,null,2)+'\n');console.log('PASS remote assets',hashes.length);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(60000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/riftScene-/.test(r.url()))requests.push({url:r.url(),status:r.status()});});
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user:{id:'silver-ink-qa',display:'シーカー',avatar:'SEEKER_BLUE',credits:0,sleeve:'default',furniture:'default'}};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:{season:'2026-09',tier:'bronze',mmr:1000}};return {ok:true};});
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===origin&&/\.(webp|png|jpg|jpeg|ttf|glb|mp3)$/.test(u.pathname)&&!/\/board(-low)?\.glb$/.test(u.pathname)){try{return await r.fulfill({path:root+'/client/dist'+u.pathname});}catch{}}await r.fallback();});
 await page.goto(origin+'/?v=silver-ink-20260929',{waitUntil:'commit'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();await page.locator('[data-diff=easy]').click();await page.waitForSelector('.duel-table-ready',{state:'attached'});await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');
 const chunk='/assets/'+names.find(n=>/^riftScene-.*\.js$/.test(n));
 await page.evaluate(async chunk=>{
  const module=await import(chunk);const source=document.querySelector('#hand .card'),r=source.getBoundingClientRect();
  window.qa={module,clock:performance.now(),raf:requestAnimationFrame.bind(window),now:performance.now.bind(performance)};qa.begun=qa.clock;performance.now=()=>qa.clock;requestAnimationFrame=cb=>qa.raf(()=>cb(qa.clock));
  const node=source.cloneNode(true);node.removeAttribute('id');node.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--cw:${r.width}px;--ch:${r.height}px;transform:none;z-index:15000`;document.body.append(node);source.style.visibility='hidden';qa.source=source;qa.node=node;
  const target=document.createElement('div');target.id='rift-me';target.style.cssText='position:fixed;visibility:hidden';document.body.append(target);qa.target=target;const start=new DOMMatrix().translate(r.left,r.top);qa.pending=module.swallowRiftCard(node,target,start,new AbortController().signal,()=>{}).finally(()=>{node.remove();target.remove();source.style.visibility='';});
 },chunk);
 await page.waitForSelector('.rift-silver-ink-canvas');assert.equal(await page.locator('.rift-silver-ink-canvas').getAttribute('data-variant'),'inscription');
 for(const ms of [800,1500]){await page.evaluate(ms=>qa.clock=qa.begun+ms,ms);await page.waitForTimeout(100);assert.equal(await page.locator('.rift-silver-ink-canvas').count(),1,'effect remains active at '+ms);assert(Math.abs(Number(await page.locator('.rift-silver-ink-canvas').getAttribute('data-progress'))-ms/2800)<.01);await page.screenshot({path:out+'/effect-'+ms+'.png'});}
 await page.evaluate(()=>qa.clock=qa.begun+3000);await page.evaluate(()=>qa.pending);await page.evaluate(()=>{performance.now=qa.now;requestAnimationFrame=qa.raf;});assert.equal(await page.locator('.rift-silver-ink-canvas').count(),0);assert.deepEqual(errors,[]);assert(requests.some(r=>r.status===200));
 await fs.writeFile(out+'/browser.json',JSON.stringify({origin,chunk,variant:'inscription',duration:2800,errors,requests,cleanup:true,boundary:'Account/API fixtures and unchanged media cache. Deployed JS and current recessed board models loaded from staging. Real BOT board plus explicit invocation of deployed swallowRiftCard on a hand-card clone and persistent Rift anchor (BOT redraws are independent); not an authenticated online match or a natural exile trigger.'},null,2)+'\n');console.log('PASS deployed silver ink, staged BOT board, cleanup and no page errors');
}catch(e){if(page)await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
